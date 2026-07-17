import json
import hashlib
import hmac
import tempfile
import threading
import time
import unittest
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from relay import (
    QueueStore,
    Config,
    RelayServer,
    RelayWorker,
    build_dedupe_key,
    extract_event_ids,
    interpret_forward_response,
    verify_meta_signature,
)


class SuccessfulTarget(BaseHTTPRequestHandler):
    bodies = []

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        self.__class__.bodies.append(body)
        response = b'{"ok":true,"forwarded":1,"forward_errors":0}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def log_message(self, *_args):
        return


def payload(message_id="wamid.test", status=None):
    value = {"messaging_product": "whatsapp"}
    if status:
        value["statuses"] = [{"id": message_id, "status": status, "timestamp": "1784300000"}]
    else:
        value["messages"] = [{"id": message_id, "from": "79214224843", "text": {"body": "3 bags"}}]
    return {
        "object": "whatsapp_business_account",
        "entry": [{"changes": [{"field": "messages", "value": value}]}],
    }


class RelayTests(unittest.TestCase):
    def test_message_id_is_the_dedupe_identity(self):
        first = payload("wamid.same")
        second = payload("wamid.same")
        second["entry"][0]["changes"][0]["value"]["messages"][0]["text"]["body"] = "duplicate retry"
        first_raw = json.dumps(first).encode()
        second_raw = json.dumps(second).encode()
        self.assertEqual(build_dedupe_key(first, first_raw), build_dedupe_key(second, second_raw))

    def test_status_progress_is_not_collapsed(self):
        delivered = payload("wamid.status", "delivered")
        read = payload("wamid.status", "read")
        self.assertNotEqual(
            build_dedupe_key(delivered, json.dumps(delivered).encode()),
            build_dedupe_key(read, json.dumps(read).encode()),
        )

    def test_extracts_message_and_status_ids(self):
        messages, statuses = extract_event_ids(payload("wamid.message"))
        self.assertEqual(messages, ["wamid.message"])
        self.assertEqual(statuses, [])

    def test_sqlite_enqueue_is_idempotent(self):
        with tempfile.TemporaryDirectory() as directory:
            store = QueueStore(str(Path(directory) / "queue.sqlite3"))
            body = json.dumps(payload()).encode()
            self.assertTrue(store.enqueue("message:key", body, "application/json", "sha256=test"))
            self.assertFalse(store.enqueue("message:key", body, "application/json", "sha256=test"))
            self.assertEqual(store.counts()["pending"], 1)

    def test_meta_signature_is_checked_against_exact_body(self):
        secret = "test-app-secret"
        body = json.dumps(payload(), separators=(",", ":")).encode()
        signature = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        self.assertTrue(verify_meta_signature(secret, body, signature))
        self.assertFalse(verify_meta_signature(secret, body + b" ", signature))
        self.assertFalse(verify_meta_signature(secret, body, None))

    def test_openclaw_business_error_remains_retryable(self):
        ok, detail = interpret_forward_response(
            200,
            b'{"ok":true,"forwarded":0,"forward_errors":1}',
        )
        self.assertFalse(ok)
        self.assertIn("forward_errors=1", detail)

    def test_openclaw_success_is_delivered(self):
        ok, detail = interpret_forward_response(
            200,
            b'{"ok":true,"forwarded":1,"forward_errors":0}',
        )
        self.assertTrue(ok)
        self.assertEqual(detail, "HTTP 200")

    def test_signed_webhook_is_forwarded_once(self):
        secret = "integration-secret"
        SuccessfulTarget.bodies = []
        target = ThreadingHTTPServer(("127.0.0.1", 0), SuccessfulTarget)
        target_thread = threading.Thread(target=target.serve_forever, daemon=True)
        target_thread.start()
        stop_event = threading.Event()
        relay = None
        relay_thread = None
        worker = None
        try:
            with tempfile.TemporaryDirectory() as directory:
                config = Config(
                    bind="127.0.0.1",
                    port=0,
                    db_path=str(Path(directory) / "queue.sqlite3"),
                    target=f"http://127.0.0.1:{target.server_port}/inbound",
                    meta_app_secret=secret,
                    forward_timeout=2,
                )
                store = QueueStore(config.db_path)
                relay = RelayServer((config.bind, config.port), config, store)
                worker = RelayWorker(config, store, stop_event)
                relay.worker = worker
                worker.start()
                relay_thread = threading.Thread(target=relay.serve_forever, daemon=True)
                relay_thread.start()

                body = json.dumps(payload("wamid.integration"), separators=(",", ":")).encode()
                signature = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
                request = urllib.request.Request(
                    f"http://127.0.0.1:{relay.server_port}/api/webhooks/meta/whatsapp",
                    data=body,
                    method="POST",
                    headers={"Content-Type": "application/json", "X-Hub-Signature-256": signature},
                )
                with urllib.request.urlopen(request, timeout=2) as response:
                    self.assertEqual(response.status, 200)
                with urllib.request.urlopen(request, timeout=2) as response:
                    self.assertEqual(response.status, 200)

                deadline = time.time() + 3
                while time.time() < deadline and store.counts()["delivered"] != 1:
                    time.sleep(0.05)
                self.assertEqual(store.counts()["delivered"], 1)
                self.assertEqual(SuccessfulTarget.bodies, [body])
        finally:
            stop_event.set()
            if relay:
                relay.shutdown()
                relay.server_close()
            if worker:
                worker.join(timeout=2)
            if relay_thread:
                relay_thread.join(timeout=2)
            target.shutdown()
            target.server_close()
            target_thread.join(timeout=2)


if __name__ == "__main__":
    unittest.main()
