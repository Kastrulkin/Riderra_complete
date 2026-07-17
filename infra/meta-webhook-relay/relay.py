#!/usr/bin/env python3
"""Durable inbound relay for Meta WhatsApp webhooks.

The relay acknowledges a valid JSON payload after it is committed to SQLite,
then forwards the exact raw body and Meta signature to Riderra in the
background. This keeps Meta ingress independent from Riderra/OpenClaw reachability.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import random
import signal
import sqlite3
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit


LOG = logging.getLogger("riderra-meta-relay")
WEBHOOK_PATHS = {"/api/webhooks/meta/whatsapp", "/webhooks/meta/whatsapp"}


@dataclass(frozen=True)
class Config:
    bind: str = os.getenv("RELAY_BIND", "127.0.0.1")
    port: int = int(os.getenv("RELAY_PORT", "8787"))
    db_path: str = os.getenv("RELAY_DB", "/var/lib/riderra-meta-relay/queue.sqlite3")
    target: str = os.getenv("RELAY_TARGET", "https://riderra.com/api/webhooks/meta/whatsapp")
    meta_app_secret: str = os.getenv("RELAY_META_APP_SECRET", "").strip()
    max_body_bytes: int = int(os.getenv("RELAY_MAX_BODY_BYTES", str(2 * 1024 * 1024)))
    forward_timeout: float = float(os.getenv("RELAY_FORWARD_TIMEOUT", "12"))
    max_attempts: int = int(os.getenv("RELAY_MAX_ATTEMPTS", "30"))
    retention_days: int = int(os.getenv("RELAY_RETENTION_DAYS", "14"))


def _json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def extract_event_ids(payload: dict[str, Any]) -> tuple[list[str], list[str]]:
    message_ids: list[str] = []
    status_events: list[str] = []
    for entry in payload.get("entry") or []:
        if not isinstance(entry, dict):
            continue
        for change in entry.get("changes") or []:
            if not isinstance(change, dict):
                continue
            value = change.get("value") or {}
            if not isinstance(value, dict):
                continue
            for message in value.get("messages") or []:
                if isinstance(message, dict) and message.get("id"):
                    message_ids.append(str(message["id"]))
            for status in value.get("statuses") or []:
                if not isinstance(status, dict) or not status.get("id"):
                    continue
                status_events.append(":".join([
                    str(status.get("id") or ""),
                    str(status.get("status") or ""),
                    str(status.get("timestamp") or ""),
                ]))
    return sorted(set(message_ids)), sorted(set(status_events))


def build_dedupe_key(payload: dict[str, Any], raw_body: bytes) -> str:
    message_ids, status_events = extract_event_ids(payload)
    if message_ids:
        material = "\n".join(message_ids).encode("utf-8")
        return f"message:{hashlib.sha256(material).hexdigest()}"
    if status_events:
        material = "\n".join(status_events).encode("utf-8")
        return f"status:{hashlib.sha256(material).hexdigest()}"
    return f"payload:{hashlib.sha256(raw_body).hexdigest()}"


def verify_meta_signature(secret: str, raw_body: bytes, provided_signature: str | None) -> bool:
    if not secret or not provided_signature or not provided_signature.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, provided_signature)


class QueueStore:
    def __init__(self, path: str):
        self.path = path
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA busy_timeout = 10000")
        return connection

    def _initialize(self) -> None:
        with self.connect() as connection:
            connection.execute("PRAGMA journal_mode = WAL")
            connection.execute("PRAGMA synchronous = FULL")
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dedupe_key TEXT NOT NULL UNIQUE,
                    body BLOB NOT NULL,
                    content_type TEXT NOT NULL,
                    signature TEXT,
                    status TEXT NOT NULL DEFAULT 'pending',
                    attempts INTEGER NOT NULL DEFAULT 0,
                    next_attempt_at REAL NOT NULL,
                    last_error TEXT,
                    created_at REAL NOT NULL,
                    delivered_at REAL
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS events_due_idx ON events(status, next_attempt_at)"
            )
            connection.execute(
                "UPDATE events SET status = 'pending', next_attempt_at = ? WHERE status = 'processing'",
                (time.time(),),
            )

    def enqueue(self, dedupe_key: str, body: bytes, content_type: str, signature: str | None) -> bool:
        now = time.time()
        with self.connect() as connection:
            cursor = connection.execute(
                """
                INSERT OR IGNORE INTO events
                    (dedupe_key, body, content_type, signature, status, attempts, next_attempt_at, created_at)
                VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)
                """,
                (dedupe_key, body, content_type, signature, now, now),
            )
            return cursor.rowcount == 1

    def claim_next(self) -> sqlite3.Row | None:
        now = time.time()
        with self.connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute(
                """
                SELECT * FROM events
                WHERE status = 'pending' AND next_attempt_at <= ?
                ORDER BY id ASC LIMIT 1
                """,
                (now,),
            ).fetchone()
            if row is None:
                return None
            connection.execute("UPDATE events SET status = 'processing' WHERE id = ?", (row["id"],))
            return row

    def mark_delivered(self, event_id: int) -> None:
        with self.connect() as connection:
            connection.execute(
                "UPDATE events SET status = 'delivered', delivered_at = ?, last_error = NULL WHERE id = ?",
                (time.time(), event_id),
            )

    def mark_failed(self, event_id: int, attempts: int, error: str, max_attempts: int) -> None:
        terminal = attempts >= max_attempts
        delay = min(3600.0, (2 ** min(attempts, 10)) + random.uniform(0, 3))
        with self.connect() as connection:
            connection.execute(
                """
                UPDATE events
                SET status = ?, attempts = ?, next_attempt_at = ?, last_error = ?
                WHERE id = ?
                """,
                (
                    "dead" if terminal else "pending",
                    attempts,
                    time.time() + delay,
                    error[:1000],
                    event_id,
                ),
            )

    def counts(self) -> dict[str, int]:
        counts = {"pending": 0, "processing": 0, "delivered": 0, "dead": 0}
        with self.connect() as connection:
            rows = connection.execute("SELECT status, COUNT(*) AS count FROM events GROUP BY status").fetchall()
        for row in rows:
            counts[str(row["status"])] = int(row["count"])
        return counts

    def cleanup(self, retention_days: int) -> None:
        cutoff = time.time() - max(1, retention_days) * 86400
        with self.connect() as connection:
            connection.execute(
                "DELETE FROM events WHERE status = 'delivered' AND delivered_at < ?",
                (cutoff,),
            )


def forward_get(config: Config, raw_query: str) -> tuple[int, str, bytes]:
    target = config.target + (f"?{raw_query}" if raw_query else "")
    request = urllib.request.Request(target, method="GET", headers={"User-Agent": "RiderraMetaRelay/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=config.forward_timeout) as response:
            return response.status, response.headers.get("Content-Type", "text/plain"), response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers.get("Content-Type", "application/json"), error.read()


def forward_event(config: Config, event: sqlite3.Row) -> tuple[bool, str]:
    headers = {
        "Content-Type": event["content_type"],
        "User-Agent": "RiderraMetaRelay/1.0",
        "X-Riderra-Relay-Event": str(event["id"]),
    }
    if event["signature"]:
        headers["X-Hub-Signature-256"] = event["signature"]
    request = urllib.request.Request(config.target, data=bytes(event["body"]), method="POST", headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=config.forward_timeout) as response:
            response_body = response.read(65536)
            if 200 <= response.status < 300:
                return interpret_forward_response(response.status, response_body)
            return False, f"HTTP {response.status}"
    except urllib.error.HTTPError as error:
        detail = error.read(1000).decode("utf-8", errors="replace")
        return False, f"HTTP {error.code}: {detail}"
    except Exception as error:  # Network errors must remain in the durable queue.
        return False, f"{type(error).__name__}: {error}"


def interpret_forward_response(status: int, response_body: bytes) -> tuple[bool, str]:
    """Treat OpenClaw business-level forwarding errors as retryable failures."""
    try:
        payload = json.loads(response_body) if response_body else {}
    except (UnicodeDecodeError, json.JSONDecodeError):
        return True, f"HTTP {status}"
    if isinstance(payload, dict):
        forward_errors = int(payload.get("forward_errors") or 0)
        if payload.get("ok") is False or forward_errors > 0:
            return False, f"HTTP {status}: upstream forward_errors={forward_errors}"
    return True, f"HTTP {status}"


class RelayWorker(threading.Thread):
    def __init__(self, config: Config, store: QueueStore, stop_event: threading.Event):
        super().__init__(name="relay-worker", daemon=True)
        self.config = config
        self.store = store
        self.stop_event = stop_event
        self.last_cleanup = 0.0

    def run(self) -> None:
        while not self.stop_event.is_set():
            now = time.time()
            if now - self.last_cleanup > 3600:
                self.store.cleanup(self.config.retention_days)
                self.last_cleanup = now
            event = self.store.claim_next()
            if event is None:
                self.stop_event.wait(0.5)
                continue
            ok, detail = forward_event(self.config, event)
            if ok:
                self.store.mark_delivered(int(event["id"]))
                LOG.info("event=%s delivered attempts=%s", event["id"], event["attempts"])
            else:
                attempts = int(event["attempts"]) + 1
                self.store.mark_failed(int(event["id"]), attempts, detail, self.config.max_attempts)
                LOG.warning("event=%s delivery_failed attempts=%s error=%s", event["id"], attempts, detail)


class RelayServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address: tuple[str, int], config: Config, store: QueueStore):
        super().__init__(address, RelayHandler)
        self.config = config
        self.store = store
        self.worker: RelayWorker | None = None


class RelayHandler(BaseHTTPRequestHandler):
    server: RelayServer
    protocol_version = "HTTP/1.1"

    def log_message(self, _format_string: str, *args: Any) -> None:
        # BaseHTTPRequestHandler includes the complete request target in its
        # default log line. Meta verification puts the verify token in the
        # query string, so log only the path and response status.
        status = str(args[1]) if len(args) > 1 else "-"
        LOG.info(
            "client=%s method=%s path=%s status=%s",
            self.client_address[0],
            self.command,
            urlsplit(self.path).path,
            status,
        )

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_json(self, status: int, value: Any) -> None:
        self._send(status, _json_bytes(value), "application/json; charset=utf-8")

    def do_GET(self) -> None:
        parsed = urlsplit(self.path)
        if parsed.path == "/healthz":
            worker_alive = bool(self.server.worker and self.server.worker.is_alive())
            counts = self.server.store.counts()
            status = 200 if worker_alive and counts.get("dead", 0) == 0 else 503
            self._send_json(status, {"ok": status == 200, "worker": worker_alive, "queue": counts})
            return
        if parsed.path not in WEBHOOK_PATHS:
            self._send_json(404, {"error": "not_found"})
            return
        try:
            status, content_type, body = forward_get(self.server.config, parsed.query)
            self._send(status, body, content_type)
        except Exception as error:
            LOG.warning("verification_forward_failed error=%s", error)
            self._send_json(502, {"error": "verification_upstream_unavailable"})

    def do_POST(self) -> None:
        parsed = urlsplit(self.path)
        if parsed.path not in WEBHOOK_PATHS:
            self._send_json(404, {"error": "not_found"})
            return
        content_length_header = self.headers.get("Content-Length")
        try:
            content_length = int(content_length_header or "0")
        except ValueError:
            self._send_json(400, {"error": "invalid_content_length"})
            return
        if content_length <= 0 or content_length > self.server.config.max_body_bytes:
            self._send_json(413, {"error": "invalid_body_size"})
            return
        raw_body = self.rfile.read(content_length)
        signature = self.headers.get("X-Hub-Signature-256")
        if not verify_meta_signature(self.server.config.meta_app_secret, raw_body, signature):
            self._send_json(401, {"error": "invalid_meta_signature"})
            return
        try:
            payload = json.loads(raw_body)
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(400, {"error": "invalid_json"})
            return
        if not isinstance(payload, dict) or payload.get("object") != "whatsapp_business_account":
            self._send_json(400, {"error": "unsupported_payload"})
            return
        dedupe_key = build_dedupe_key(payload, raw_body)
        inserted = self.server.store.enqueue(
            dedupe_key,
            raw_body,
            self.headers.get("Content-Type", "application/json"),
            signature,
        )
        self._send_json(200, {"accepted": True, "duplicate": not inserted})


def run(config: Config) -> None:
    store = QueueStore(config.db_path)
    stop_event = threading.Event()
    server = RelayServer((config.bind, config.port), config, store)
    worker = RelayWorker(config, store, stop_event)
    server.worker = worker
    worker.start()

    def stop(_signum: int, _frame: Any) -> None:
        stop_event.set()
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    LOG.info("listening=http://%s:%s target=%s", config.bind, config.port, config.target)
    try:
        server.serve_forever(poll_interval=0.5)
    finally:
        stop_event.set()
        worker.join(timeout=5)
        server.server_close()


def main() -> None:
    logging.basicConfig(
        level=os.getenv("RELAY_LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    run(Config())


if __name__ == "__main__":
    main()
