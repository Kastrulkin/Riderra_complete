# Riderra Meta webhook relay

Small public ingress service for Meta WhatsApp webhooks. It stores every valid
payload in SQLite before acknowledging it, forwards the original bytes and
`X-Hub-Signature-256` to Riderra, retries transient failures, and deduplicates
inbound messages by Meta `wamid`.

`RELAY_META_APP_SECRET` is required in `/etc/riderra-meta-relay.env`. The relay
validates the signature before enqueueing; OpenClaw validates it again after
delivery.

OpenClaw currently reports internal Riderra delivery failures in a successful
HTTP response via `forward_errors`. The relay treats any non-zero value as a
retryable delivery failure, so an accepted webhook cannot be lost between
OpenClaw and Riderra.

Request query strings are never logged because Meta places the verification
token in the callback verification URL.

Production callback:

```text
https://meta-hook.riderra.com/api/webhooks/meta/whatsapp
```

Until that DNS record is live, the Caddyfile defaults to the diagnostic host
`77-239-100-125.sslip.io`. After DNS propagation, set the final host without
editing the Caddyfile:

```ini
# /etc/systemd/system/caddy.service.d/10-riderra-relay.conf
[Service]
Environment=RELAY_PUBLIC_HOST=meta-hook.riderra.com
```

Then run `systemctl daemon-reload && systemctl reload caddy` and update the Meta
app subscription only after the final HTTPS health and challenge checks pass.

The downstream remains:

```text
https://riderra.com/api/webhooks/meta/whatsapp
```

The relay does not modify orders or Google Sheets. Riderra and OpenClaw retain
their existing responsibility for signature validation, task matching,
idempotent inbound processing, draft creation, approval, and sending.

Run local tests:

```bash
cd infra/meta-webhook-relay
python3 -m unittest -v test_relay.py
```

Operational checks on the relay host:

```bash
systemctl status riderra-meta-relay
curl -fsS https://meta-hook.riderra.com/healthz
journalctl -u riderra-meta-relay -n 100 --no-pager
```

SSH password login is disabled after the dedicated deployment key is verified.
Recovery remains available through the hosting provider console.
