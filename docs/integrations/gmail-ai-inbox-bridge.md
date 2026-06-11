# Gmail -> Riderra AI Inbox Bridge

Status: ready to install in Google Apps Script.

Riderra production already accepts email drafts at:

```text
POST https://riderra.com/api/internal/ops/email-draft
Header: X-Riderra-Internal-Token
```

The production token is configured in `/opt/riderra/.env` as `RIDERRA_EMAIL_INGEST_TOKEN`.
Do not commit the token to git.

## Install

1. Open Google Apps Script from the Gmail account that receives booking emails.
2. Create a new project named `Riderra AI Inbox Bridge`.
3. Copy `scripts/google-apps-script/riderra_gmail_ai_inbox_bridge.gs` into `Code.gs`.
4. Open `Project Settings -> Script properties`.
5. Add:

```text
RIDERRA_EMAIL_INGEST_TOKEN=<production token from /opt/riderra/.env>
RIDERRA_INGEST_URL=https://riderra.com/api/internal/ops/email-draft
RIDERRA_BATCH_SIZE=20
```

Optional query override:

```text
RIDERRA_QUERY=in:inbox -in:spam -in:trash -label:"Riderra/AI Inbox Sent" -label:"Riderra/AI Inbox Error" newer_than:30d
```

6. Run `testRiderraBridgeConfig` once and confirm `tokenConfigured: true`.
7. Run `pollRiderraInbox` once manually and approve Gmail/UrlFetch permissions.
8. Create a time-driven trigger:

```text
Function: pollRiderraInbox
Event source: Time-driven
Type: Minutes timer
Interval: Every 5 minutes
```

## Labels

The script creates and uses:

- `Riderra/AI Inbox Sent`
- `Riderra/AI Inbox Error`

Messages in `Sent` are skipped on future runs. Messages in `Error` are also skipped until the label is removed manually.

## Payload

Each Gmail message is sent to Riderra as:

```json
{
  "fromEmail": "...",
  "toEmail": "...",
  "subject": "...",
  "rawText": "From/To/Cc/Subject/Date + plain body",
  "sourceType": "gmail_forward",
  "gmailMessageId": "...",
  "gmailThreadId": "..."
}
```

Riderra saves it as an `OpsEventDraft` for AI Inbox. It does not create a final order unless the configured server policy explicitly auto-promotes, which is currently off by default.

## Verify

On production:

```bash
cd /opt/riderra
node -e 'require("dotenv").config(); console.log(Boolean(process.env.RIDERRA_EMAIL_INGEST_TOKEN))'
```

Check latest AI Inbox drafts:

```bash
cd /opt/riderra
node - <<'NODE'
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
;(async () => {
  const rows = await prisma.opsEventDraft.findMany({
    where: { parsedType: 'openclaw_order_draft' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, createdAt: true, status: true, payloadJson: true }
  })
  for (const row of rows) {
    const payload = JSON.parse(row.payloadJson || '{}')
    const draft = payload.orderDraft || {}
    console.log(row.createdAt.toISOString(), row.status, draft.sourceType, draft.orderNumber, draft.counterpartyName)
  }
  await prisma.$disconnect()
})()
NODE
```
