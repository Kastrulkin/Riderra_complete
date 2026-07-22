# Riderra Chat Agent Runtime v1

Single-tenant implementation of chat orchestration with OpenClaw-compatible agent management.

## Core Entities

- `ChatAgentConfig`: agent profile and behavior settings.
- `ChatTask`: conversation-level state machine bound to `orderId`.
- `ChatMessage`: messages inside a conversation.
- `PromptTemplate` + `PromptTemplateVersion`: versioned prompt registry.
- `AiLearningEvent`: model feedback and runtime telemetry.
- `ChatAgentVersion`: immutable draft/tested/published/archived agent snapshot.
- `AgentRun`: truthful queued/running/approval/completed/failed/fallback execution log.
- `AgentSandboxSession` + `AgentSandboxMessage`: multi-turn tests with no external-send capability.

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
- `POST /api/admin/chats/tasks/:id/inbound` (save inbound + classify/extract + state transition)

## Prompt Registry APIs

- `GET /api/admin/prompts`
- `PUT /api/admin/prompts/:promptKey` (creates new version)

## Agent Sandbox Test APIs

- `POST /api/admin/ai-agents/:agentId/test` (`dry_run=true` only)
- `POST /api/business/:businessId/ai-agents/:agentId/test` (`dry_run=true` only)
- `GET /api/admin/ai-agents/:agentId/versions`
- `POST /api/admin/ai-agents/:agentId/versions/draft`
- `POST /api/admin/ai-agents/:agentId/versions/:versionId/test-suite`
- `POST /api/admin/ai-agents/:agentId/versions/:versionId/publish`
- `POST /api/admin/ai-agents/:agentId/sandbox/sessions`
- `GET /api/admin/ai-agents/:agentId/sandbox/sessions/:sessionId`
- `POST /api/admin/ai-agents/:agentId/sandbox/sessions/:sessionId/messages`
- `GET /api/admin/ai/activity`
- `GET /api/admin/ai/runtime-health`

Publishing is allowed only for a version with a successful required test suite. A `ChatTask` pins its published version when an agent is assigned or first runs, so an active conversation does not change after a later publication.

## Learning Metrics APIs

- `GET /api/admin/ai/learning-metrics`

## Runtime Notes

- All risky outbound actions keep human approval flow (`pending_human`).
- Sandbox routes never call the send capability and always report `externalSendAvailable=false`.
- Conversation state stays in Riderra (`ChatTask.state`), OpenClaw is runtime executor.
- Learning events are written on dry-run tests, draft creation and message send.
- New unlinked WhatsApp inquiries receive a tenant-scoped support agent and a `pending_human` reply draft. The agent cannot link or create an order.

## DeepSeek runtime

- Provider: DeepSeek; default model: `deepseek-v4-flash` without thinking.
- Composition temperature: `0.3`; classification/extraction: `0` with JSON response.
- Request timeout: 12 seconds; one retry for `429` and `5xx`.
- English is the default customer language. Russian is used only when `order.lang=ru`.
- `DEEPSEEK_API_KEY` is stored only in the OpenClaw service environment.
- When the key, model, or network is unavailable, OpenClaw returns a contract-valid safe fallback and Riderra shows `Резервный режим`.

## OpenClaw Runtime ENV

- `OPENCLAW_RUNTIME_BASE_URL` (production WhatsApp runtime: `http://83.166.247.254:8094`)
- `OPENCLAW_RUNTIME_TOKEN` (sent as `X-OpenClaw-Internal-Token`)
- `OPENCLAW_RUNTIME_TIMEOUT_MS` (default `20000`)
- `OPENCLAW_RUNTIME_BUILD_PATH` (default `/riderra/order-draft/build`)
- `OPENCLAW_RUNTIME_SEND_PATH` (production WhatsApp send path: `/capabilities/riderra.customer.message.send`)
- `OPENCLAW_RUNTIME_CLASSIFY_PATH` (default `/riderra/order-draft/classify`)
- `OPENCLAW_RUNTIME_EXTRACT_PATH` (default `/riderra/order-draft/extract-validate`)

If these vars are not configured, chat draft build uses local fallback text and send works in manual mode.
