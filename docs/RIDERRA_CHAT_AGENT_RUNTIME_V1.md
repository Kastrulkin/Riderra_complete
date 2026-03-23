# Riderra Chat Agent Runtime v1

Single-tenant implementation of chat orchestration with OpenClaw-compatible agent management.

## Core Entities

- `ChatAgentConfig`: agent profile and behavior settings.
- `ChatTask`: conversation-level state machine bound to `orderId`.
- `ChatMessage`: messages inside a conversation.
- `PromptTemplate` + `PromptTemplateVersion`: versioned prompt registry.
- `AiLearningEvent`: model feedback and runtime telemetry.

## Agent Management APIs

- `GET /api/admin/ai-agents`
- `POST /api/admin/ai-agents`
- `GET /api/admin/ai-agents/:agentId`
- `PUT /api/admin/ai-agents/:agentId`
- `DELETE /api/admin/ai-agents/:agentId`

Business-scoped aliases:

- `GET /api/business/:businessId/ai-agents/manage`
- `POST /api/business/:businessId/ai-agents/manage`
- `PUT /api/business/:businessId/ai-agents/manage/:agentId`
- `DELETE /api/business/:businessId/ai-agents/manage/:agentId`

## Conversation APIs

- `GET /api/business/:businessId/conversations?agent_id=...`
- `GET /api/conversations/:conversationId/messages`
- `POST /api/conversations/:conversationId/send-message`
- `POST /api/conversations/:conversationId/toggle-agent`

## Prompt Registry APIs

- `GET /api/admin/prompts`
- `PUT /api/admin/prompts/:promptKey` (creates new version)

## Agent Sandbox Test APIs

- `POST /api/admin/ai-agents/:agentId/test` (`dry_run=true` only)
- `POST /api/business/:businessId/ai-agents/:agentId/test` (`dry_run=true` only)

## Learning Metrics APIs

- `GET /api/admin/ai/learning-metrics`

## Runtime Notes

- All risky outbound actions keep human approval flow (`pending_human`).
- Conversation state stays in Riderra (`ChatTask.state`), OpenClaw is runtime executor.
- Learning events are written on dry-run tests, draft creation and message send.
