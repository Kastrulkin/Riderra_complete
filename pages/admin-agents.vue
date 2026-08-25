<template>
  <div class="agent-page">
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>

    <section class="site-section site-section--pf agent-section">
      <div class="container">
        <admin-tabs :sticky="false" />

        <header class="page-head">
          <div>
            <p class="eyebrow">{{ t.pageEyebrow }}</p>
            <h1>{{ t.title }}</h1>
            <p class="page-subtitle">{{ t.subtitle }}</p>
          </div>
          <div class="status-summary">
            <strong>{{ activeAgentsCount }}/{{ agents.length }}</strong>
            <span>{{ t.activeAgents }}</span>
          </div>
        </header>

        <div v-if="notice" class="toast" :class="{ 'toast--error': noticeType === 'error' }">{{ notice }}</div>

        <div class="agent-console">
          <aside class="agent-list-panel">
            <div class="panel-head">
              <div>
                <h3>{{ t.agentList }}</h3>
                <p>{{ t.agentListHint }}</p>
              </div>
              <button class="icon-action" type="button" :title="t.newAgent" @click="startNewAgent">+</button>
            </div>

            <div class="agent-filters">
              <input v-model="agentSearch" class="input" :placeholder="t.searchAgents" />
              <select v-model="statusFilter" class="input">
                <option value="">{{ t.allStatuses }}</option>
                <option value="active">{{ t.active }}</option>
                <option value="system">{{ t.system }}</option>
                <option value="archived">{{ t.archive }}</option>
              </select>
              <select v-model="typeFilter" class="input">
                <option value="">{{ t.allContours }}</option>
                <option v-for="type in agentTypes" :key="type" :value="type">{{ contourLabel(type) }}</option>
              </select>
            </div>

            <button
              v-for="agent in filteredAgents"
              :key="agent.id"
              class="agent-list-item"
              :class="{ 'agent-list-item--active': agent.id === selectedAgentId }"
              type="button"
              @click="selectAgent(agent.id)"
            >
              <span class="agent-list-item__title">{{ agentDisplayName(agent) }}</span>
              <span class="agent-list-item__meta">{{ contourLabel(agent.type) }}</span>
              <span class="agent-list-item__line">
                <span class="status-pill" :class="statusClass(agent)">{{ statusLabel(agent) }}</span>
                <span>{{ contourLabel(agent.type) }}</span>
              </span>
              <span class="agent-list-item__description">{{ agentDescription(agent) }}</span>
            </button>

            <div v-if="!filteredAgents.length" class="empty">{{ agents.length ? t.noFilteredAgents : t.noAgents }}</div>
          </aside>

          <main class="agent-workspace">
            <div v-if="!selectedAgentId && !isCreating" class="empty empty--hero">
              <h3>{{ t.selectAgentTitle }}</h3>
              <p>{{ t.selectAgentHint }}</p>
              <button class="btn btn--primary" type="button" @click="startNewAgent">{{ t.newAgent }}</button>
            </div>

            <template v-else>
              <section class="summary-card">
                <div class="summary-card__main">
                  <div class="summary-card__title-row">
                    <h2>{{ currentAgentDisplayName }}</h2>
                    <span v-if="isSystemAgent" class="status-pill status-pill--system">{{ t.system }}</span>
                    <span v-else class="status-pill" :class="agentForm.isActive ? 'status-pill--active' : 'status-pill--archived'">
                      {{ agentForm.isActive ? t.active : t.archive }}
                    </span>
                  </div>
                  <p>{{ currentAgentDescription }}</p>
                  <div class="summary-meta">
                    <span>{{ t.type }}: <strong>{{ typeLabel(agentForm.type) }}</strong></span>
                    <span>{{ t.contour }}: <strong>{{ contourLabel(agentForm.type) }}</strong></span>
                    <span>{{ t.taskType }}: <strong>{{ taskTypeLabel(agentForm.taskType) }}</strong></span>
                  </div>
                </div>

                <div class="summary-toggles">
                  <label class="switch">
                    <input type="checkbox" v-model="agentForm.isActive" :disabled="isSystemAgent" />
                    <span>{{ t.activeToggle }}</span>
                  </label>
                  <label class="switch">
                    <input type="checkbox" v-model="agentForm.requiresApproval" disabled />
                    <span>{{ t.approvalToggle }}</span>
                  </label>
                  <div class="summary-audit">
                    <span>{{ t.lastUpdated }}: {{ formatDate(selectedAgent && selectedAgent.updatedAt) }}</span>
                    <span>{{ t.lastPublished }}: {{ agentForm.isActive ? formatDate(selectedAgent && selectedAgent.updatedAt) : '—' }}</span>
                    <span>{{ t.changedBy }}: {{ selectedAgent && selectedAgent.createdByUserId ? selectedAgent.createdByUserId : '—' }}</span>
                  </div>
                </div>
              </section>

              <nav class="settings-tabs" aria-label="Agent settings tabs">
                <button
                  v-for="tab in tabs"
                  :key="tab.key"
                  class="settings-tab"
                  :class="{ 'settings-tab--active': activeTab === tab.key }"
                  type="button"
                  @click="activeTab = tab.key"
                >
                  {{ tab.label }}
                </button>
              </nav>

              <section class="settings-card">
                <div v-if="activeTab === 'overview'" class="form-grid">
                  <div class="runtime-overview form-grid__wide">
                    <div class="runtime-status">
                      <span class="runtime-dot" :class="{ 'runtime-dot--live': runtimeHealth.mode === 'runtime' }"></span>
                      <div>
                        <strong>{{ runtimeHealth.message || 'Проверяем подключение модели…' }}</strong>
                        <p>{{ runtimeHealth.provider || 'DeepSeek' }} · {{ runtimeHealth.model || 'deepseek-v4-flash' }}</p>
                      </div>
                    </div>
                    <div class="activity-metrics">
                      <div><strong>{{ activity.now && activity.now.active || 0 }}</strong><span>работают сейчас</span></div>
                      <div><strong>{{ activity.day && activity.day.successful || 0 }}</strong><span>успешно за сутки</span></div>
                      <div><strong>{{ activity.day && activity.day.fallback || 0 }}</strong><span>резервный режим</span></div>
                      <div><strong>{{ formatLatency(activity.day && activity.day.averageLatencyMs) }}</strong><span>средний ответ</span></div>
                    </div>
                  </div>
                  <field-control :label="t.name" :helper="t.nameHelp">
                    <input v-model="agentForm.name" class="input" :disabled="isSystemAgent" />
                  </field-control>
                  <field-control :label="t.slugVersion" :helper="t.slugHelp">
                    <div class="inline-grid">
                      <input v-model="agentForm.code" class="input" :disabled="Boolean(selectedAgentId) || isSystemAgent" />
                      <input class="input" value="v1" disabled />
                    </div>
                  </field-control>
                  <field-control :label="t.type" :helper="t.typeHelp">
                    <select v-model="agentForm.type" class="input" :disabled="isSystemAgent">
                      <option value="order_completion">{{ typeLabel('order_completion') }}</option>
                      <option value="dispatch_notify">{{ typeLabel('dispatch_notify') }}</option>
                      <option value="customer_support">{{ typeLabel('customer_support') }}</option>
                      <option value="driver_ops">{{ typeLabel('driver_ops') }}</option>
                    </select>
                  </field-control>
                  <field-control :label="t.contour" :helper="t.contourHelp">
                    <input class="input" :value="contourLabel(agentForm.type)" disabled />
                  </field-control>
                  <field-control class="form-grid__wide" :label="t.description" :helper="t.descriptionHelp">
                    <textarea v-model="agentForm.description" class="input textarea textarea--small" :disabled="isSystemAgent"></textarea>
                  </field-control>
                  <div class="toggle-grid form-grid__wide">
                    <label class="switch">
                      <input type="checkbox" v-model="agentForm.isActive" :disabled="isSystemAgent" />
                      <span>{{ t.isActive }}</span>
                    </label>
                    <label class="switch">
                      <input type="checkbox" v-model="agentForm.requiresApproval" disabled />
                      <span>{{ t.requiresApproval }}</span>
                    </label>
                  </div>
                </div>

                <div v-if="activeTab === 'behavior'" class="form-grid">
                  <field-control :label="t.identity" :helper="t.identityHelp">
                    <textarea v-model="agentForm.identity" class="input textarea textarea--small" :disabled="isSystemAgent"></textarea>
                  </field-control>
                  <field-control :label="t.task" :helper="t.taskHelp">
                    <textarea v-model="agentForm.task" class="input textarea textarea--small" :disabled="isSystemAgent"></textarea>
                  </field-control>
                  <field-control :label="t.speechStyle" :helper="t.speechStyleHelp">
                    <input v-model="agentForm.speechStyle" class="input" :disabled="isSystemAgent" />
                  </field-control>
                  <field-control :label="t.defaultLanguage" :helper="t.defaultLanguageHelp">
                    <select v-model="defaultLanguage" class="input" :disabled="isSystemAgent">
                      <option value="en">Английский</option>
                      <option value="ru">Русский</option>
                    </select>
                  </field-control>
                  <field-control class="form-grid__wide" :label="t.personality" :helper="t.personalityHelp">
                    <textarea v-model="agentForm.personality" class="input textarea textarea--small" :disabled="isSystemAgent"></textarea>
                  </field-control>
                  <field-control class="form-grid__wide" :label="t.responseRules" :helper="t.responseRulesHelp">
                    <textarea v-model="agentForm.promptText" class="input textarea" :disabled="isSystemAgent"></textarea>
                  </field-control>
                  <div class="preset-row form-grid__wide">
                    <button class="btn btn--tiny" type="button" :disabled="isSystemAgent" @click="applyAgentPreset('clarification')">{{ t.presetClarification }}</button>
                    <button class="btn btn--tiny" type="button" :disabled="isSystemAgent" @click="applyAgentPreset('dispatch')">{{ t.presetDispatch }}</button>
                  </div>
                </div>

                <div v-if="activeTab === 'knowledge'" class="knowledge-panel">
                  <div class="workflow-header">
                    <div>
                      <h3>Публичная информация Riderra</h3>
                      <p>Единственные общие сведения о компании и услугах, которые агент вправе сообщать клиентам. Если ответа здесь нет, диалог передаётся сотруднику.</p>
                    </div>
                    <span class="status-pill" :class="publicKnowledgeStatus === 'published' ? 'status-pill--active' : ''">{{ versionStatusLabel(publicKnowledgeStatus) }}</span>
                  </div>
                  <div class="safety-callout">
                    <strong>Защита {{ safetyPolicyVersion }}</strong>
                    <span>Правила безопасности нельзя изменить промптом агента: посторонние темы, провокации, внутренние данные и неизвестные факты всегда передаются сотруднику.</span>
                  </div>
                  <field-control label="Утверждённые сведения" helper="Пишите короткими проверяемыми пунктами: услуги, общие условия, контакты и разрешённые формулировки. Не добавляйте внутренние процессы, секреты и обещания цены.">
                    <textarea v-model="publicKnowledgeText" class="input textarea" placeholder="• Riderra provides pre-booked passenger transfer services.&#10;• Customer contact: info@riderra.com"></textarea>
                  </field-control>
                  <div v-if="publicKnowledgeChecks.length" class="knowledge-checks">
                    <span v-for="check in publicKnowledgeChecks" :key="check.key" :class="check.passed ? 'check--ok' : 'check--error'">{{ check.passed ? '✓' : '!' }} {{ check.label }}</span>
                  </div>
                  <div class="local-actions">
                    <button class="btn btn--ghost" type="button" :disabled="knowledgeSaving || !publicKnowledgeText.trim()" @click="saveKnowledgeDraft">Сохранить черновик</button>
                    <button class="btn btn--ghost" type="button" :disabled="knowledgeSaving || !publicKnowledgeVersionId" @click="testKnowledge">Проверить</button>
                    <button class="btn btn--primary" type="button" :disabled="knowledgeSaving || publicKnowledgeStatus !== 'tested'" @click="publishKnowledge">Опубликовать</button>
                  </div>
                </div>

                <div v-if="activeTab === 'workflow'" class="workflow-editor">
                  <div class="scenario-map" aria-label="Этапы работы агента">
                    <div v-for="(step, index) in scenarioSteps" :key="step.key" class="scenario-step">
                      <span class="scenario-step__number">{{ index + 1 }}</span>
                      <span>{{ step.label }}</span>
                    </div>
                  </div>
                  <div class="scenario-branches">
                    <span>Нужна помощь сотрудника</span>
                    <span>Не понял ответ</span>
                    <span>Ошибка</span>
                  </div>
                  <p class="scenario-note">Проверка человеком, передача сотруднику и обработка ошибки обязательны и не удаляются.</p>
                  <div class="workflow-header">
                    <div>
                      <h3>{{ t.workflow }}</h3>
                      <p>{{ t.workflowHint }}</p>
                    </div>
                    <button class="btn btn--ghost" type="button" :disabled="isSystemAgent" @click="normalizeWorkflowJson">{{ t.normalizeWorkflow }}</button>
                  </div>

                  <div class="workflow-grid">
                    <field-control :label="t.startState" :helper="t.startStateHelp">
                      <input v-model="workflowDraft.startState" class="input" :disabled="isSystemAgent" @input="syncWorkflowDraft" />
                    </field-control>
                    <field-control :label="t.finalStates" :helper="t.finalStatesHelp">
                      <input v-model="workflowDraft.finalStatesText" class="input" :disabled="isSystemAgent" @input="syncWorkflowDraft" />
                    </field-control>
                  </div>

                  <div class="workflow-section">
                    <div class="workflow-section__head">
                      <h4>{{ t.states }}</h4>
                      <button class="btn btn--tiny" type="button" :disabled="isSystemAgent" @click="addWorkflowState">{{ t.addState }}</button>
                    </div>
                    <div class="state-list">
                      <div v-for="(state, index) in workflowDraft.states" :key="`state-${index}`" class="state-row">
                        <input v-model="workflowDraft.states[index]" class="input" :disabled="isSystemAgent" @input="syncWorkflowDraft" />
                        <button class="btn btn--tiny btn--ghost" type="button" :disabled="isSystemAgent" @click="removeWorkflowState(index)">{{ t.remove }}</button>
                      </div>
                    </div>
                  </div>

                  <div class="workflow-section">
                    <div class="workflow-section__head">
                      <h4>{{ t.transitions }}</h4>
                      <button class="btn btn--tiny" type="button" :disabled="isSystemAgent" @click="addWorkflowTransition">{{ t.addTransition }}</button>
                    </div>
                    <div class="transition-list">
                      <div v-for="(transition, index) in workflowDraft.transitions" :key="`transition-${index}`" class="transition-row">
                        <input v-model="transition.from" class="input" placeholder="from" :disabled="isSystemAgent" @input="syncWorkflowDraft" />
                        <span>→</span>
                        <input v-model="transition.to" class="input" placeholder="to" :disabled="isSystemAgent" @input="syncWorkflowDraft" />
                        <input v-model="transition.label" class="input" :placeholder="t.transitionLabel" :disabled="isSystemAgent" @input="syncWorkflowDraft" />
                        <button class="btn btn--tiny btn--ghost" type="button" :disabled="isSystemAgent" @click="removeWorkflowTransition(index)">{{ t.remove }}</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="activeTab === 'advanced'" class="templates-panel">
                  <div class="workflow-header">
                    <div>
                      <h3>{{ t.whatsappTemplates }}</h3>
                      <p>{{ t.whatsappTemplatesHint }}</p>
                    </div>
                    <button class="btn btn--ghost" type="button" @click="addWhatsappTemplate">{{ t.addTemplate }}</button>
                  </div>
                  <div class="template-table">
                    <div class="template-row template-row--head">
                      <span>{{ t.templateName }}</span>
                      <span>{{ t.templateLanguages }}</span>
                      <span>{{ t.templateVariables }}</span>
                      <span>{{ t.templateStatus }}</span>
                      <span></span>
                    </div>
                    <div v-for="(template, index) in whatsappTemplates" :key="`template-${index}`" class="template-row">
                      <input v-model="template.name" class="input input--compact" placeholder="riderra_baggage_request" />
                      <input v-model="template.languagesText" class="input input--compact" placeholder="en, ru" />
                      <div class="chip-editor">
                        <span v-for="variable in csvToArray(template.variablesText)" :key="variable" class="state-chip">{{ variable }}</span>
                        <input v-model="template.variablesText" class="input input--compact" placeholder="booking_number, route_from" />
                      </div>
                      <span class="status-pill status-pill--active">{{ t.approved }}</span>
                      <button class="btn btn--tiny btn--ghost" type="button" @click="removeWhatsappTemplate(index)">{{ t.remove }}</button>
                    </div>
                    <div v-if="!whatsappTemplates.length" class="empty">{{ t.noTemplates }}</div>
                  </div>
                  <div class="local-actions">
                    <button class="btn btn--primary" type="button" :disabled="templateSaving" @click="saveWhatsappTemplates">
                      {{ templateSaving ? t.saving : t.saveTemplates }}
                    </button>
                    <button class="btn btn--ghost" type="button" @click="openPromptRegistry">{{ t.openPromptRegistry }}</button>
                    <span v-if="templateNotice" class="muted">{{ templateNotice }}</span>
                  </div>
                </div>

                <div v-if="activeTab === 'test'" class="test-panel">
                  <div class="sandbox-head">
                    <div>
                      <h3>Песочница диалога</h3>
                      <p>Тот же агент и те же правила, но отправка клиенту здесь физически отключена.</p>
                    </div>
                    <div class="sandbox-start">
                      <select v-model="sandboxScenario" class="input">
                        <option v-for="scenario in sandboxScenarios" :key="scenario.key" :value="scenario.key">{{ scenario.label }}</option>
                      </select>
                      <button class="btn btn--primary" type="button" :disabled="agentTesting || !selectedAgentId" @click="startSandbox">Новый тест</button>
                    </div>
                  </div>
                  <div v-if="sandboxSession" class="sandbox-shell">
                    <div class="sandbox-context">
                      <span>Заказ {{ sandboxContext.order && sandboxContext.order.public_reference }}</span>
                      <span>{{ sandboxContext.label }}</span>
                      <span class="status-pill">Отправка отключена</span>
                    </div>
                    <div class="sandbox-transcript">
                      <div v-for="message in sandboxMessages" :key="message.id" class="sandbox-message" :class="`sandbox-message--${message.role}`">
                        <span>{{ message.role === 'customer' ? 'Клиент' : 'Черновик агента' }}</span>
                        <p>{{ message.bodyText }}</p>
                        <div v-if="message.trace" class="sandbox-decision">
                          <span>{{ stateHuman(message.stateAfter) }}</span>
                          <span v-if="message.extraction && message.extraction.valid">Найдено: {{ extractionHuman(message.extraction) }}</span>
                          <span>{{ message.trace.reason }}</span>
                          <span v-if="message.trace.safety">Риск: {{ message.trace.safety.category }}</span>
                          <span v-if="message.trace.policyAction">Решение: {{ message.trace.policyAction }}</span>
                        </div>
                      </div>
                      <div v-if="!sandboxMessages.length" class="empty empty--inline">Введите реплику клиента и посмотрите решение агента.</div>
                    </div>
                    <div class="sandbox-composer">
                      <textarea v-model="agentTestInput" class="input textarea textarea--small" :placeholder="sandboxSuggestedMessage || t.sandboxPlaceholder"></textarea>
                      <button class="btn btn--primary" type="button" :disabled="agentTesting || !agentTestInput.trim()" @click="sendSandboxMessage">
                        {{ agentTesting ? 'Агент разбирает ответ…' : 'Отправить реплику в тест' }}
                      </button>
                    </div>
                  </div>
                  <div v-else class="empty empty--inline">Выберите готовый сценарий и начните тест.</div>
                </div>

                <div v-if="activeTab === 'versions'" class="versions-panel">
                  <div class="versions-head">
                    <div><h3>Версии и активность</h3><p>Новая версия не меняет уже начатые диалоги.</p></div>
                    <button class="btn btn--primary" type="button" :disabled="versionActionLoading || !selectedAgentId" @click="createDraftVersion">Создать версию из настроек</button>
                  </div>
                  <div class="version-list">
                    <div v-for="version in agentVersions" :key="version.id" class="version-row">
                      <div><strong>Версия {{ version.version }}</strong><span>{{ versionStatusLabel(version.status) }}</span></div>
                      <span>{{ formatDate(version.updatedAt) }}</span>
                      <button v-if="version.status === 'draft'" class="btn btn--tiny" type="button" :disabled="versionActionLoading" @click="testVersion(version)">Запустить обязательные тесты</button>
                      <button v-if="version.status === 'tested'" class="btn btn--tiny btn--primary" type="button" :disabled="versionActionLoading" @click="publishVersion(version)">Опубликовать</button>
                      <span v-if="version.testSummary" class="version-result">{{ passedChecksLabel(version.testSummary) }}</span>
                    </div>
                    <div v-if="!agentVersions.length" class="empty empty--inline">Версии появятся после сохранения агента.</div>
                  </div>
                  <h4>Последние действия</h4>
                  <div class="run-list">
                    <div v-for="run in activity.recent || []" :key="run.id" class="run-row">
                      <span class="runtime-dot" :class="{ 'runtime-dot--live': ['running', 'queued'].includes(run.status) }"></span>
                      <div><strong>{{ run.summary || capabilityHuman(run.capability) }}</strong><span>{{ run.agentConfig && run.agentConfig.name }} · {{ runStatusLabel(run.status) }}</span></div>
                      <time>{{ formatDate(run.startedAt) }}</time>
                    </div>
                  </div>
                </div>

                <div v-if="activeTab === 'advanced'" class="advanced-panel">
                  <div class="registry-callout">
                    <div>
                      <h3>{{ t.promptRegistry }}</h3>
                      <p>{{ t.promptRegistryHint }}</p>
                    </div>
                    <button class="btn btn--ghost" type="button" @click="showPromptRegistry = !showPromptRegistry">
                      {{ showPromptRegistry ? t.hidePromptRegistry : t.openPromptRegistry }}
                    </button>
                  </div>

                  <div v-if="showPromptRegistry" class="prompt-registry">
                    <div class="agent-grid agent-grid--registry">
                      <select v-model="selectedPromptKey" class="input" @change="applyPromptSelection">
                        <option v-for="key in promptKeys" :key="key" :value="key">{{ key }}</option>
                      </select>
                      <input class="input" :value="selectedPromptVersionLabel" disabled />
                      <input v-model="promptDescription" class="input" :placeholder="t.promptDescription" />
                    </div>
                    <field-control :label="t.promptText" :helper="t.promptRegistryHint">
                      <textarea v-model="promptText" class="input textarea textarea--code"></textarea>
                    </field-control>
                    <div class="local-actions">
                      <button class="btn btn--primary" type="button" :disabled="promptSaving || !selectedPromptKey" @click="savePromptTemplate">
                        {{ promptSaving ? t.saving : t.savePromptVersion }}
                      </button>
                    </div>
                  </div>

                  <field-control :label="t.rawWorkflow" :helper="t.rawWorkflowHelp">
                    <textarea v-model="agentForm.workflowJson" class="input textarea textarea--code" :disabled="isSystemAgent" @input="hydrateWorkflowDraft"></textarea>
                  </field-control>
                  <field-control :label="t.restrictions" :helper="t.restrictionsHelp">
                    <textarea v-model="agentForm.restrictionsJson" class="input textarea textarea--code" :disabled="isSystemAgent"></textarea>
                  </field-control>
                  <field-control :label="t.variables" :helper="t.variablesHelp">
                    <textarea v-model="agentForm.variablesJson" class="input textarea textarea--code" :disabled="isSystemAgent"></textarea>
                  </field-control>

                  <details class="danger-zone">
                    <summary>{{ t.dangerZone }}</summary>
                    <p>{{ t.dangerZoneHint }}</p>
                    <button class="btn btn--danger" type="button" :disabled="!selectedAgentId || isSystemAgent" @click="deleteAgent">{{ t.deleteAgent }}</button>
                  </details>
                </div>
              </section>

              <div class="action-bar">
                <span class="dirty-indicator" :class="{ 'dirty-indicator--active': hasUnsavedChanges }">
                  {{ hasUnsavedChanges ? t.unsavedChanges : t.allSaved }}
                </span>
                <div class="action-bar__buttons">
                  <button class="btn btn--ghost" type="button" :disabled="agentTesting || !selectedAgentId" @click="runAgentTest">{{ t.test }}</button>
                  <button class="btn btn--ghost" type="button" :disabled="agentSaving || isSystemAgent" @click="saveAgent('draft')">
                    {{ agentSaving ? t.saving : t.saveDraft }}
                  </button>
                  <button class="btn btn--primary" type="button" :disabled="agentSaving || isSystemAgent" @click="publishAgent">
                    {{ agentSaving ? t.saving : t.publish }}
                  </button>
                </div>
              </div>
            </template>
          </main>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import adminTabs from '~/components/partials/adminTabs.vue'

const emptyAgentForm = () => ({
  name: '',
  code: '',
  type: 'order_completion',
  description: '',
  personality: '',
  identity: '',
  task: '',
  speechStyle: '',
  taskType: 'clarification',
  promptText: '',
  workflowJson: '',
  restrictionsJson: '',
  constraintsJson: '',
  variablesJson: '',
  isActive: true,
  requiresApproval: true
})

const workflowDraftDefaults = () => ({
  startState: 'idle',
  finalStatesText: 'completed',
  states: ['idle', 'triggered', 'needs_human_review', 'completed'],
  transitions: [
    { from: 'idle', to: 'triggered', label: 'start' },
    { from: 'triggered', to: 'needs_human_review', label: 'approval' },
    { from: 'needs_human_review', to: 'completed', label: 'done' }
  ]
})

export default {
  layout: 'admin',
  middleware: 'staff',
  components: {
    adminTabs,
    FieldControl: {
      functional: true,
      props: { label: String, helper: String },
      render (h, ctx) {
        return h('label', { class: ['field-control', ctx.data.staticClass, ctx.data.class] }, [
          h('span', { class: 'field-control__label' }, ctx.props.label),
          h('span', { class: 'field-control__helper' }, ctx.props.helper),
          ctx.children
        ])
      }
    }
  },
  data: () => ({
    notice: '',
    noticeType: 'ok',
    agents: [],
    selectedAgentId: '',
    creatingNew: false,
    activeTab: 'overview',
    agentSearch: '',
    statusFilter: '',
    typeFilter: '',
    agentSaving: false,
    agentTesting: false,
    agentTestInput: '',
    agentTestOutput: '',
    sandboxScenario: 'baggage',
    sandboxSession: null,
    sandboxContext: {},
    sandboxMessages: [],
    sandboxSuggestedMessage: '',
    runtimeHealth: {},
    activity: { now: {}, day: {}, recent: [] },
    agentVersions: [],
    versionActionLoading: false,
    promptTemplates: [],
    promptKeys: ['order_missing_data_prompt', 'reply_interpretation_prompt', 'esim_offer_prompt', 'followup_prompt', 'whatsapp_template_registry'],
    selectedPromptKey: 'order_missing_data_prompt',
    selectedPromptVersionLabel: '-',
    promptText: '',
    promptDescription: '',
    promptSaving: false,
    publicKnowledgeText: '',
    publicKnowledgeVersionId: '',
    publicKnowledgeStatus: 'draft',
    publicKnowledgeChecks: [],
    safetyPolicyVersion: 'riderra-safety-v1',
    knowledgeSaving: false,
    whatsappTemplates: [],
    templateSaving: false,
    templateNotice: '',
    showPromptRegistry: false,
    agentForm: emptyAgentForm(),
    workflowDraft: workflowDraftDefaults(),
    savedSnapshot: ''
  }),
  computed: {
    tabs () {
      return [
        { key: 'overview', label: this.t.tabOverview },
        { key: 'behavior', label: this.t.tabBehavior },
        { key: 'knowledge', label: 'Публичная информация' },
        { key: 'workflow', label: this.t.tabWorkflow },
        { key: 'test', label: 'Песочница' },
        { key: 'versions', label: 'Версии и активность' },
        { key: 'advanced', label: this.t.tabAdvanced }
      ]
    },
    scenarioSteps () {
      return [
        { key: 'received', label: 'Получил задачу' },
        { key: 'compose', label: 'Готовит сообщение' },
        { key: 'approval', label: 'Ждёт одобрения' },
        { key: 'sent', label: 'Отправлено' },
        { key: 'waiting', label: 'Ждёт клиента' },
        { key: 'classify', label: 'Разбирает ответ' },
        { key: 'thanks', label: 'Готовит благодарность' },
        { key: 'complete', label: 'Завершено' }
      ]
    },
    sandboxScenarios () {
      return [
        { key: 'baggage', label: 'Багаж: понятный ответ' },
        { key: 'flight', label: 'Номер рейса' },
        { key: 'pickup', label: 'Место подачи' },
        { key: 'ambiguous', label: 'Неоднозначный ответ' },
        { key: 'customer_question', label: 'Вопрос клиента' },
        { key: 'refusal', label: 'Отказ отвечать' },
        { key: 'language', label: 'Русский язык' },
        { key: 'inbound_inquiry', label: 'Первичное обращение' }
        ,{ key: 'approved_commercial', label: 'Разрешённый вопрос об услугах' }
        ,{ key: 'abuse', label: 'Безопасность: оскорбление' }
        ,{ key: 'prompt_injection', label: 'Безопасность: отмена правил' }
        ,{ key: 'internal_info', label: 'Безопасность: внутренние данные' }
        ,{ key: 'politics', label: 'Безопасность: посторонняя тема' }
        ,{ key: 'complaint', label: 'Передача: жалоба' }
        ,{ key: 'human_request', label: 'Передача: просьба о сотруднике' }
      ]
    },
    isCreating () {
      return this.creatingNew
    },
    selectedAgent () {
      return (this.agents || []).find((agent) => agent.id === this.selectedAgentId) || null
    },
    isSystemAgent () {
      const code = String(this.agentForm.code || this.selectedAgent?.code || '').trim().toLowerCase()
      return code === 'policy_guard' || code.startsWith('system_')
    },
    activeAgentsCount () {
      return (this.agents || []).filter((agent) => agent.isActive !== false).length
    },
    agentTypes () {
      return [...new Set((this.agents || []).map((agent) => agent.type).filter(Boolean))]
    },
    filteredAgents () {
      const q = String(this.agentSearch || '').trim().toLowerCase()
      return (this.agents || []).filter((agent) => {
        const isSystem = this.isAgentSystem(agent)
        const status = isSystem ? 'system' : (agent.isActive !== false ? 'active' : 'archived')
        if (this.statusFilter && this.statusFilter !== status) return false
        if (this.typeFilter && agent.type !== this.typeFilter) return false
        if (!q) return true
        return [agent.name, agent.code, agent.type, agent.description].some((value) => String(value || '').toLowerCase().includes(q))
      })
    },
    defaultLanguage: {
      get () {
        const match = String(this.agentForm.promptText || '').match(/Default customer-facing language is ([A-Za-z]+)/i)
        return match && match[1].toLowerCase().startsWith('ru') ? 'ru' : 'en'
      },
      set (value) {
        const langLine = value === 'ru'
          ? 'Default customer-facing language is Russian unless order.lang is explicitly en.'
          : 'Default customer-facing language is English unless order.lang is explicitly ru.'
        const lines = String(this.agentForm.promptText || '').split('\n')
        const index = lines.findIndex((line) => /Default customer-facing language/i.test(line))
        if (index >= 0) lines.splice(index, 1, langLine)
        else lines.unshift(langLine)
        this.agentForm.promptText = lines.join('\n').trim()
      }
    },
    hasUnsavedChanges () {
      return this.snapshotForm() !== this.savedSnapshot
    },
    currentAgentDisplayName () {
      return this.agentDisplayName(this.selectedAgent || this.agentForm)
    },
    currentAgentDescription () {
      return this.agentDescription(this.selectedAgent || this.agentForm)
    },
    testResultSummary () {
      const parsed = this.parseJsonMaybe(this.agentTestOutput)
      const response = parsed?.response || parsed?.result?.response || parsed?.message || parsed?.text
      if (response) return String(response)
      if (parsed?.success === true) return this.t.testSuccess
      if (parsed?.error) return String(parsed.error)
      return ''
    },
    t () {
      return this.$store.state.language === 'ru'
        ? {
            pageEyebrow: 'Панель AI-агентов',
            title: 'AI агенты',
            subtitle: 'Настройка AI-агентов: поведение, сценарии, шаблоны, тесты и публикация без технических деталей в основном сценарии.',
            activeAgents: 'активно',
            agentList: 'Агенты',
            agentListHint: 'Поиск, статус и контур.',
            searchAgents: 'Поиск по названию или описанию',
            allStatuses: 'Все статусы',
            allContours: 'Все контуры',
            active: 'Активен',
            archive: 'Архив',
            system: 'Системный',
            noAgents: 'Пока нет агентов.',
            noFilteredAgents: 'По фильтрам ничего не найдено.',
            noDescription: 'Описание не заполнено.',
            selectAgentTitle: 'Выберите агента',
            selectAgentHint: 'Слева откройте существующего агента или создайте новый.',
            newAgent: 'Новый агент',
            untitledAgent: 'Новый агент',
            type: 'Тип',
            contour: 'Контур',
            taskType: 'Задача',
            activeToggle: 'Активен',
            approvalToggle: 'Только после проверки человеком',
            lastUpdated: 'Обновлён',
            lastPublished: 'Опубликован',
            changedBy: 'Кто менял',
            tabOverview: 'Обзор',
            tabBehavior: 'Поведение',
            tabWorkflow: 'Сценарий',
            tabTemplates: 'Шаблоны',
            tabTest: 'Тест',
            tabAdvanced: 'Служебное',
            name: 'Имя агента',
            nameHelp: 'Понятное название для оператора и владельца процесса.',
            slugVersion: 'Внутренний код / версия',
            slugHelp: 'Служебный код нужен системе. Обычно его не меняют после создания.',
            typeHelp: 'Рабочий тип агента.',
            contourHelp: 'Человеческое имя контура, где работает агент.',
            description: 'Описание',
            descriptionHelp: 'Коротко: что агент делает и где применяется.',
            isActive: 'Агент активен',
            requiresApproval: 'Только через human approval',
            identity: 'Роль',
            identityHelp: 'Кем агент является в коммуникации.',
            task: 'Задача',
            taskHelp: 'Что агент должен выполнить в одном рабочем сценарии.',
            speechStyle: 'Стиль общения',
            speechStyleHelp: 'Стиль ответа: коротко, формально, дружелюбно и т.д.',
            defaultLanguage: 'Язык по умолчанию',
            defaultLanguageHelp: 'Язык по умолчанию для customer-facing текста.',
            personality: 'Поведенческий профиль',
            personalityHelp: 'Небольшие правила поведения без технического JSON.',
            responseRules: 'Правила ответа',
            responseRulesHelp: 'Главные инструкции prompt. Это структурированный текст, не JSON.',
            presetClarification: 'Пресет: уточнение',
            presetDispatch: 'Пресет: рассылка',
            workflow: 'Сценарий работы',
            workflowHint: 'Визуальная настройка состояний и переходов. Служебный JSON оставлен во вкладке “Служебное”.',
            normalizeWorkflow: 'Собрать из служебных данных',
            startState: 'Стартовое состояние',
            startStateHelp: 'Состояние, с которого начинается сценарий.',
            finalStates: 'Финальные состояния',
            finalStatesHelp: 'Через запятую: completed, failed.',
            states: 'Состояния',
            transitions: 'Допустимые переходы',
            addState: 'Добавить состояние',
            addTransition: 'Добавить переход',
            transitionLabel: 'метка',
            remove: 'Удалить',
            whatsappTemplates: 'Шаблоны WhatsApp',
            whatsappTemplatesHint: 'Одобренные шаблоны Meta. Переменные показаны метками, чтобы оператор не читал длинную строку.',
            addTemplate: 'Добавить шаблон',
            templateName: 'Шаблон',
            templateLanguages: 'Языки',
            templateVariables: 'Переменные',
            templateStatus: 'Статус',
            approved: 'Одобрен',
            noTemplates: 'Нет шаблонов.',
            saveTemplates: 'Сохранить шаблоны',
            openPromptRegistry: 'Открыть реестр промптов',
            hidePromptRegistry: 'Скрыть реестр промптов',
            promptRegistry: 'Реестр промптов',
            promptRegistryHint: 'Отдельная сущность с версиями промптов. Обычному оператору сюда обычно не нужно.',
            promptDescription: 'Описание промпта',
            promptText: 'Текст промпта',
            savePromptVersion: 'Сохранить новую версию',
            sandbox: 'Тестовый контекст',
            sandboxHint: 'Проверка без отправки в реальный канал.',
            sandboxPlaceholder: 'Вставьте тестовое сообщение или контекст заказа',
            testing: 'Тестирую...',
            runDryRun: 'Запустить тест',
            noTestResult: 'Результат появится после теста.',
            testResult: 'Результат теста',
            testSuccess: 'Тест выполнен успешно.',
            ready: 'Готово',
            showTechnicalDetails: 'Показать технические детали',
            rawWorkflow: 'Служебные данные сценария',
            rawWorkflowHelp: 'Для сложных сценариев. Основной сценарий редактируется во вкладке “Сценарий”.',
            restrictions: 'Служебные ограничения',
            restrictionsHelp: 'Ограничения runtime.',
            variables: 'Служебные переменные',
            variablesHelp: 'Переменные агента и дефолты.',
            dangerZone: 'Опасная зона',
            dangerZoneHint: 'Удаление необратимо. Системные агенты удалить нельзя.',
            deleteAgent: 'Удалить агента',
            unsavedChanges: 'Есть несохранённые изменения',
            allSaved: 'Сохранено',
            test: 'Протестировать',
            saveDraft: 'Сохранить черновик',
            publish: 'Опубликовать',
            saving: 'Сохраняю...'
          }
        : {
            title: 'AI agents',
            subtitle: 'Configure AI agents: behavior, workflow, templates, tests and publishing without raw JSON in the main path.',
            activeAgents: 'active',
            agentList: 'Agents',
            agentListHint: 'Search, status and contour.',
            searchAgents: 'Search by name, slug or description',
            allStatuses: 'All statuses',
            allContours: 'All contours',
            active: 'Active',
            archive: 'Archive',
            system: 'System',
            noAgents: 'No agents yet.',
            noFilteredAgents: 'No agents match filters.',
            noDescription: 'No description yet.',
            selectAgentTitle: 'Select an agent',
            selectAgentHint: 'Open an existing agent or create a new one.',
            newAgent: 'New agent',
            untitledAgent: 'New agent',
            type: 'Type',
            contour: 'Contour',
            taskType: 'Task',
            activeToggle: 'Active',
            approvalToggle: 'Human approval',
            lastUpdated: 'Last updated',
            lastPublished: 'Last published',
            changedBy: 'Changed by',
            tabOverview: 'Overview',
            tabBehavior: 'Behavior',
            tabWorkflow: 'Workflow',
            tabTemplates: 'Templates',
            tabTest: 'Test',
            tabAdvanced: 'Advanced',
            name: 'Agent name',
            nameHelp: 'Clear name for operators and process owners.',
            slugVersion: 'Slug / version',
            slugHelp: 'Runtime slug. Locked after creation.',
            typeHelp: 'Technical type in the existing schema.',
            contourHelp: 'Human-friendly contour name.',
            description: 'Description',
            descriptionHelp: 'Short explanation of what this agent does.',
            isActive: 'Agent is active',
            requiresApproval: 'Human approval only',
            identity: 'Role',
            identityHelp: 'Who the agent is in communication.',
            task: 'Task',
            taskHelp: 'What the agent does in one workflow.',
            speechStyle: 'Tone / style',
            speechStyleHelp: 'Response style.',
            defaultLanguage: 'Default language',
            defaultLanguageHelp: 'Default customer-facing language.',
            personality: 'Behavior profile',
            personalityHelp: 'Small behavior rules, not JSON.',
            responseRules: 'Response rules',
            responseRulesHelp: 'Main prompt instructions. Structured text, not JSON.',
            presetClarification: 'Preset: clarification',
            presetDispatch: 'Preset: dispatch',
            workflow: 'Workflow',
            workflowHint: 'Visual states and transitions. Raw JSON remains in Advanced.',
            normalizeWorkflow: 'Build from JSON',
            startState: 'Start state',
            startStateHelp: 'Initial workflow state.',
            finalStates: 'Final states',
            finalStatesHelp: 'Comma-separated: completed, failed.',
            states: 'States',
            transitions: 'Allowed transitions',
            addState: 'Add state',
            addTransition: 'Add transition',
            transitionLabel: 'label',
            remove: 'Remove',
            whatsappTemplates: 'WhatsApp templates',
            whatsappTemplatesHint: 'Approved Meta templates. Variables are shown as chips.',
            addTemplate: 'Add template',
            templateName: 'Template',
            templateLanguages: 'Languages',
            templateVariables: 'Variables',
            noTemplates: 'No templates yet.',
            saveTemplates: 'Save templates',
            openPromptRegistry: 'Open Prompt Registry',
            hidePromptRegistry: 'Hide Prompt Registry',
            promptRegistry: 'Prompt Registry',
            promptRegistryHint: 'Separate versioned prompt entity.',
            promptDescription: 'Prompt description',
            promptText: 'Prompt text',
            savePromptVersion: 'Save new version',
            sandbox: 'Test context',
            sandboxHint: 'Dry-run without sending to a live channel.',
            sandboxPlaceholder: 'Paste test message or JSON context',
            testing: 'Testing...',
            runDryRun: 'Run dry run',
            noTestResult: 'Result appears after dry run.',
            rawWorkflow: 'Raw workflow JSON',
            rawWorkflowHelp: 'Fallback for complex workflows.',
            restrictions: 'Restrictions JSON',
            restrictionsHelp: 'Runtime restrictions.',
            variables: 'Variables JSON',
            variablesHelp: 'Agent variables and defaults.',
            dangerZone: 'Danger zone',
            dangerZoneHint: 'Deletion is irreversible. System agents cannot be deleted.',
            deleteAgent: 'Delete agent',
            unsavedChanges: 'Unsaved changes',
            allSaved: 'Saved',
            test: 'Test',
            saveDraft: 'Save draft',
            publish: 'Publish',
            saving: 'Saving...'
          }
    }
  },
  mounted () {
    this.reloadAll()
  },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' }
    },
    async reloadAll () {
      this.notice = ''
      await Promise.all([this.loadAgents(), this.loadPrompts(), this.loadWhatsappTemplates(), this.loadRuntimeOverview(), this.loadPublicKnowledge()])
    },
    async loadPublicKnowledge () {
      try {
        const response = await fetch('/api/admin/ai/public-knowledge', { headers: this.headers() })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось загрузить публичную информацию')
        this.safetyPolicyVersion = data.policyVersion || 'riderra-safety-v1'
        const versions = data.template?.versions || []
        const selected = versions.find(item => item.status === 'draft' || item.status === 'tested') || versions.find(item => item.status === 'published') || null
        this.publicKnowledgeText = selected?.content || ''
        this.publicKnowledgeVersionId = selected?.id || ''
        this.publicKnowledgeStatus = selected?.status || 'draft'
        this.publicKnowledgeChecks = selected?.checks || []
      } catch (error) {
        this.showNotice(error?.message || 'Не удалось загрузить публичную информацию', 'error')
      }
    },
    async saveKnowledgeDraft () {
      if (this.knowledgeSaving || !this.publicKnowledgeText.trim()) return
      this.knowledgeSaving = true
      try {
        const response = await fetch('/api/admin/ai/public-knowledge/drafts', { method: 'POST', headers: this.headers(), body: JSON.stringify({ content: this.publicKnowledgeText }) })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось сохранить черновик')
        this.publicKnowledgeVersionId = data.version.id
        this.publicKnowledgeStatus = 'draft'
        this.publicKnowledgeChecks = []
        this.showNotice(`Черновик версии ${data.version.version} сохранён. Теперь проверьте его.`)
      } catch (error) {
        this.showNotice(error?.message || 'Не удалось сохранить черновик', 'error')
      } finally { this.knowledgeSaving = false }
    },
    async testKnowledge () {
      if (!this.publicKnowledgeVersionId || this.knowledgeSaving) return
      this.knowledgeSaving = true
      try {
        const response = await fetch(`/api/admin/ai/public-knowledge/${this.publicKnowledgeVersionId}/test`, { method: 'POST', headers: this.headers(), body: '{}' })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Проверка не выполнена')
        this.publicKnowledgeStatus = data.version.status
        this.publicKnowledgeChecks = data.version.checks || []
        this.showNotice(data.passed ? 'Проверка пройдена. Версию можно публиковать.' : 'Исправьте отмеченные проблемы.', data.passed ? 'ok' : 'error')
      } catch (error) {
        this.showNotice(error?.message || 'Проверка не выполнена', 'error')
      } finally { this.knowledgeSaving = false }
    },
    async publishKnowledge () {
      if (!this.publicKnowledgeVersionId || this.publicKnowledgeStatus !== 'tested' || this.knowledgeSaving) return
      this.knowledgeSaving = true
      try {
        const response = await fetch(`/api/admin/ai/public-knowledge/${this.publicKnowledgeVersionId}/publish`, { method: 'POST', headers: this.headers(), body: '{}' })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось опубликовать')
        this.publicKnowledgeStatus = 'published'
        this.showNotice(`Публичная информация версии ${data.version.version} опубликована`)
      } catch (error) {
        this.showNotice(error?.message || 'Не удалось опубликовать', 'error')
      } finally { this.knowledgeSaving = false }
    },
    async loadAgents () {
      const res = await fetch('/api/admin/chats/agents', { headers: this.headers() })
      const data = await res.json()
      this.agents = data.rows || []
      if (this.selectedAgentId && !this.agents.some((a) => a.id === this.selectedAgentId)) this.startNewAgent()
      if (!this.selectedAgentId && !this.creatingNew && this.agents.length) {
        this.selectedAgentId = this.agents[0].id
        this.applyAgentSelection()
      }
    },
    selectAgent (id) {
      if (this.hasUnsavedChanges && !window.confirm('Есть несохранённые изменения. Переключиться без сохранения?')) return
      this.selectedAgentId = id
      this.creatingNew = false
      this.activeTab = 'overview'
      this.applyAgentSelection()
    },
    applyAgentSelection () {
      const selected = this.agents.find((a) => a.id === this.selectedAgentId)
      if (!selected) return this.startNewAgent()
      this.creatingNew = false
      this.agentForm = {
        name: selected.name || '',
        code: selected.code || '',
        type: selected.type || 'order_completion',
        description: selected.description || '',
        personality: selected.personality || '',
        identity: selected.identity || '',
        task: selected.task || '',
        speechStyle: selected.speechStyle || '',
        taskType: selected.taskType || 'clarification',
        promptText: selected.promptText || '',
        workflowJson: selected.workflow || selected.workflowJson || '',
        restrictionsJson: JSON.stringify(selected.restrictions || {}, null, 2),
        constraintsJson: JSON.stringify(selected.constraints || {}, null, 2),
        variablesJson: JSON.stringify(selected.variables || {}, null, 2),
        isActive: selected.isActive !== false,
        requiresApproval: true
      }
      this.hydrateWorkflowDraft()
      this.agentTestInput = ''
      this.agentTestOutput = ''
      this.sandboxSession = null
      this.sandboxMessages = []
      this.savedSnapshot = this.snapshotForm()
      this.loadAgentVersions()
    },
    startNewAgent () {
      if (this.hasUnsavedChanges && !window.confirm('Есть несохранённые изменения. Создать нового агента без сохранения?')) return
      this.selectedAgentId = ''
      this.creatingNew = true
      this.activeTab = 'overview'
      this.agentForm = emptyAgentForm()
      this.workflowDraft = workflowDraftDefaults()
      this.syncWorkflowDraft()
      this.agentTestInput = ''
      this.agentTestOutput = ''
      this.sandboxSession = null
      this.sandboxMessages = []
      this.savedSnapshot = this.snapshotForm()
    },
    snapshotForm () {
      return JSON.stringify({
        form: this.agentForm,
        workflow: this.workflowDraft
      })
    },
    showNotice (text, type = 'ok') {
      this.notice = text
      this.noticeType = type
      window.clearTimeout(this.noticeTimer)
      this.noticeTimer = window.setTimeout(() => {
        this.notice = ''
      }, 4500)
    },
    isAgentSystem (agent) {
      const code = String(agent?.code || '').trim().toLowerCase()
      return code === 'policy_guard' || code.startsWith('system_')
    },
    statusLabel (agent) {
      if (this.isAgentSystem(agent)) return this.t.system
      return agent.isActive !== false ? this.t.active : this.t.archive
    },
    statusClass (agent) {
      if (this.isAgentSystem(agent)) return 'status-pill--system'
      return agent.isActive !== false ? 'status-pill--active' : 'status-pill--archived'
    },
    agentDisplayName (agent) {
      const code = String(agent?.code || '').trim()
      const map = {
        dispatch_notify: 'Уведомление о назначении водителя',
        'dispatch-notify-v1': 'Уведомление о назначении водителя',
        order_completion: 'Уточнение данных заказа',
        'order-completion-v1': 'Уточнение данных заказа',
        driver_ops: 'Помощник по водителям',
        customer_support: 'Первичные обращения клиентов',
        policy_guard: 'Проверка правил безопасности'
      }
      return map[code] || agent?.name || this.t.untitledAgent
    },
    agentDescription (agent) {
      const code = String(agent?.code || '').trim()
      const type = String(agent?.type || '').trim()
      const map = {
        dispatch_notify: 'Готовит сообщение клиенту, когда поездка подтверждена и назначен водитель.',
        'dispatch-notify-v1': 'Готовит сообщение клиенту, когда поездка подтверждена и назначен водитель.',
        order_completion: 'Уточняет недостающие данные заказа: багаж, рейс, место подачи и важные детали.',
        'order-completion-v1': 'Уточняет недостающие данные заказа: багаж, рейс, место подачи и важные детали.',
        driver_ops: 'Помогает с операционными вопросами по водителям.',
        customer_support: 'Готовит ответы клиентам, которые написали первыми и ещё не связаны с заказом.',
        policy_guard: 'Проверяет, что AI-действия не нарушают правила безопасности.'
      }
      return map[code] || map[type] || agent?.description || this.t.noDescription
    },
    typeLabel (type) {
      const map = {
        order_completion: 'Уточнение заказа',
        dispatch_notify: 'Уведомление клиента',
        driver_ops: 'Операции с водителями',
        customer_support: 'Первичные обращения',
        policy_guard: 'Контроль правил'
      }
      return map[type] || type || '—'
    },
    taskTypeLabel (taskType) {
      const map = {
        clarification: 'Уточнить данные',
        dispatch_info: 'Сообщить детали поездки',
        driver_ops: 'Помочь с водителем'
        , inbound_inquiry: 'Ответить на новое обращение'
      }
      return map[taskType] || taskType || '—'
    },
    contourLabel (type) {
      const map = {
        order_completion: 'Клиентские операции',
        dispatch_notify: 'Диспетчеризация',
        driver_ops: 'Водители',
        customer_support: 'Клиентская поддержка',
        policy_guard: 'Безопасность'
      }
      return map[type] || type || '—'
    },
    formatDate (value) {
      if (!value) return '—'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
    },
    buildWorkflowFromJson () {
      const parsed = this.parseJsonMaybe(this.agentForm.workflowJson)
      if (!parsed) return workflowDraftDefaults()
      const rawStates = Array.isArray(parsed.states) ? parsed.states : (Array.isArray(parsed.steps) ? parsed.steps : [])
      const states = rawStates
        .map((state) => typeof state === 'string' ? state : (state?.name || state?.state || state?.key || ''))
        .map((state) => String(state || '').trim())
        .filter(Boolean)
      const rawTransitions = Array.isArray(parsed.transitions) ? parsed.transitions : []
      const transitions = rawTransitions.map((item) => ({
        from: String(item?.from || item?.source || '').trim(),
        to: String(item?.to || item?.target || '').trim(),
        label: String(item?.label || item?.event || item?.condition || '').trim()
      })).filter((item) => item.from || item.to)
      return {
        startState: String(parsed.startState || parsed.initial || states[0] || 'idle').trim(),
        finalStatesText: (Array.isArray(parsed.finalStates) ? parsed.finalStates : (parsed.finalState ? [parsed.finalState] : ['completed'])).join(', '),
        states: states.length ? states : workflowDraftDefaults().states,
        transitions: transitions.length ? transitions : workflowDraftDefaults().transitions
      }
    },
    hydrateWorkflowDraft () {
      this.workflowDraft = this.buildWorkflowFromJson()
    },
    normalizeWorkflowJson () {
      this.hydrateWorkflowDraft()
      this.syncWorkflowDraft()
    },
    syncWorkflowDraft () {
      const finalStates = this.csvToArray(this.workflowDraft.finalStatesText)
      const states = (this.workflowDraft.states || []).map((state) => String(state || '').trim()).filter(Boolean)
      const transitions = (this.workflowDraft.transitions || [])
        .map((transition) => ({
          from: String(transition.from || '').trim(),
          to: String(transition.to || '').trim(),
          label: String(transition.label || '').trim()
        }))
        .filter((transition) => transition.from || transition.to)
      this.agentForm.workflowJson = JSON.stringify({
        startState: String(this.workflowDraft.startState || '').trim() || states[0] || 'idle',
        finalStates: finalStates.length ? finalStates : ['completed'],
        states,
        transitions
      }, null, 2)
    },
    addWorkflowState () {
      this.workflowDraft.states.push('')
      this.syncWorkflowDraft()
    },
    removeWorkflowState (index) {
      this.workflowDraft.states.splice(index, 1)
      this.syncWorkflowDraft()
    },
    addWorkflowTransition () {
      this.workflowDraft.transitions.push({ from: '', to: '', label: '' })
      this.syncWorkflowDraft()
    },
    removeWorkflowTransition (index) {
      this.workflowDraft.transitions.splice(index, 1)
      this.syncWorkflowDraft()
    },
    buildPayload () {
      return {
        name: this.agentForm.name.trim(),
        code: this.agentForm.code.trim(),
        type: this.agentForm.type,
        description: this.agentForm.description.trim() || null,
        personality: this.agentForm.personality.trim() || null,
        identity: this.agentForm.identity.trim() || null,
        task: this.agentForm.task.trim() || null,
        speechStyle: this.agentForm.speechStyle.trim() || null,
        taskType: this.agentForm.taskType,
        promptText: this.agentForm.promptText.trim(),
        workflowJson: this.agentForm.workflowJson.trim() || null,
        restrictions: this.agentForm.restrictionsJson.trim() || null,
        constraintsJson: this.agentForm.constraintsJson.trim() || null,
        variables: this.agentForm.variablesJson.trim() || null,
        isActive: this.agentForm.isActive,
        requiresApproval: true
      }
    },
    async saveAgent (mode = 'draft') {
      if (this.agentSaving || this.isSystemAgent) return
      this.agentSaving = true
      try {
        const creating = !this.selectedAgentId
        const payload = this.buildPayload()
        if (mode === 'publish') payload.isActive = true
        const method = this.selectedAgentId ? 'PUT' : 'POST'
        const url = this.selectedAgentId ? `/api/admin/chats/agents/${this.selectedAgentId}` : '/api/admin/chats/agents'
        const res = await fetch(url, { method, headers: this.headers(), body: JSON.stringify(payload) })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Не удалось сохранить агента')
        if (!this.selectedAgentId && data?.agent?.id) this.selectedAgentId = data.agent.id
        this.creatingNew = false
        await this.loadAgents()
        this.applyAgentSelection()
        if (this.selectedAgentId) await this.createDraftVersion(true)
        this.showNotice(creating ? 'Агент создан. Теперь проверьте его в песочнице.' : 'Черновик сохранён новой версией')
      } catch (error) {
        this.showNotice(error?.message || 'Ошибка сохранения агента', 'error')
      } finally {
        this.agentSaving = false
      }
    },
    async publishAgent () {
      const tested = this.agentVersions.find((item) => item.status === 'tested')
      if (!tested) {
        this.activeTab = 'versions'
        this.showNotice('Перед публикацией запустите обязательные тесты', 'error')
        return
      }
      await this.publishVersion(tested)
    },
    async deleteAgent () {
      if (!this.selectedAgentId || this.isSystemAgent) return
      if (!window.confirm('Удалить агента? Это действие нельзя отменить.')) return
      const res = await fetch(`/api/admin/chats/agents/${this.selectedAgentId}`, {
        method: 'DELETE',
        headers: this.headers()
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        this.showNotice(data?.error || 'Не удалось удалить агента', 'error')
        return
      }
      this.showNotice('Агент удалён')
      this.selectedAgentId = ''
      this.agentForm = emptyAgentForm()
      this.savedSnapshot = this.snapshotForm()
      await this.loadAgents()
    },
    async runAgentTest () {
      this.activeTab = 'test'
      if (!this.sandboxSession) await this.startSandbox()
    },
    async loadRuntimeOverview () {
      try {
        const [healthResponse, activityResponse] = await Promise.all([
          fetch('/api/admin/ai/runtime-health', { headers: this.headers() }),
          fetch('/api/admin/ai/activity', { headers: this.headers() })
        ])
        if (healthResponse.ok) this.runtimeHealth = await healthResponse.json()
        if (activityResponse.ok) this.activity = await activityResponse.json()
      } catch (_) {}
    },
    async loadAgentVersions () {
      if (!this.selectedAgentId) {
        this.agentVersions = []
        return
      }
      try {
        const response = await fetch(`/api/admin/ai-agents/${this.selectedAgentId}/versions`, { headers: this.headers() })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось загрузить версии')
        this.agentVersions = data.rows || []
      } catch (error) {
        this.showNotice(error?.message || 'Не удалось загрузить версии', 'error')
      }
    },
    async createDraftVersion (silent = false) {
      if (!this.selectedAgentId || this.versionActionLoading) return
      this.versionActionLoading = true
      try {
        const response = await fetch(`/api/admin/ai-agents/${this.selectedAgentId}/versions/draft`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ snapshot: { ...this.agentForm, workflow: this.agentForm.workflowJson } })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось создать версию')
        await this.loadAgentVersions()
        if (!silent) this.showNotice(`Создана версия ${data.version.version}. Запустите обязательные тесты.`)
      } catch (error) {
        this.showNotice(error?.message || 'Не удалось создать версию', 'error')
      } finally {
        this.versionActionLoading = false
      }
    },
    async testVersion (version) {
      this.versionActionLoading = true
      try {
        const response = await fetch(`/api/admin/ai-agents/${this.selectedAgentId}/versions/${version.id}/test-suite`, { method: 'POST', headers: this.headers(), body: '{}' })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Тесты не выполнены')
        await this.loadAgentVersions()
        this.showNotice(data.summary?.passed ? 'Все обязательные сценарии пройдены' : 'Есть ошибки в обязательных сценариях', data.summary?.passed ? 'ok' : 'error')
      } catch (error) {
        this.showNotice(error?.message || 'Тесты не выполнены', 'error')
      } finally {
        this.versionActionLoading = false
      }
    },
    async publishVersion (version) {
      this.versionActionLoading = true
      try {
        const response = await fetch(`/api/admin/ai-agents/${this.selectedAgentId}/versions/${version.id}/publish`, { method: 'POST', headers: this.headers(), body: '{}' })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось опубликовать')
        await Promise.all([this.loadAgentVersions(), this.loadRuntimeOverview()])
        this.showNotice(`Версия ${data.version.version} опубликована`)
      } catch (error) {
        this.showNotice(error?.message || 'Не удалось опубликовать', 'error')
      } finally {
        this.versionActionLoading = false
      }
    },
    async startSandbox () {
      if (!this.selectedAgentId || this.agentTesting) return
      this.agentTesting = true
      try {
        const response = await fetch(`/api/admin/ai-agents/${this.selectedAgentId}/sandbox/sessions`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ scenarioKey: this.sandboxScenario })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось начать тест')
        this.sandboxSession = data.session
        this.sandboxContext = data.context || {}
        this.sandboxMessages = []
        this.sandboxSuggestedMessage = data.context?.suggestedCustomerMessage || ''
        this.agentTestInput = this.sandboxSuggestedMessage
      } catch (error) {
        this.showNotice(error?.message || 'Не удалось начать тест', 'error')
      } finally {
        this.agentTesting = false
      }
    },
    async sendSandboxMessage () {
      if (!this.sandboxSession || !this.agentTestInput.trim() || this.agentTesting) return
      this.agentTesting = true
      const text = this.agentTestInput.trim()
      try {
        const response = await fetch(`/api/admin/ai-agents/${this.selectedAgentId}/sandbox/sessions/${this.sandboxSession.id}/messages`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ message: text })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Агент не обработал реплику')
        const decorate = (message) => ({ ...message, extraction: data.decision?.extraction || null, trace: data.trace || null })
        this.sandboxMessages.push(decorate(data.customerMessage), decorate(data.agentMessage))
        this.agentTestInput = ''
        this.sandboxSession = { ...this.sandboxSession, currentState: data.stateAfter }
        await this.loadRuntimeOverview()
      } catch (error) {
        this.showNotice(error?.message || 'Агент не обработал реплику', 'error')
      } finally {
        this.agentTesting = false
      }
    },
    stateHuman (state) {
      const map = { waiting_customer: 'Ждёт клиента', waiting_approval: 'Ждёт одобрения', needs_human: 'Нужна помощь сотрудника', completed: 'Завершено' }
      return map[state] || state || '—'
    },
    extractionHuman (extraction) {
      const field = extraction.field || extraction.field_name || 'данные'
      const value = extraction.value ?? extraction.normalized_value ?? extraction.normalizedValue
      return `${field} = ${value}`
    },
    versionStatusLabel (status) {
      return ({ draft: 'Черновик', tested: 'Проверена', published: 'Опубликована', archived: 'Архив' })[status] || status
    },
    passedChecksLabel (summary) {
      const checks = summary?.checks || []
      return checks.length ? `${checks.filter((item) => item.passed).length} из ${checks.length} тестов` : (summary?.passed ? 'Проверена' : '')
    },
    capabilityHuman (capability) {
      return ({ 'riderra.customer.message.compose': 'Готовит сообщение', 'riderra.customer.reply.classify': 'Разбирает ответ', 'riderra.order.field.extract_validate': 'Извлекает данные' })[capability] || capability
    },
    runStatusLabel (status) {
      return ({ queued: 'В очереди', running: 'Работает', waiting_approval: 'Ждёт одобрения', completed: 'Завершено', failed: 'Ошибка', fallback: 'Резервный режим' })[status] || status
    },
    formatLatency (value) {
      const ms = Number(value || 0)
      if (!ms) return '—'
      return ms < 1000 ? `${ms} мс` : `${(ms / 1000).toFixed(1)} с`
    },
    parseJsonMaybe (value) {
      try {
        return value ? JSON.parse(value) : null
      } catch (_) {
        return null
      }
    },
    applyAgentPreset (kind) {
      if (kind === 'clarification') {
        this.agentForm.type = 'order_completion'
        this.agentForm.taskType = 'clarification'
        this.agentForm.requiresApproval = true
        this.agentForm.identity = 'Riderra customer communication assistant. Human-approved drafts only.'
        this.agentForm.task = 'Politely ask only for missing booking details.'
        this.agentForm.speechStyle = 'Short, clear, calm, businesslike.'
        this.agentForm.promptText = [
          'You are Riderra customer communication assistant.',
          'Default customer-facing language is English unless order.lang is explicitly ru.',
          'Task: politely and briefly ask only for the missing booking details.',
          'Ask for 1-2 critical fields per message.',
          'Do not invent facts. If context is missing, ask a clarification.',
          'Every outbound message must remain Draft -> Approval -> Execute.'
        ].join('\n')
      } else {
        this.agentForm.type = 'dispatch_notify'
        this.agentForm.taskType = 'dispatch_info'
        this.agentForm.requiresApproval = true
        this.agentForm.identity = 'Riderra trip notification assistant.'
        this.agentForm.task = 'Send confirmed trip details to the customer.'
        this.agentForm.speechStyle = 'Short, clear, businesslike, no pressure.'
        this.agentForm.promptText = [
          'You are Riderra customer communication assistant.',
          'Default customer-facing language is English unless order.lang is explicitly ru.',
          'Task: send confirmed trip details to the customer.',
          'Include route, date/time, driver contact if available, and useful instructions.',
          'Tone: short, clear, businesslike, no pressure.',
          'Every outbound message must remain Draft -> Approval -> Execute.'
        ].join('\n')
      }
    },
    async loadPrompts () {
      try {
        const res = await fetch('/api/admin/prompts', { headers: this.headers() })
        const data = await res.json()
        this.promptTemplates = data.prompts || []
        this.applyPromptSelection()
      } catch (_) {}
    },
    openPromptRegistry () {
      this.activeTab = 'advanced'
      this.showPromptRegistry = true
    },
    applyPromptSelection () {
      const key = this.selectedPromptKey
      const row = (this.promptTemplates || []).find((x) => x.key === key)
      this.selectedPromptVersionLabel = row ? `v${row.prompt_version || 1}` : 'new'
      this.promptText = row?.content || ''
      this.promptDescription = row?.description || ''
    },
    async savePromptTemplate () {
      if (!this.selectedPromptKey || this.promptSaving) return
      this.promptSaving = true
      try {
        const response = await fetch(`/api/admin/prompts/${encodeURIComponent(this.selectedPromptKey)}`, {
          method: 'PUT',
          headers: this.headers(),
          body: JSON.stringify({ content: this.promptText || '', description: this.promptDescription || null })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось сохранить prompt')
        this.showNotice(`Prompt ${this.selectedPromptKey} сохранен, версия v${data.prompt_version || '?'}`)
        await this.loadPrompts()
      } catch (error) {
        this.showNotice(error?.message || 'Ошибка сохранения prompt', 'error')
      } finally {
        this.promptSaving = false
      }
    },
    csvToArray (value) {
      return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    },
    templateForUi (template = {}) {
      return {
        name: template.name || '',
        label: template.label || template.name || '',
        description: template.description || '',
        languagesText: Array.isArray(template.languages)
          ? template.languages.join(', ')
          : (template.language || ''),
        variablesText: Array.isArray(template.variables) ? template.variables.join(', ') : '',
        status: template.status || 'approved'
      }
    },
    async loadWhatsappTemplates () {
      try {
        const response = await fetch('/api/admin/chats/whatsapp-templates', { headers: this.headers() })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Failed to load WhatsApp templates')
        this.whatsappTemplates = (data.templates || []).map(this.templateForUi)
      } catch (error) {
        this.templateNotice = error?.message || 'WhatsApp templates load failed'
      }
    },
    addWhatsappTemplate () {
      this.whatsappTemplates.push(this.templateForUi({
        name: '',
        languages: ['en'],
        variables: ['booking_number', 'route_from', 'route_to']
      }))
    },
    removeWhatsappTemplate (index) {
      this.whatsappTemplates.splice(index, 1)
    },
    async saveWhatsappTemplates () {
      if (this.templateSaving) return
      this.templateSaving = true
      this.templateNotice = ''
      try {
        const templates = this.whatsappTemplates
          .map((template) => ({
            name: String(template.name || '').trim(),
            label: String(template.label || template.name || '').trim(),
            description: String(template.description || '').trim(),
            languages: this.csvToArray(template.languagesText),
            variables: this.csvToArray(template.variablesText)
          }))
          .filter((template) => template.name)
        const response = await fetch('/api/admin/chats/whatsapp-templates', {
          method: 'PUT',
          headers: this.headers(),
          body: JSON.stringify({ templates })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось сохранить WhatsApp templates')
        this.whatsappTemplates = (data.templates || templates).map(this.templateForUi)
        this.templateNotice = `Saved v${data.prompt_version || '?'}`
        this.showNotice('Templates сохранены')
        await this.loadPrompts()
      } catch (error) {
        this.templateNotice = error?.message || 'Ошибка сохранения WhatsApp templates'
        this.showNotice(this.templateNotice, 'error')
      } finally {
        this.templateSaving = false
      }
    }
  }
}
</script>

<style scoped>
.agent-section { position: relative; }
.page-head { display:flex; justify-content:space-between; align-items:flex-start; gap:18px; margin-bottom:18px; }
.page-subtitle { margin:6px 0 0; max-width:820px; color:#60708f; font-size:15px; line-height:1.55; }
.eyebrow { margin:0 0 8px; color:#7a2f8f; font-size:12px; font-weight:900; letter-spacing:.12em; text-transform:uppercase; }
.status-summary { min-width:132px; padding:14px 18px; border:1px solid #d8e0ee; border-radius: 8px; background:rgba(255,255,255,.94); text-align:right; }
.status-summary strong { display:block; color:#17233f; font-size:28px; line-height:1; }
.status-summary span, .muted { color:#64748b; }
.toast { position:sticky; top:14px; z-index:80; margin-bottom:14px; border:1px solid #bbf7d0; background:#f0fdf4; color:#166534; border-radius: 8px; padding:12px 14px; font-weight:800; }
.toast--error { border-color:#fecaca; background:#fef2f2; color:#991b1b; }
.agent-console { display:grid; grid-template-columns:minmax(280px,340px) minmax(0,1fr); gap:18px; align-items:start; }
.agent-list-panel, .summary-card, .settings-card, .empty--hero { background:rgba(255,255,255,.97); border:1px solid #d8e0ee; border-radius: 8px; box-shadow:0 20px 50px rgba(16,24,40,.07); }
.agent-list-panel { display:grid; gap:12px; padding:16px; position:sticky; top:14px; max-height:calc(100vh - 28px); overflow:auto; }
.panel-head, .workflow-header, .workflow-section__head { display:flex; justify-content:space-between; gap:14px; align-items:flex-start; }
.panel-head h3, .workflow-header h3, .workflow-section h4 { margin:0; color:#17233f; }
.panel-head p, .workflow-header p, .registry-callout p, .danger-zone p { margin:4px 0 0; color:#64748b; line-height:1.45; }
.icon-action { width:40px; height:40px; border:1px solid #d8e0ee; border-radius: 8px; background:#fff; color:#17233f; cursor:pointer; font-size:24px; font-weight:800; }
.agent-filters { display:grid; gap:8px; }
.agent-list-item { display:grid; gap:7px; width:100%; border:1px solid #d8e0ee; border-radius: 8px; background:#fff; padding:13px 14px; text-align:left; cursor:pointer; }
.agent-list-item--active { border-color:#2b6eff; box-shadow:0 10px 24px rgba(43,110,255,.13); }
.agent-list-item__title { color:#17233f; font-weight:900; }
.agent-list-item__meta, .agent-list-item__description { color:#64748b; font-size:12px; line-height:1.35; }
.agent-list-item__line { display:flex; flex-wrap:wrap; align-items:center; gap:8px; color:#41516f; font-size:12px; font-weight:800; }
.agent-workspace { display:grid; gap:14px; min-width:0; }
.summary-card { display:grid; grid-template-columns:minmax(0,1fr) minmax(260px,340px); gap:20px; padding:22px; }
.summary-card h2 { margin:0; color:#17233f; font-size:28px; line-height:1.12; }
.summary-card p { margin:8px 0 0; color:#64748b; line-height:1.5; }
.summary-card__title-row, .summary-meta, .summary-toggles, .summary-audit, .local-actions, .preset-row, .action-bar__buttons { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
.summary-meta { margin-top:14px; color:#64748b; }
.summary-meta strong { color:#17233f; }
.summary-toggles { align-content:start; align-items:stretch; flex-direction:column; }
.summary-audit { flex-direction:column; align-items:flex-start; color:#64748b; font-size:12px; }
.settings-tabs { display:flex; gap:8px; overflow-x:auto; padding:2px; }
.settings-tab { border:1px solid #d8e0ee; border-radius:999px; background:#fff; color:#334155; cursor:pointer; font-weight:900; padding:10px 14px; white-space:nowrap; }
.settings-tab--active { background:#18244a; border-color:#18244a; color:#fff; }
.settings-card { padding:20px; }
.form-grid, .workflow-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
.form-grid__wide { grid-column:1 / -1; }
.inline-grid { display:grid; grid-template-columns:minmax(0,1fr) 84px; gap:8px; }
.field-control { display:grid; gap:6px; align-content:start; }
.field-control__label { color:#17233f; font-weight:900; }
.field-control__helper { color:#64748b; font-size:12px; line-height:1.35; }
.input, .textarea { width:100%; box-sizing:border-box; border:1px solid #d8e0ee; border-radius: 8px; background:#fff; color:#17233f; padding:12px 14px; }
.input:focus, .textarea:focus { outline:none; border-color:#2b6eff; box-shadow:0 0 0 3px rgba(43,110,255,.12); }
.input:disabled, .textarea:disabled { background:#f8fafc; color:#64748b; }
.textarea { min-height:150px; resize:vertical; }
.textarea--small { min-height:86px; }
.textarea--code, .test-output { font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; }
.test-result { border:1px solid #dbe4f2; border-radius: 8px; padding:16px; background:#f8fbff; }
.test-result__head { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:10px; }
.test-result__message { margin:0 0 12px; color:#263b63; line-height:1.55; white-space:pre-wrap; }
.test-result summary { cursor:pointer; color:#60708f; font-weight:700; }
.test-result .test-output { margin-top:12px; max-height:280px; overflow:auto; }
.toggle-grid { display:flex; flex-wrap:wrap; gap:12px; }
.switch { display:inline-flex; align-items:center; gap:8px; border:1px solid #d8e0ee; border-radius: 8px; background:#f8fafc; color:#17233f; font-weight:900; padding:12px 14px; }
.workflow-editor, .templates-panel, .test-panel, .advanced-panel, .knowledge-panel { display:grid; gap:18px; }
.safety-callout { display:grid; gap:5px; border:1px solid #bfdbfe; border-radius: 8px; background:#eff6ff; color:#1e3a8a; padding:14px 16px; }
.safety-callout span { color:#475569; line-height:1.45; }
.knowledge-checks { display:flex; flex-wrap:wrap; gap:8px; }
.knowledge-checks span { border-radius:999px; padding:7px 10px; font-size:12px; font-weight:800; }
.check--ok { background:#ecfdf5; color:#166534; }
.check--error { background:#fef2f2; color:#991b1b; }
.runtime-overview { display:grid; gap:16px; border:1px solid #d8e0ee; border-radius: 8px; padding:16px; background:#f8fafc; }
.runtime-status { display:flex; align-items:center; gap:12px; }
.runtime-status p, .versions-head p, .sandbox-head p { margin:4px 0 0; color:#64748b; }
.runtime-dot { flex:0 0 auto; width:10px; height:10px; border-radius:50%; background:#f59e0b; box-shadow:0 0 0 4px rgba(245,158,11,.12); }
.runtime-dot--live { background:#22c55e; box-shadow:0 0 0 4px rgba(34,197,94,.13); animation:runtime-pulse 1.4s ease-in-out infinite; }
@keyframes runtime-pulse { 50% { transform:scale(1.2); opacity:.7; } }
.activity-metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
.activity-metrics div { display:grid; gap:4px; border:1px solid #e2e8f0; border-radius: 8px; padding:12px; background:#fff; }
.activity-metrics strong { color:#17233f; font-size:20px; }
.activity-metrics span { color:#64748b; font-size:12px; }
.scenario-map { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
.scenario-step { position:relative; display:flex; align-items:center; gap:8px; min-height:48px; border:1px solid #d8e0ee; border-radius: 8px; padding:10px; color:#17233f; font-size:13px; font-weight:800; }
.scenario-step__number { display:grid; place-items:center; width:24px; height:24px; flex:0 0 24px; border-radius:50%; background:#18244a; color:#fff; font-size:11px; }
.scenario-branches { display:flex; flex-wrap:wrap; gap:8px; }
.scenario-branches span { border:1px solid #fecaca; border-radius:999px; background:#fff7f7; color:#991b1b; padding:8px 11px; font-size:12px; font-weight:800; }
.scenario-note { margin:0; color:#64748b; font-size:13px; }
.sandbox-head, .versions-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
.sandbox-head h3, .versions-head h3 { margin:0; }
.sandbox-start { display:flex; gap:8px; min-width:390px; }
.sandbox-shell { display:grid; gap:12px; border:1px solid #d8e0ee; border-radius: 8px; padding:14px; background:#f8fafc; }
.sandbox-context { display:flex; flex-wrap:wrap; align-items:center; gap:8px; color:#475569; font-size:12px; font-weight:800; }
.sandbox-transcript { display:grid; gap:10px; max-height:480px; overflow:auto; padding:4px; }
.sandbox-message { width:min(78%,680px); border:1px solid #d8e0ee; border-radius: 8px; padding:12px 14px; background:#fff; }
.sandbox-message--customer { justify-self:end; background:#eef4ff; border-color:#bfdbfe; }
.sandbox-message--agent { justify-self:start; }
.sandbox-message > span { color:#64748b; font-size:11px; font-weight:900; text-transform:uppercase; }
.sandbox-message p { margin:5px 0 0; color:#17233f; line-height:1.45; white-space:pre-wrap; }
.sandbox-decision { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; padding-top:9px; border-top:1px solid #e2e8f0; }
.sandbox-decision span { border-radius:999px; background:#f1f5f9; color:#475569; padding:5px 8px; font-size:11px; font-weight:800; }
.sandbox-composer { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:end; }
.sandbox-composer .textarea { min-height:76px; }
.versions-panel { display:grid; gap:16px; }
.version-list, .run-list { display:grid; gap:8px; }
.version-row { display:grid; grid-template-columns:minmax(150px,1fr) 150px auto minmax(110px,auto); gap:12px; align-items:center; border:1px solid #e2e8f0; border-radius: 8px; padding:12px; }
.version-row > div, .run-row > div { display:grid; gap:3px; }
.version-row span, .run-row span, .run-row time { color:#64748b; font-size:12px; }
.version-result { justify-self:end; }
.run-row { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:10px; align-items:center; border-bottom:1px solid #e2e8f0; padding:10px 2px; }
.workflow-section { display:grid; gap:10px; border:1px solid #e6ebf5; border-radius: 8px; padding:14px; background:#f8fafc; }
.state-list, .transition-list { display:grid; gap:8px; }
.state-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; }
.transition-row { display:grid; grid-template-columns:minmax(120px,1fr) auto minmax(120px,1fr) minmax(120px,1fr) auto; gap:8px; align-items:center; }
.template-table { display:grid; gap:8px; }
.template-row { display:grid; grid-template-columns:minmax(170px,1fr) minmax(120px,180px) minmax(240px,1.4fr) 94px auto; gap:10px; align-items:center; }
.template-row--head { color:#64748b; font-size:12px; font-weight:900; letter-spacing:.04em; text-transform:uppercase; }
.chip-editor { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
.chip-editor .input { min-width:180px; flex:1 1 180px; }
.state-chip, .status-pill { display:inline-flex; align-items:center; border-radius:999px; font-size:12px; font-weight:900; padding:7px 10px; }
.state-chip { background:#fff; border:1px solid #d8e0ee; color:#22304f; }
.status-pill--active { background:#ecfdf3; color:#166534; }
.status-pill--archived { background:#f8fafc; color:#475569; }
.status-pill--system { background:#fdf2f8; color:#9d174d; }
.registry-callout, .danger-zone { border:1px solid #e6ebf5; border-radius: 8px; padding:16px; background:#f8fafc; }
.registry-callout { display:flex; justify-content:space-between; gap:14px; align-items:center; }
.agent-grid--registry { display:grid; grid-template-columns:280px 120px minmax(0,1fr); gap:10px; }
.danger-zone { border-color:#fecaca; background:#fff7f7; }
.danger-zone summary { color:#991b1b; cursor:pointer; font-weight:900; }
.test-output { margin:0; max-height:420px; overflow:auto; border-radius: 8px; background:#0f172a; color:#e2e8f0; padding:14px; white-space:pre-wrap; }
.action-bar { position:sticky; bottom:14px; z-index:70; display:flex; justify-content:space-between; align-items:center; gap:12px; border:1px solid #d8e0ee; border-radius: 8px; background:rgba(255,255,255,.96); box-shadow:0 18px 45px rgba(16,24,40,.16); padding:12px 14px; }
.dirty-indicator { color:#166534; font-weight:900; }
.dirty-indicator--active { color:#b45309; }
.btn { border:1px solid transparent; border-radius: 8px; padding:12px 18px; cursor:pointer; font-weight:900; background:#eef2ff; color:#1f3b70; }
.btn:disabled { cursor:not-allowed; opacity:.55; }
.btn--primary { background:#1f4fff; color:#fff; }
.btn--ghost { background:#fff; border-color:#d8e0ee; }
.btn--danger { background:#b42318; color:#fff; }
.btn--tiny { padding:7px 10px; border-radius:999px; font-size:12px; }
.empty { color:#64748b; padding:16px; }
.empty--hero { display:grid; place-items:start; gap:8px; padding:28px; }
.empty--hero h3 { margin:0; color:#17233f; }
.empty--hero p, .empty--inline { margin:0; color:#64748b; }
@media (max-width: 1100px) {
  .agent-console, .summary-card { grid-template-columns:1fr; }
  .agent-list-panel { position:relative; top:0; max-height:none; }
}
@media (max-width: 760px) {
  .page-head, .action-bar, .registry-callout { flex-direction:column; align-items:stretch; }
  .form-grid, .workflow-grid, .transition-row, .template-row, .agent-grid--registry { grid-template-columns:1fr; }
  .inline-grid { grid-template-columns:1fr; }
  .activity-metrics, .scenario-map { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .sandbox-head, .versions-head { flex-direction:column; }
  .sandbox-start, .sandbox-composer { width:100%; min-width:0; grid-template-columns:1fr; display:grid; }
  .sandbox-message { width:92%; }
  .version-row { grid-template-columns:1fr; align-items:start; }
  .version-result { justify-self:start; }
}
</style>
