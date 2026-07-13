#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const ACK_PROMPT_MARKER = 'CLEAR_ANSWER_ACK_FLOW_V1'
const ACK_PROMPT = `

[${ACK_PROMPT_MARKER}]
When the customer gives a clear answer to the selected missing-data question, classify it as an answer and extract the requested value. Do not ask the same question again.
Prepare one short, neutral thank-you message confirming only that the information was received. Do not claim that the booking or Google Sheet was changed.
The thank-you message must follow Draft -> Approval -> Execute and must never be sent autonomously. Close the conversation only after the approved thank-you message is successfully sent.
If the answer is ambiguous, invalid, a complaint, a question, or a request for a human, do not close the conversation; route it to human handoff.
`.trimEnd()

async function main() {
  const tenantCode = String(process.env.TENANT_CODE || 'riderra').trim().toLowerCase()
  const tenant = await prisma.tenant.findUnique({ where: { code: tenantCode } })
  if (!tenant) throw new Error(`Tenant not found: ${tenantCode}`)
  const agent = await prisma.chatAgentConfig.findFirst({
    where: { tenantId: tenant.id, code: 'order-completion-v1' }
  })
  if (!agent) throw new Error('Agent order-completion-v1 not found')

  const promptText = String(agent.promptText || '').includes(ACK_PROMPT_MARKER)
    ? agent.promptText
    : `${String(agent.promptText || '').trim()}\n\n${ACK_PROMPT}`.trim()
  let workflow = {}
  try { workflow = JSON.parse(agent.workflowJson || '{}') } catch (_) {}
  const states = Array.isArray(workflow.states) ? workflow.states : []
  const transitions = workflow.transitions && typeof workflow.transitions === 'object' ? workflow.transitions : {}
  const pendingTargets = Array.isArray(transitions.pending_update_approval)
    ? transitions.pending_update_approval
    : []
  if (!pendingTargets.includes('closed')) pendingTargets.push('closed')

  const updated = await prisma.chatAgentConfig.update({
    where: { id: agent.id },
    data: {
      promptText,
      workflowJson: JSON.stringify({
        ...workflow,
        states: [...new Set([...states, 'closed'])],
        transitions: { ...transitions, pending_update_approval: pendingTargets }
      }, null, 2)
    }
  })
  console.log(JSON.stringify({
    ok: true,
    tenant: tenant.code,
    agent: updated.code,
    requiresApproval: updated.requiresApproval,
    acknowledgementFlow: true
  }))
}

main()
  .catch((error) => {
    console.error(error.message || error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
