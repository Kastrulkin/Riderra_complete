/**
 * Riderra Gmail -> AI Inbox bridge.
 *
 * Install this file in Google Apps Script under the Gmail account that receives
 * operational booking emails, then add a time-driven trigger for pollRiderraInbox.
 *
 * Required Script property:
 *   RIDERRA_EMAIL_INGEST_TOKEN = the token from Riderra production .env
 *
 * Optional Script properties:
 *   RIDERRA_INGEST_URL = https://riderra.com/api/internal/ops/email-draft
 *   RIDERRA_QUERY = Gmail search query to poll
 *   RIDERRA_BATCH_SIZE = max messages per run
 */

const RIDERRA_DEFAULT_INGEST_URL = 'https://riderra.com/api/internal/ops/email-draft'
const RIDERRA_SENT_LABEL = 'Riderra/AI Inbox Sent'
const RIDERRA_ERROR_LABEL = 'Riderra/AI Inbox Error'
const RIDERRA_DEFAULT_QUERY = [
  'in:inbox',
  '-in:spam',
  '-in:trash',
  '-category:promotions',
  '-category:social',
  '-category:forums',
  '-label:"Riderra/AI Inbox Sent"',
  '-label:"Riderra/AI Inbox Error"',
  'newer_than:30d'
].join(' ')

function pollRiderraInbox() {
  const properties = PropertiesService.getScriptProperties()
  const token = String(properties.getProperty('RIDERRA_EMAIL_INGEST_TOKEN') || '').trim()
  if (!token) {
    throw new Error('Missing Script property RIDERRA_EMAIL_INGEST_TOKEN')
  }

  const ingestUrl = String(properties.getProperty('RIDERRA_INGEST_URL') || RIDERRA_DEFAULT_INGEST_URL).trim()
  const query = String(properties.getProperty('RIDERRA_QUERY') || RIDERRA_DEFAULT_QUERY).trim()
  const batchSize = Math.max(1, Math.min(Number(properties.getProperty('RIDERRA_BATCH_SIZE') || 20), 50))
  const sentLabel = getOrCreateLabel_(RIDERRA_SENT_LABEL)
  const errorLabel = getOrCreateLabel_(RIDERRA_ERROR_LABEL)
  const threads = GmailApp.search(query, 0, batchSize)

  threads.forEach((thread) => {
    thread.getMessages().forEach((message) => {
      if (messageHasLabel_(message, sentLabel) || messageHasLabel_(message, errorLabel)) return
      try {
        const response = postMessageToRiderra_(ingestUrl, token, message)
        const status = response.getResponseCode()
        if (status < 200 || status >= 300) {
          throw new Error(`Riderra ingest HTTP ${status}: ${response.getContentText().slice(0, 500)}`)
        }
        message.getThread().addLabel(sentLabel)
      } catch (error) {
        console.error(`Riderra AI Inbox bridge failed for Gmail message ${message.getId()}: ${error && error.message ? error.message : error}`)
        message.getThread().addLabel(errorLabel)
      }
    })
  })
}

function postMessageToRiderra_(ingestUrl, token, message) {
  const from = message.getFrom()
  const to = message.getTo()
  const cc = message.getCc()
  const subject = message.getSubject()
  const body = message.getPlainBody()
  const attachments = message.getAttachments({ includeInlineImages: false, includeAttachments: true }).slice(0, 20).map((attachment) => ({
    filename: attachment.getName(),
    mimeType: attachment.getContentType(),
    size: attachment.getBytes().length
  }))
  const rawText = [
    `From: ${from}`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: ${subject}`,
    `Date: ${message.getDate().toISOString()}`,
    '',
    body
  ].filter(Boolean).join('\n')

  return UrlFetchApp.fetch(ingestUrl, {
    method: 'post',
    muteHttpExceptions: true,
    contentType: 'application/json',
    headers: {
      'X-Riderra-Internal-Token': token
    },
    payload: JSON.stringify({
      fromEmail: from,
      toEmail: to,
      subject,
      rawText,
      sourceType: 'gmail_forward',
      gmailMessageId: message.getId(),
      gmailThreadId: message.getThread().getId(),
      rfcMessageId: message.getHeader('Message-ID'),
      attachments
    })
  })
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name)
}

function messageHasLabel_(message, label) {
  const labelName = label.getName()
  return message.getThread().getLabels().some((item) => item.getName() === labelName)
}

function testRiderraBridgeConfig() {
  const properties = PropertiesService.getScriptProperties()
  const token = String(properties.getProperty('RIDERRA_EMAIL_INGEST_TOKEN') || '').trim()
  const ingestUrl = String(properties.getProperty('RIDERRA_INGEST_URL') || RIDERRA_DEFAULT_INGEST_URL).trim()
  return {
    tokenConfigured: Boolean(token),
    ingestUrl,
    query: String(properties.getProperty('RIDERRA_QUERY') || RIDERRA_DEFAULT_QUERY).trim(),
    batchSize: String(properties.getProperty('RIDERRA_BATCH_SIZE') || 20)
  }
}
