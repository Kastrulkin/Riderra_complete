<template>
  <div class="admin-chat-page">
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf chat-section">
      <div class="container">
        <admin-tabs :sticky="false" />

        <div class="chat-mode-switch" aria-label="Режим чатов">
          <button class="btn" :class="inboxMode ? 'btn--primary' : 'btn--ghost'" type="button" @click="openInboxMode">Обращения клиентов</button>
          <button class="btn" :class="!inboxMode ? 'btn--primary' : 'btn--ghost'" type="button" @click="openOperationsMode">Диалоги по заказам</button>
          <button class="btn btn--ghost chat-mode-switch__sandbox" type="button" @click="sandboxOpen = !sandboxOpen">{{ sandboxOpen ? 'Закрыть песочницу' : 'Проверить AI-агента' }}</button>
        </div>

        <agent-sandbox-panel v-if="sandboxOpen" class="chat-sandbox" @start-whatsapp="openWhatsAppConversation" />

        <inquiry-inbox v-if="inboxMode" ref="inquiryInbox" @open-order-chats="openOperationsMode" />
        <template v-else>

        <header class="page-head">
          <div>
            <h1>Очередь диалогов</h1>
            <p class="page-subtitle">Задачи, которые требуют реакции, проверки черновика или отправки</p>
          </div>
          <div class="page-actions">
            <button class="btn btn--ghost" @click="syncFromOrders">Синхронизировать</button>
            <button class="btn btn--primary" @click="reloadAll">Обновить</button>
          </div>
        </header>
        <div v-if="notice" class="hint">{{ notice }}</div>

        <div class="filters">
          <select v-model="ownerFilter" class="input">
            <option value="">Все ответственные</option>
            <option value="__mine">Моё</option>
            <option value="__unassigned">Без владельца</option>
            <option v-for="owner in owners" :key="owner.id" :value="owner.id">
              {{ owner.email || owner.id }}
            </option>
          </select>
          <select v-model="uiState" class="input">
            <option value="">Все статусы</option>
            <option v-for="s in uiStateOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
          <label class="quick-filter"><input type="checkbox" v-model="urgentOnly" /> Только срочные</label>
          <select v-model="sortMode" class="input">
            <option value="priority">Приоритет (SLA + важность)</option>
            <option value="updated_desc">Сначала новые</option>
            <option value="updated_asc">Сначала старые</option>
          </select>
        </div>

        <details class="advanced-filters">
          <summary>Дополнительно</summary>
          <div class="advanced-filters__grid">
            <select v-model="taskType" class="input" @change="loadTasks">
              <option value="">Все типы</option>
              <option value="clarification">Уточнение</option>
              <option value="dispatch_info">Рассылка</option>
            </select>
            <select v-model="agentFilter" class="input" @change="loadTasks">
              <option value="">Все агенты</option>
              <option value="none">Без агента</option>
              <option v-for="agent in agents" :key="agent.id" :value="agent.id">
                {{ agent.name }} ({{ agent.code }})
              </option>
            </select>
            <select v-model="state" class="input" @change="loadTasks">
              <option value="">Точный backend статус</option>
              <option v-for="s in availableStates" :key="s" :value="s">{{ stateLabel(s) }} · {{ s }}</option>
            </select>
            <label class="quick-filter"><input type="checkbox" v-model="myOnly" /> Только мои</label>
            <button class="btn btn--ghost" @click="$router.push('/admin-agents')">К AI агентам</button>
          </div>
        </details>

        <div class="workspace">
          <aside class="queue">
            <div class="queue-head">
              <span>Очередь ({{ displayedTasks.length }})</span>
              <span class="queue-head-meta">автообновление: 20с</span>
            </div>
            <div v-if="selectedTaskIds.length" class="queue-bulk">
              <span class="queue-bulk__count">Выбрано: {{ selectedTaskIds.length }}</span>
              <button class="btn btn--tiny" type="button" @click="selectAllDisplayed">Выбрать все</button>
              <button class="btn btn--tiny" type="button" @click="clearSelection">Снять выбор</button>
              <button class="btn btn--tiny" type="button" :disabled="!selectedTaskIds.length || bulkLoading" @click="bulkAssignToMe">
                {{ bulkLoading ? '...' : 'Назначить на себя' }}
              </button>
              <button class="btn btn--tiny" type="button" :disabled="!selectedTaskIds.length || bulkLoading" @click="bulkMoveToHandoff">
                {{ bulkLoading ? '...' : 'Передать человеку' }}
              </button>
            </div>
            <button
              v-for="task in displayedTasks"
              :key="task.id"
              class="queue-item"
              :class="{ 'queue-item--active': selectedTask && selectedTask.id === task.id }"
              @click="openTask(task.id)"
            >
              <label class="queue-check" @click.stop>
                <input
                  type="checkbox"
                  :checked="isTaskSelected(task.id)"
                  @click.stop
                  @change="toggleTaskSelection(task.id, $event.target.checked)"
                />
                <span>выбрать</span>
              </label>
              <div class="queue-title-row">
                <span class="badge">{{ taskTypeLabel(task.taskType) }}</span>
                <span class="badge" :class="slaBadgeClass(task)">{{ slaLabel(task) }}</span>
              </div>
              <div class="queue-route">{{ routeLabel(task.order) }}</div>
              <div class="queue-status">{{ stateLabel(task.state) }}</div>
              <div class="queue-meta">
                <span class="badge badge--state">{{ stateLabel(task.state) }}</span>
                <span class="badge" :class="{ 'badge--mine': isTaskMine(task) }">{{ ownerDisplayLabel(task) }}</span>
                <span class="badge">{{ messageCountLabel(task) }}</span>
              </div>
              <div class="queue-card-action">
                <button
                  class="btn btn--small"
                  :class="{ 'btn--primary': !cardActionDisabled(task) }"
                  type="button"
                  :disabled="cardActionDisabled(task)"
                  @click.stop="runCardAction(task)"
                >
                  {{ cardActionLabel(task) }}
                </button>
              </div>
            </button>
            <div v-if="!displayedTasks.length" class="empty empty--queue">Нет задач, требующих реакции</div>
          </aside>

          <main class="detail-pane">
            <div v-if="!selectedTask" class="empty empty--center">Выберите задачу в очереди</div>
            <template v-else>
              <div class="dialog">
                <div class="dialog-head">
                  <div>
                    <h3>{{ routeLabel(selectedTask.order) }}</h3>
                    <div class="hint">{{ taskTypeLabel(selectedTask.taskType) }} · {{ formatMoney(selectedTask.order && selectedTask.order.clientPrice) }}</div>
                    <div class="dialog-status-row">
                      <span class="badge badge--state">{{ stateLabel(selectedTask.state) }}</span>
                      <span class="badge" :class="slaBadgeClass(selectedTask)">{{ slaLabel(selectedTask) }}</span>
                      <span class="badge">Ответственный: {{ ownerDisplayLabel(selectedTask) }}</span>
                    </div>
                  </div>
                  <div class="dialog-head-actions">
                    <span class="badge" :class="selectedTask.agentPaused ? 'badge--sla-warning' : 'badge--sla-ok'">
                      {{ agentStatusLabel(selectedTask) }}
                    </span>
                    <button class="btn btn--small" @click="toggleConversationAgent(selectedTask)">
                      {{ agentToggleLabel(selectedTask) }}
                    </button>
                  </div>
                </div>

                <section class="agent-progress" aria-label="Прогресс агента">
                  <div class="agent-progress__head">
                    <div>
                      <strong>{{ latestAgentActivity(selectedTask).title }}</strong>
                      <span>{{ latestAgentActivity(selectedTask).detail }}</span>
                    </div>
                    <span v-if="latestAgentActivity(selectedTask).live" class="agent-live">Работает сейчас</span>
                  </div>
                  <div class="agent-progress__steps">
                    <div
                      v-for="(step, index) in agentProgressSteps(selectedTask)"
                      :key="step.key"
                      class="agent-progress__step"
                      :class="{ 'agent-progress__step--done': step.done, 'agent-progress__step--current': step.current }"
                    >
                      <span>{{ index + 1 }}</span>
                      <small>{{ step.label }}</small>
                    </div>
                  </div>
                </section>

                <section class="recipient-card">
                  <div class="recipient-card__head">
                    <div>
                      <h4>Получатель</h4>
                      <p class="hint">Кому уйдёт сообщение из этой задачи</p>
                    </div>
                    <div class="recipient-card__badges">
                      <span class="badge">{{ recipientChannel === 'whatsapp' ? 'WhatsApp' : 'Telegram' }}</span>
                      <span v-if="recipientTest" class="badge badge--sla-warning">Тест</span>
                    </div>
                  </div>
                  <div class="recipient-card__grid">
                    <label>
                      <span>Канал</span>
                      <select v-model="recipientChannel" class="input">
                        <option value="whatsapp">WhatsApp</option>
                        <option value="telegram">Telegram</option>
                      </select>
                    </label>
                    <label>
                      <span>Номер в формате E.164</span>
                      <input v-model.trim="recipientPhone" class="input" inputmode="tel" placeholder="+79214224843">
                    </label>
                    <label class="recipient-test-toggle">
                      <input v-model="recipientTest" type="checkbox">
                      <span>Тестовый получатель</span>
                    </label>
                    <button class="btn btn--primary" :disabled="recipientSaving || !recipientValid" @click="saveRecipient">
                      {{ recipientSaving ? 'Сохраняю...' : 'Сохранить получателя' }}
                    </button>
                  </div>
                  <div v-if="recipientTest" class="recipient-warning">
                    Подменный номер действует только в этой задаче. Номер заказа и Google Sheet не изменяются.
                  </div>
                </section>

                <div class="messages">
                  <div v-for="message in conversationMessages" :key="message.id" class="message" :class="`message--${message.direction}`">
                  <div class="message-head">
                    <span>{{ directionLabel(message.direction) }}</span>
                    <span>{{ sourceLabel(message.source) }}</span>
                    <span v-if="message.approvalStatus" class="badge">{{ approvalLabel(message.approvalStatus) }}</span>
                    <span v-if="message.deliveryStatus" class="badge" :class="deliveryStatusClass(message.deliveryStatus)">{{ deliveryStatusLabel(message.deliveryStatus) }}</span>
                    <span>{{ formatDate(message.createdAt) }}</span>
                  </div>
                  <div class="message-body">{{ messageDisplayText(message) }}</div>
                  <div v-if="message.direction === 'outbound'" class="send-preview">
                    <span><strong>Кому:</strong> {{ selectedTask.customerActorId || 'не указан' }}</span>
                    <span><strong>Канал:</strong> {{ (message.channel || selectedTask.channel || '—') }}</span>
                    <span><strong>Проблема:</strong> {{ clarificationProblemLabel }}</span>
                    <span><strong>Заказ:</strong> {{ orderLabel(selectedTask.order) }}</span>
                    <span v-if="selectedTask.recipientSource === 'test_override'" class="badge badge--sla-warning">Тест</span>
                  </div>
                  <div class="message-actions">
                    <button class="btn btn--small" @click="copyMessage(message)" v-if="message.direction === 'outbound'">Скопировать</button>
                  </div>
                  </div>
                  <div v-if="!conversationMessages.length" class="empty">История сообщений пока пуста</div>
                </div>
              </div>

              <div class="actions">
                <div v-if="inboundOutcome" class="outcome-panel" :class="inboundOutcome.panelClass">
              <div class="outcome-panel__head">
                <div>
                  <p class="eyebrow">AI разбор ответа</p>
                  <h4>{{ inboundOutcome.title }}</h4>
                  <p class="hint">{{ inboundOutcome.reasonLabel }}</p>
                </div>
                <span class="badge badge--state">{{ stateLabel(inboundOutcome.nextState) }}</span>
              </div>
              <div class="outcome-panel__grid">
                <div>
                  <span>Класс</span>
                  <strong>{{ inboundOutcome.classLabel }}</strong>
                </div>
                <div>
                  <span>Уверенность</span>
                  <strong>{{ inboundOutcome.confidenceLabel }}</strong>
                </div>
                <div>
                  <span>Поле</span>
                  <strong>{{ inboundOutcome.fieldLabel }}</strong>
                </div>
                <div>
                  <span>Значение</span>
                  <strong>{{ inboundOutcome.valueLabel }}</strong>
                </div>
              </div>
              <div v-if="inboundOutcome.orderPatchItems.length" class="outcome-panel__patch">
                <span>Распознано из ответа</span>
                <div class="patch-chips">
                  <span v-for="item in inboundOutcome.orderPatchItems" :key="item" class="patch-chip">{{ item }}</span>
                </div>
              </div>
              <div v-if="inboundOutcome.hasPendingPatch" class="review-gate review-gate--inline">
                <div class="hint">Проверьте распознанное значение. В поля поездки ничего не записывается — ответ сохранится только во внутреннем комментарии.</div>
                <div class="review-gate__actions">
                  <button class="btn btn--primary" :disabled="inboundUpdateSaving" @click="applyInboundUpdate">
                    {{ inboundUpdateSaving ? 'Сохраняю...' : 'Сохранить ответ в комментарии' }}
                  </button>
                  <button class="btn btn--warn" :disabled="inboundUpdateSaving" @click="rejectInboundUpdate">
                    Отклонить
                  </button>
                </div>
              </div>
                </div>

                <div class="actions-block message-workspace">
              <template v-if="activeDraftMessage">
                <p class="eyebrow">Текущий шаг</p>
                <h4>{{ activeDraftMessage.approvalStatus === 'pending_human' ? 'Проверьте сообщение' : 'Отправьте сообщение' }}</h4>
                <div class="hint">
                  {{ activeDraftMessage.approvalStatus === 'pending_human'
                    ? 'Текст ещё не отправлен. Проверьте его и нажмите «Одобрить».'
                    : 'Сообщение одобрено. Проверьте получателя и отправьте его клиенту.' }}
                </div>
                <div class="draft-review">
                  <div class="message-body">{{ activeDraftMessage.bodyText }}</div>
                  <div class="send-preview">
                    <span><strong>Кому:</strong> {{ selectedTask.customerActorId || 'не указан' }}</span>
                    <span><strong>Канал:</strong> {{ activeDraftMessage.channel || selectedTask.channel || '—' }}</span>
                    <span><strong>Проблема:</strong> {{ clarificationProblemLabel }}</span>
                    <span><strong>Заказ:</strong> {{ orderLabel(selectedTask.order) }}</span>
                    <span v-if="selectedTask.recipientSource === 'test_override'" class="badge badge--sla-warning">Тест</span>
                  </div>
                </div>

                <div v-if="canSend(activeDraftMessage)" class="delivery-panel" :class="{ 'delivery-panel--warning': isWhatsappMessage(activeDraftMessage) && !whatsappFreeTextAllowed }">
                  <div class="delivery-panel__head">
                    <div>
                      <strong>Как будет отправлено</strong>
                      <div class="hint">{{ deliveryHint(activeDraftMessage) }}</div>
                    </div>
                    <span v-if="isWhatsappMessage(activeDraftMessage)" class="badge" :class="whatsappFreeTextAllowed ? 'badge--sla-ok' : 'badge--sla-warning'">
                      {{ whatsappFreeTextAllowed ? 'Обычное сообщение' : 'Шаблон WhatsApp' }}
                    </span>
                  </div>
                  <div v-if="deliveryForm(activeDraftMessage).mode === 'template'" class="template-preview">
                    <strong>Текст, который получит клиент</strong>
                    <p>{{ approvedTemplatePreview(activeDraftMessage) }}</p>
                  </div>
                  <details class="delivery-settings">
                    <summary>Настройки отправки</summary>
                    <div class="delivery-mode">
                      <label class="delivery-radio">
                        <input
                          type="radio"
                          value="free_text"
                          :checked="deliveryForm(activeDraftMessage).mode === 'free_text'"
                          @change="setDeliveryMode(activeDraftMessage, 'free_text')"
                        >
                        Обычное сообщение
                      </label>
                      <label class="delivery-radio">
                        <input
                          type="radio"
                          value="template"
                          :checked="deliveryForm(activeDraftMessage).mode === 'template'"
                          @change="setDeliveryMode(activeDraftMessage, 'template')"
                        >
                        Шаблон WhatsApp
                      </label>
                    </div>
                    <div v-if="deliveryForm(activeDraftMessage).mode === 'template'" class="delivery-template-grid">
                      <label>
                        <span>Шаблон</span>
                        <select
                          class="input"
                          :value="knownTemplateName(deliveryForm(activeDraftMessage).templateName)"
                          @change="applyTemplatePreset(activeDraftMessage, $event.target.value)"
                        >
                          <option v-for="tpl in whatsappTemplatePresets" :key="tpl.name" :value="tpl.name">
                            {{ tpl.label }}
                          </option>
                          <option value="__custom">Другой шаблон</option>
                        </select>
                      </label>
                      <label>
                        <span>Язык</span>
                        <select
                          class="input"
                          :value="deliveryForm(activeDraftMessage).language"
                          @change="updateDeliveryForm(activeDraftMessage.id, 'language', $event.target.value)"
                        >
                          <option value="en">Английский</option>
                          <option value="ru">Русский</option>
                        </select>
                      </label>
                    </div>
                    <details v-if="deliveryForm(activeDraftMessage).mode === 'template'" class="policy-trace">
                      <summary>Дополнительные параметры шаблона</summary>
                      <div class="delivery-template-grid">
                        <label class="delivery-template-grid__wide">
                          <span>Название шаблона</span>
                          <input
                            class="input"
                            :value="deliveryForm(activeDraftMessage).templateName"
                            placeholder="riderra_baggage_request"
                            @input="updateDeliveryForm(activeDraftMessage.id, 'templateName', $event.target.value)"
                          >
                        </label>
                        <label class="delivery-template-grid__wide">
                          <span>Переменные шаблона</span>
                          <textarea
                            class="input textarea textarea--code delivery-vars"
                            :value="deliveryForm(activeDraftMessage).variablesText"
                            placeholder='{"booking_number":"123","question":"How many bags?"}'
                            @input="updateDeliveryForm(activeDraftMessage.id, 'variablesText', $event.target.value)"
                          ></textarea>
                        </label>
                      </div>
                    </details>
                  </details>
                </div>

                <div class="message-draft-actions">
                  <template v-if="activeDraftMessage.approvalStatus === 'pending_human'">
                    <button class="btn btn--primary" @click="approveMessage(activeDraftMessage.id)">Одобрить</button>
                    <button class="btn btn--warn" @click="rejectMessage(activeDraftMessage.id)">Отклонить</button>
                  </template>
                  <template v-else-if="canSend(activeDraftMessage)">
                    <button class="btn btn--primary" :disabled="!recipientReady" @click="sendMessage(activeDraftMessage.id)">
                      Отправить в {{ recipientChannel === 'whatsapp' ? 'WhatsApp' : 'Telegram' }}
                    </button>
                    <button class="btn btn--ghost" @click="copyMessage(activeDraftMessage)">Скопировать</button>
                    <button class="btn btn--ghost" @click="markManualSent(activeDraftMessage.id)">Отметить отправленным вручную</button>
                  </template>
                </div>
              </template>

              <template v-else-if="isDraftPreparationStage">
                <p class="eyebrow">Следующий шаг</p>
                <h4>Подготовьте сообщение клиенту</h4>
                <div class="hint">Выберите готовый вариант или напишите свой текст. После сохранения проверка появится здесь же.</div>
                <div class="draft-recommended">
                  <div>
                    <strong>Рекомендуемый вариант</strong>
                    <span>{{ selectedTask.taskType === 'dispatch_info' ? 'Собрать подтверждённые детали из заказа' : 'Сформулировать вопрос по отмеченной проблеме' }}</span>
                  </div>
                  <button
                    v-if="selectedTask.taskType === 'clarification'"
                    class="btn btn--primary"
                    :disabled="draftBuildLoading"
                    @click="sendClarificationQuick"
                  >
                    {{ draftBuildLoading ? 'Создаю...' : 'Создать вопрос клиенту' }}
                  </button>
                  <button
                    v-if="selectedTask.taskType === 'dispatch_info'"
                    class="btn btn--primary"
                    :disabled="draftBuildLoading"
                    @click="sendDispatchQuick"
                  >
                    {{ draftBuildLoading ? 'Создаю...' : 'Создать подтверждение поездки' }}
                  </button>
                </div>
                <div class="draft-divider"><span>или напишите свой текст</span></div>
                <div v-if="selectedTask.taskType === 'clarification'" class="quick-templates">
                  <button class="btn btn--tiny" @click="applyClarificationTemplate('generic')">Общее уточнение</button>
                  <button class="btn btn--tiny" @click="applyClarificationTemplate('luggage')">Уточнить багаж</button>
                  <button class="btn btn--tiny" @click="applyClarificationTemplate('flight')">Уточнить рейс</button>
                  <button class="btn btn--tiny" @click="applyClarificationTemplate('pickup')">Уточнить место подачи</button>
                </div>
                <textarea v-model="draftText" class="input textarea" placeholder="Напишите сообщение клиенту"></textarea>
                <div class="message-draft-actions">
                  <button class="btn btn--primary" :disabled="!draftText.trim()" @click="createDraft">Перейти к проверке</button>
                </div>
              </template>

              <template v-else>
                <p class="eyebrow">Текущий этап</p>
                <h4>{{ taskFocusTitle }}</h4>
                <div class="hint">{{ taskFocusHint }}</div>
              </template>
                </div>

                <details class="actions-block" :open="selectedTask && selectedTask.state === 'customer_replied'">
              <summary class="section-summary">Ответ клиента</summary>
              <textarea v-model="inboundText" class="input textarea" placeholder="Вставьте входящее сообщение клиента"></textarea>
              <button class="btn btn--ghost" :disabled="inboundProcessing || !inboundText.trim()" @click="processInboundMessage">
                {{ inboundProcessing ? 'Обрабатываю...' : 'Разобрать ответ' }}
              </button>
                </details>

                <details class="actions-block" :open="false">
              <summary class="section-summary">Технические детали AI разбора</summary>
              <div v-if="inboundOutcome" class="trace-wrap">
                <div class="trace-row"><strong>Класс ответа:</strong> {{ inboundOutcome.classLabel }}</div>
                <div class="trace-row"><strong>Уверенность:</strong> {{ inboundOutcome.confidenceLabel }}</div>
                <div class="trace-row"><strong>Валидация поля:</strong> {{ inboundOutcome.validationLabel }}</div>
                <div class="trace-row"><strong>Поле:</strong> {{ inboundOutcome.fieldLabel }}</div>
                <div class="trace-row"><strong>Извлеченное значение:</strong> {{ inboundOutcome.valueLabel }}</div>
                <div class="trace-row"><strong>Источник разбора:</strong> {{ inboundOutcome.sourceLabel }}</div>
                <div v-if="inboundOutcome.orderPatchLabel" class="trace-row"><strong>Распознанные данные:</strong> {{ inboundOutcome.orderPatchLabel }}</div>
                <div class="trace-row"><strong>Следующий статус:</strong> {{ stateLabel(inboundOutcome.nextState) }}</div>
                <div class="trace-row"><strong>Причина:</strong> {{ inboundOutcome.reasonLabel }}</div>
              </div>
              <div v-else class="hint">Результат появится после “Обработать ответ”.</div>
                </details>

                <details class="actions-block">
              <summary class="section-summary">Смена статуса</summary>
              <select v-model="nextState" class="input">
                <option value="">Выберите статус</option>
                <option v-for="s in transitionTargets" :key="s" :value="s">{{ stateLabel(s) }}</option>
              </select>
              <button class="btn btn--ghost" :disabled="!nextState" @click="applyTransition">Применить</button>
                </details>

                <details class="actions-block">
              <summary class="section-summary">Технические детали</summary>
              <div class="trace-wrap">
                <div class="trace-row"><strong>Задача:</strong> {{ selectedTask.id }}</div>
                <div class="trace-row"><strong>Заказ:</strong> {{ orderLabel(selectedTask.order) }}</div>
                <div class="trace-row"><strong>Backend статус:</strong> {{ selectedTask.state }}</div>
                <div class="trace-row"><strong>Тип:</strong> {{ selectedTask.taskType }}</div>
                <div class="trace-row"><strong>Агент:</strong> {{ agentLabel(selectedTask) }}</div>
                <div class="trace-row"><strong>Ответственный:</strong> {{ ownerLabel(selectedTask) }}</div>
              </div>
                </details>

                <details class="actions-block">
              <summary class="section-summary">Агент задачи</summary>
              <select v-model="selectedTaskAgentId" class="input">
                <option value="">Без агента</option>
                <option v-for="agent in agents" :key="agent.id" :value="agent.id">
                  {{ agent.name }} ({{ agent.code }}){{ agent.isActive ? '' : ' [inactive]' }}
                </option>
              </select>
              <button class="btn btn--ghost" :disabled="assigningAgent || !selectedTask" @click="assignAgentToTask">
                {{ assigningAgent ? 'Сохраняю...' : 'Применить агента' }}
              </button>
                </details>

                <details class="actions-block">
              <summary class="section-summary">Трейс шага</summary>
              <div v-if="lastStepTrace" class="trace-wrap">
                <div class="trace-row"><strong>Откуда:</strong> {{ stateLabel(lastStepTrace.fromState) }}</div>
                <div class="trace-row"><strong>Кандидат:</strong> {{ stateLabel(lastStepTrace.candidateState) }}</div>
                <div class="trace-row"><strong>Итог:</strong> {{ stateLabel(lastStepTrace.finalState) }}</div>
                <div class="trace-row"><strong>Почему:</strong> {{ lastStepTrace.decisionReason || '-' }}</div>
                <div class="trace-row trace-row--caps"><strong>Capabilities:</strong></div>
                <div v-for="cap in lastStepTrace.capabilities || []" :key="cap.name" class="trace-cap">
                  <div class="trace-cap-name">{{ cap.name }}</div>
                  <div class="trace-cap-meta">
                    runtime: {{ cap.runtime?.configured ? 'configured' : 'fallback' }},
                    ok: {{ cap.runtime?.ok ? 'yes' : 'no' }},
                    status: {{ cap.runtime?.status || 0 }}
                  </div>
                  <pre class="trace-json">{{ stringifyTrace(cap.output) }}</pre>
                </div>
                <div class="trace-row trace-time">{{ formatDate(lastStepTrace.createdAt) }}</div>
              </div>
              <div v-else class="hint">Трейс появится после обработки входящего ответа.</div>
                </details>
              </div>
            </template>
          </main>
        </div>
        </template>
      </div>
    </section>
  </div>
</template>

<script>
import adminTabs from '~/components/partials/adminTabs.vue'
import InquiryInbox from '~/components/admin/chats/InquiryInbox.vue'
import AgentSandboxPanel from '~/components/admin/chats/AgentSandboxPanel.vue'

export default {
  layout: 'admin',
  middleware: 'staff',
  components: { adminTabs, InquiryInbox, AgentSandboxPanel },
  data: () => ({
    inboxMode: true,
    sandboxOpen: false,
    tasks: [],
    selectedTask: null,
    taskType: '',
    state: '',
    uiState: '',
    agentFilter: '',
    ownerFilter: '',
    owners: [],
    myOnly: false,
    urgentOnly: false,
    sortMode: 'priority',
    currentUserId: '',
    selectedTaskIds: [],
    bulkLoading: false,
    autoRefreshMs: 20000,
    autoRefreshTimer: null,
    draftText: '',
    nextState: '',
    notice: '',
    agents: [],
    selectedAgentId: '',
    agentSaving: false,
    agentTesting: false,
    agentTestInput: '',
    agentTestOutput: '',
    promptTemplates: [],
    promptKeys: ['order_missing_data_prompt', 'reply_interpretation_prompt', 'esim_offer_prompt', 'followup_prompt', 'whatsapp_template_registry'],
    selectedPromptKey: 'order_missing_data_prompt',
    selectedPromptVersionLabel: '-',
    promptText: '',
    promptDescription: '',
    promptSaving: false,
    copyStatus: '',
    inboundText: '',
    inboundProcessing: false,
    inboundUpdateSaving: false,
    quickSendLoading: false,
    quickDispatchLoading: false,
    draftBuildLoading: false,
    selectedTaskAgentId: '',
    assigningAgent: false,
    lastStepTrace: null,
    deliveryForms: {},
    recipientChannel: 'whatsapp',
    recipientPhone: '',
    recipientTest: false,
    recipientSaving: false,
    whatsappTemplatePresets: [
      {
        name: 'riderra_baggage_request',
        label: 'Baggage request',
        description: 'Запросить количество чемоданов, сумок и нестандартного багажа.',
        language: 'en',
        languages: ['en'],
        variables: ['city', 'pickup_date']
      },
      {
        name: 'riderra_flight_request',
        label: 'Flight request',
        description: 'Запросить номер рейса.',
        language: 'en',
        languages: ['en'],
        variables: ['city', 'pickup_date']
      },
      {
        name: 'riderra_passengers_request',
        label: 'Passengers request',
        description: 'Запросить количество пассажиров.',
        language: 'en',
        languages: ['en'],
        variables: ['city', 'pickup_date']
      },
      {
        name: 'riderra_trip_message',
        label: 'Trip message',
        description: 'Общее служебное сообщение о предстоящей поездке.',
        language: 'en',
        languages: ['en'],
        variables: ['city', 'pickup_date']
      }
    ],
    agentForm: {
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
    }
  }),
  computed: {
    availableStates() {
      return [
        'missing_data_detected',
        'request_sent',
        'customer_replied',
        'pending_update_approval',
        'field_validated',
        'field_rejected',
        'order_complete',
        'ready_to_notify',
        'notify_draft',
        'notify_sent',
        'notify_ack',
        'notify_no_reply',
        'handoff_human',
        'closed'
      ]
    },
    uiStateOptions() {
      return [
        { value: 'needs_reply', label: 'Нужно ответить' },
        { value: 'draft_ready', label: 'Черновик готов' },
        { value: 'waiting_customer', label: 'Ждём клиента' },
        { value: 'handoff_human', label: 'Передано человеку' },
        { value: 'closed', label: 'Закрыто' }
      ]
    },
    transitionTargets() {
      const map = {
        missing_data_detected: ['request_sent', 'handoff_human', 'closed'],
        request_sent: ['customer_replied', 'handoff_human', 'closed'],
        customer_replied: ['pending_update_approval', 'field_validated', 'field_rejected', 'handoff_human'],
        pending_update_approval: ['order_complete', 'field_rejected', 'handoff_human'],
        field_validated: ['missing_data_detected', 'order_complete', 'handoff_human'],
        field_rejected: ['request_sent', 'handoff_human'],
        order_complete: ['ready_to_notify', 'closed'],
        ready_to_notify: ['notify_draft', 'notify_sent', 'handoff_human', 'closed'],
        notify_draft: ['notify_sent', 'handoff_human', 'closed'],
        notify_sent: ['notify_ack', 'notify_no_reply', 'handoff_human', 'closed'],
        notify_ack: ['closed'],
        notify_no_reply: ['notify_sent', 'handoff_human', 'closed'],
        handoff_human: ['request_sent', 'notify_draft', 'closed'],
        closed: []
      }
      const state = this.selectedTask ? this.selectedTask.state : ''
      return map[state] || []
    },
    inboundOutcome() {
      if (!this.lastStepTrace) return null
      const classifyOutput = this.getCapabilityOutput('riderra.customer.reply.classify')
      const extractOutput = this.getCapabilityOutput('riderra.order.field.extract_validate')
      const cls = String(classifyOutput?.class || 'unclassified')
      const clsMap = {
        answer: 'Ответ',
        question: 'Вопрос',
        negative: 'Негатив',
        ack: 'Подтверждение',
        irrelevant: 'Не по задаче',
        unclassified: 'Не классифицировано'
      }
      const conf = Number(classifyOutput?.confidence)
      const confidenceLabel = Number.isFinite(conf) ? `${Math.round(conf * 100)}%` : '—'
      const valid = extractOutput?.valid
      let validationLabel = '—'
      if (valid === true) validationLabel = 'Подтверждено'
      if (valid === false) validationLabel = 'Не подтверждено'
      const extractedValue = extractOutput?.value ?? extractOutput?.normalizedValue ?? extractOutput?.extractedValue ?? null
      const field = String(extractOutput?.field || '—')
      const fieldLabels = { flightNumber: 'Номер рейса', luggage: 'Количество багажа', pickupPoint: 'Место подачи', destinationPoint: 'Адрес назначения', clarification: 'Уточнение' }
      const source = String(extractOutput?.source || classifyOutput?.source || 'OpenClaw')
      const patch = Array.isArray(this.lastStepTrace.orderPatchPreview) ? this.lastStepTrace.orderPatchPreview : []
      const hasPendingPatch = Boolean(this.lastStepTrace.pendingOrderPatch && this.selectedTask?.state === 'pending_update_approval')
      let title = 'Ответ разобран'
      let panelClass = 'outcome-panel--neutral'
      if (hasPendingPatch) {
        title = 'Проверьте и примените обновление'
        panelClass = 'outcome-panel--attention'
      } else if (String(this.lastStepTrace.finalState || '') === 'handoff_human') {
        title = 'Нужен человек'
        panelClass = 'outcome-panel--warn'
      } else if (String(this.lastStepTrace.finalState || '') === 'order_complete') {
        title = 'Сценарий закрыт'
        panelClass = 'outcome-panel--success'
      } else if (valid === false) {
        title = 'Ответ не подтвердил поле'
        panelClass = 'outcome-panel--warn'
      }
      return {
        title,
        panelClass,
        classLabel: clsMap[cls] || cls,
        confidenceLabel,
        validationLabel,
        fieldLabel: fieldLabels[field] || field,
        valueLabel: extractedValue == null || String(extractedValue).trim() === '' ? '—' : String(extractedValue),
        sourceLabel: source === 'local_fallback' ? 'Локальные правила Riderra' : source,
        orderPatchLabel: patch.length ? patch.join(', ') : '',
        orderPatchItems: patch,
        hasPendingPatch,
        nextState: String(this.lastStepTrace.finalState || this.lastStepTrace.candidateState || ''),
        reasonLabel: String(this.lastStepTrace.decisionReason || '—')
      }
    },
    whatsappFreeTextAllowed() {
      const lastInboundMs = this.lastInboundAtMs()
      return lastInboundMs > 0 && (Date.now() - lastInboundMs) <= 24 * 60 * 60 * 1000
    },
    recipientValid() {
      return /^\+[1-9]\d{9,14}$/.test(String(this.recipientPhone || '').trim())
    },
    recipientReady() {
      return this.recipientValid &&
        String(this.selectedTask?.customerActorId || '') === String(this.recipientPhone || '').trim() &&
        String(this.selectedTask?.channel || '') === String(this.recipientChannel || '')
    },
    activeDraftMessage() {
      const messages = Array.isArray(this.selectedTask?.messages) ? this.selectedTask.messages : []
      return messages.find((message) => message?.direction === 'outbound' && message?.approvalStatus === 'pending_human') ||
        messages.find((message) => this.canSend(message)) ||
        null
    },
    conversationMessages() {
      const messages = Array.isArray(this.selectedTask?.messages) ? this.selectedTask.messages : []
      return messages.filter((message) => {
        if (message?.direction !== 'outbound') return true
        if (message?.approvalStatus === 'pending_human') return false
        return !this.canSend(message)
      })
    },
    isDraftPreparationStage() {
      if (!this.selectedTask) return false
      if (!['clarification', 'dispatch_info'].includes(this.selectedTask.taskType)) return false
      if (['handoff_human', 'closed', 'order_complete'].includes(this.selectedTask.state)) return false
      if (this.isWaitingForCustomer(this.selectedTask)) return false
      if (['customer_replied', 'pending_update_approval'].includes(this.selectedTask.state)) return false
      return !this.hasDraftAwaitingApproval(this.selectedTask) && !this.hasReadyDraft(this.selectedTask)
    },
    displayedTasks() {
      let rows = Array.isArray(this.tasks) ? this.tasks.slice() : []
      if (this.ownerFilter === '__mine') {
        rows = rows.filter((task) => this.isTaskMine(task))
      } else if (this.ownerFilter === '__unassigned') {
        rows = rows.filter((task) => !String(task?.assignedToUserId || '').trim())
      } else if (this.ownerFilter) {
        rows = rows.filter((task) => String(task?.assignedToUserId || '').trim() === this.ownerFilter)
      }
      if (this.uiState) rows = rows.filter((task) => this.uiStateKey(task?.state) === this.uiState)
      if (this.myOnly) rows = rows.filter((task) => this.isTaskMine(task))
      if (this.urgentOnly) {
        rows = rows.filter((task) => {
          const code = this.getSlaMeta(task).code
          return code === 'overdue' || code === 'warning'
        })
      }
      rows.sort((a, b) => this.compareBySortMode(a, b))
      return rows
    },
    taskFocusTitle() {
      if (!this.selectedTask) return ''
      if (this.hasDraftAwaitingApproval(this.selectedTask)) return 'Проверьте черновик сообщения'
      if (this.selectedTask.state === 'closed') return 'Диалог завершён'
      if (this.selectedTask.taskType === 'dispatch_info') return 'Нужно подготовить сообщение клиенту'
      if (this.selectedTask.state === 'handoff_human') return 'Задача передана человеку'
      if (this.selectedTask.state === 'customer_replied') return 'Нужно разобрать ответ клиента'
      if (this.selectedTask.state === 'request_sent') return 'Ждём ответ клиента'
      return 'Нужно закрыть уточнение по заказу'
    },
    taskFocusHint() {
      if (!this.selectedTask) return ''
      const reason = String(this.selectedTask?.order?.infoReason || '').trim()
      if (this.hasDraftAwaitingApproval(this.selectedTask)) return 'Сообщение ещё не отправлено. Проверьте текст выше, затем одобрите или отклоните его.'
      if (this.selectedTask.state === 'closed') return 'Ответ клиента сохранён, благодарность отправлена, дополнительных действий не требуется.'
      if (this.selectedTask.state === 'handoff_human') {
        return this.selectedTask.lastError || 'Проверьте данные получателя или выберите другой способ связи. После решения проблемы можно возобновить работу агента.'
      }
      if (this.selectedTask.state === 'pending_update_approval') return 'Проверьте предложенное обновление заказа и примените его только после подтверждения.'
      if (this.selectedTask.state === 'customer_replied') return 'Сначала разберите входящий ответ и подтвердите поле.'
      if (this.selectedTask.state === 'request_sent') return 'Проверьте, нужен ли follow-up или передача человеку.'
      if (this.selectedTask.taskType === 'dispatch_info') return 'Создайте сообщение с подтверждёнными деталями поездки. Перед отправкой вы увидите и одобрите черновик.'
      if (reason) return `Фокус задачи: ${reason}`
      return 'Соберите короткое сообщение, получите ответ и доведите задачу до следующего статуса.'
    },
    clarificationProblemLabel() {
      const reason = String(this.selectedTask?.order?.infoReason || '').trim()
      if (reason) return reason
      const extraction = this.getCapabilityOutput('riderra.order.field.extract_validate') || {}
      const labels = {
        destinationPoint: 'Уточнить адрес назначения',
        pickupPoint: 'Уточнить место подачи',
        flightNumber: 'Уточнить рейс',
        luggage: 'Уточнить багаж',
        passengers: 'Уточнить количество пассажиров'
      }
      return labels[String(extraction.field || '')] || '—'
    }
  },
  mounted() {
    const routedTaskId = String(this.$route.query.taskId || '').trim()
    this.inboxMode = !routedTaskId && this.$route.query.mode !== 'orders'
    if (!this.inboxMode) this.initPage().catch(() => {})
  },
  beforeDestroy() {
    this.stopAutoRefresh()
  },
  methods: {
    openInboxMode() {
      this.inboxMode = true
      this.stopAutoRefresh()
      const query = { ...this.$route.query }
      delete query.mode
      delete query.taskId
      this.$router.replace({ query }).catch(() => {})
    },
    openWhatsAppConversation() {
      this.sandboxOpen = false
      this.openInboxMode()
      this.$nextTick(() => this.$refs.inquiryInbox?.openStartConversation())
    },
    openOperationsMode() {
      this.inboxMode = false
      this.$router.replace({ query: { ...this.$route.query, mode: 'orders' } }).catch(() => {})
      if (!this.autoRefreshTimer) this.initPage().catch(() => {})
    },
    async initPage() {
      this.currentUserId = this.extractCurrentUserId()
      await this.loadWhatsappTemplates()
      await this.loadTasks()
      await this.loadAgents()
      await this.openTaskFromRouteIfNeeded()
      this.startAutoRefresh()
    },
    startAutoRefresh() {
      this.stopAutoRefresh()
      this.autoRefreshTimer = setInterval(() => {
        this.refreshQueueSilently().catch(() => {})
      }, this.autoRefreshMs)
    },
    stopAutoRefresh() {
      if (this.autoRefreshTimer) {
        clearInterval(this.autoRefreshTimer)
        this.autoRefreshTimer = null
      }
    },
    async refreshQueueSilently() {
      await this.loadTasks()
      if (this.selectedTask?.id) {
        const stillExists = this.tasks.some((task) => task.id === this.selectedTask.id)
        if (!stillExists) this.selectedTask = null
      }
    },
    headers() {
      const token = localStorage.getItem('authToken')
      return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        'Idempotency-Key': `chat-ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      }
    },
    extractCurrentUserId() {
      try {
        const token = localStorage.getItem('authToken')
        if (!token) return ''
        const payload = token.split('.')[1]
        if (!payload) return ''
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
        const decoded = JSON.parse(atob(normalized))
        return String(decoded?.id || '').trim()
      } catch (_) {
        return ''
      }
    },
    async openTaskFromRouteIfNeeded() {
      const taskId = String(this.$route?.query?.taskId || '').trim()
      if (!taskId) return
      await this.openTask(taskId)
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const key = `chat-prefill-${taskId}`
          const prefill = String(window.sessionStorage.getItem(key) || '').trim()
          if (prefill) {
            this.draftText = prefill
            this.notice = 'Открыта задача из Таблицы заказов, черновик подготовлен'
            window.sessionStorage.removeItem(key)
          }
        }
      } catch (_) {}
    },
    async reloadAll() {
      this.notice = ''
      await this.loadWhatsappTemplates()
      await this.loadTasks()
      await this.loadAgents()
      if (this.selectedTask?.id) await this.openTask(this.selectedTask.id)
    },
    async loadAgents() {
      const res = await fetch('/api/admin/chats/agents', { headers: this.headers() })
      const data = await res.json()
      this.agents = data.rows || []
      if (this.selectedAgentId && !this.agents.some((a) => a.id === this.selectedAgentId)) {
        this.startNewAgent()
      }
    },
    async loadWhatsappTemplates() {
      try {
        const response = await fetch('/api/admin/chats/whatsapp-templates', { headers: this.headers() })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось загрузить WhatsApp templates')
        if (Array.isArray(data.templates) && data.templates.length) {
          this.whatsappTemplatePresets = data.templates
        }
      } catch (error) {
        this.notice = error?.message || 'WhatsApp templates недоступны, использую локальный список'
      }
    },
    applyAgentSelection() {
      if (!this.selectedAgentId) {
        this.startNewAgent()
        return
      }
      const selected = this.agents.find((a) => a.id === this.selectedAgentId)
      if (!selected) return
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
        requiresApproval: selected.requiresApproval !== false
      }
    },
    startNewAgent() {
      this.selectedAgentId = ''
      this.agentForm = {
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
      }
      this.agentTestInput = ''
      this.agentTestOutput = ''
    },
    async saveAgent() {
      if (this.agentSaving) return
      this.agentSaving = true
      this.notice = ''
      try {
        const creating = !this.selectedAgentId
        const payload = {
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
          requiresApproval: this.agentForm.requiresApproval
        }
        const method = this.selectedAgentId ? 'PUT' : 'POST'
        const url = this.selectedAgentId ? `/api/admin/chats/agents/${this.selectedAgentId}` : '/api/admin/chats/agents'
        const res = await fetch(url, {
          method,
          headers: this.headers(),
          body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Не удалось сохранить агента')
        await this.loadAgents()
        if (!this.selectedAgentId && data?.agent?.id) this.selectedAgentId = data.agent.id
        this.applyAgentSelection()
        this.notice = creating ? 'Агент создан' : 'Агент сохранен'
      } catch (error) {
        this.notice = error?.message || 'Ошибка сохранения агента'
      } finally {
        this.agentSaving = false
      }
    },
    async runAgentTest() {
      if (!this.selectedAgentId || this.agentTesting) return
      this.agentTesting = true
      this.notice = ''
      try {
        const response = await fetch(`/api/admin/ai-agents/${this.selectedAgentId}/test`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            dry_run: true,
            message: this.agentTestInput || 'Проверка тестового запуска агента',
            conversation_history: []
          })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Ошибка dry_run теста')
        this.agentTestOutput = JSON.stringify(data, null, 2)
      } catch (error) {
        this.agentTestOutput = JSON.stringify({ error: error?.message || 'Ошибка теста' }, null, 2)
      } finally {
        this.agentTesting = false
      }
    },
    applyAgentPreset(kind) {
      if (kind === 'clarification') {
        this.agentForm.type = 'order_completion'
        this.agentForm.taskType = 'clarification'
        this.agentForm.requiresApproval = true
        this.agentForm.promptText = [
          'You are Riderra customer communication assistant.',
          'Default customer-facing language is English unless order.lang is explicitly ru.',
          'Task: politely and briefly ask only for the missing booking details.',
          'Ask for 1-2 critical fields per message.',
          'Do not invent facts. If context is missing, ask a clarification.',
          'Every outbound message must remain Draft -> Approval -> Execute.'
        ].join('\n')
        this.agentForm.workflowJson = JSON.stringify({
          states: ['missing_data_detected', 'request_sent', 'customer_replied', 'pending_update_approval', 'field_rejected', 'order_complete', 'handoff_human'],
          transitions: {
            missing_data_detected: ['request_sent', 'handoff_human'],
            request_sent: ['customer_replied', 'handoff_human'],
            customer_replied: ['pending_update_approval', 'field_rejected', 'handoff_human'],
            pending_update_approval: ['order_complete', 'field_rejected', 'handoff_human'],
            field_rejected: ['request_sent', 'handoff_human'],
            order_complete: ['closed'],
            handoff_human: ['request_sent', 'closed']
          }
        }, null, 2)
        this.agentForm.restrictionsJson = JSON.stringify({
          maxMessagesPerHour: 3,
          allowedChannels: ['telegram', 'whatsapp'],
          requireHumanApproval: true
        }, null, 2)
      } else if (kind === 'dispatch') {
        this.agentForm.type = 'dispatch_notify'
        this.agentForm.taskType = 'dispatch_info'
        this.agentForm.requiresApproval = true
        this.agentForm.promptText = [
          'You are Riderra customer communication assistant.',
          'Default customer-facing language is English unless order.lang is explicitly ru.',
          'Task: send confirmed trip details to the customer.',
          'Include route, date/time, driver contact if available, and useful instructions.',
          'Tone: short, clear, businesslike, no pressure.',
          'Every outbound message must remain Draft -> Approval -> Execute.'
        ].join('\n')
        this.agentForm.workflowJson = JSON.stringify({
          states: ['ready_to_notify', 'notify_draft', 'notify_sent', 'notify_ack', 'handoff_human', 'closed'],
          transitions: {
            ready_to_notify: ['notify_draft', 'notify_sent', 'handoff_human'],
            notify_draft: ['notify_sent', 'handoff_human'],
            notify_sent: ['notify_ack', 'notify_no_reply', 'handoff_human'],
            notify_no_reply: ['notify_sent', 'handoff_human'],
            notify_ack: ['closed'],
            handoff_human: ['notify_draft', 'closed']
          }
        }, null, 2)
        this.agentForm.restrictionsJson = JSON.stringify({
          maxMessagesPerHour: 2,
          allowedChannels: ['telegram', 'whatsapp'],
          requireHumanApproval: true
        }, null, 2)
      }
    },
    async loadTasks() {
      const query = new URLSearchParams()
      if (this.taskType) query.set('taskType', this.taskType)
      if (this.state) query.set('state', this.state)
      if (this.agentFilter) query.set('agentId', this.agentFilter)
      query.set('limit', '300')
      const res = await fetch(`/api/admin/chats/tasks?${query.toString()}`, { headers: this.headers() })
      const data = await res.json()
      this.tasks = data.rows || []
      this.refreshOwnersFromTasks()
      this.selectedTaskIds = this.selectedTaskIds.filter((id) => this.tasks.some((task) => task.id === id))
      if (this.selectedTask?.id) {
        const exists = this.tasks.some((t) => t.id === this.selectedTask.id)
        if (!exists) this.selectedTask = null
      }
    },
    refreshOwnersFromTasks() {
      const seen = new Map()
      for (const task of this.tasks || []) {
        const owner = task?.assignedOwner
        if (!owner?.id || seen.has(owner.id)) continue
        seen.set(owner.id, { id: owner.id, email: owner.email || owner.id })
      }
      this.owners = Array.from(seen.values()).sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')))
      if (this.ownerFilter && !['__mine', '__unassigned'].includes(this.ownerFilter) && !seen.has(this.ownerFilter)) {
        this.ownerFilter = ''
      }
    },
    async loadPrompts() {
      try {
        const res = await fetch('/api/admin/prompts', { headers: this.headers() })
        const data = await res.json()
        this.promptTemplates = data.prompts || []
        this.applyPromptSelection()
      } catch (_) {}
    },
    applyPromptSelection() {
      const key = this.selectedPromptKey
      const row = (this.promptTemplates || []).find((x) => x.key === key)
      this.selectedPromptVersionLabel = row ? `v${row.prompt_version || 1}` : 'new'
      this.promptText = row?.content || ''
      this.promptDescription = row?.description || ''
    },
    async savePromptTemplate() {
      if (!this.selectedPromptKey || this.promptSaving) return
      this.promptSaving = true
      try {
        const response = await fetch(`/api/admin/prompts/${encodeURIComponent(this.selectedPromptKey)}`, {
          method: 'PUT',
          headers: this.headers(),
          body: JSON.stringify({
            content: this.promptText || '',
            description: this.promptDescription || null
          })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось сохранить prompt')
        this.notice = `Prompt ${this.selectedPromptKey} сохранен, версия v${data.prompt_version || '?'}`
        await this.loadPrompts()
      } catch (error) {
        this.notice = error?.message || 'Ошибка сохранения prompt'
      } finally {
        this.promptSaving = false
      }
    },
    async openTask(id) {
      const res = await fetch(`/api/admin/chats/tasks/${id}`, { headers: this.headers() })
      const data = await res.json()
      if (data.task?.unreadCount > 0) {
        const readResponse = await fetch(`/api/admin/chats/tasks/${id}/read`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({})
        })
        if (readResponse.ok) data.task.unreadCount = 0
      }
      this.selectedTask = data.task || null
      this.selectedTaskAgentId = this.selectedTask?.agentConfigId || ''
      this.recipientChannel = this.selectedTask?.channel || 'whatsapp'
      this.recipientPhone = this.selectedTask?.customerActorId || ''
      this.recipientTest = this.selectedTask?.recipientSource === 'test_override'
      this.lastStepTrace = data.lastTrace || null
      this.nextState = ''
      this.draftText = ''
      this.inboundText = ''
      this.initializeDeliveryForms()
    },
    async saveRecipient() {
      if (!this.selectedTask?.id || !this.recipientValid || this.recipientSaving) return
      this.recipientSaving = true
      this.notice = ''
      try {
        const response = await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/recipient`, {
          method: 'PUT',
          headers: this.headers(),
          body: JSON.stringify({
            channel: this.recipientChannel,
            phone: this.recipientPhone,
            testRecipient: this.recipientTest,
            recipientSource: this.recipientTest ? 'test_override' : 'manual'
          })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось сохранить получателя')
        this.notice = this.recipientTest ? 'Тестовый получатель сохранён только для этой задачи' : 'Получатель сохранён'
        await this.openTask(this.selectedTask.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка сохранения получателя'
      } finally {
        this.recipientSaving = false
      }
    },
    async assignAgentToTask() {
      if (!this.selectedTask?.id || this.assigningAgent) return
      this.assigningAgent = true
      this.notice = ''
      try {
        const response = await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/assign-agent`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            agentConfigId: this.selectedTaskAgentId || null
          })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось назначить агента')
        this.notice = this.selectedTaskAgentId ? 'Агент назначен на задачу' : 'Агент снят с задачи'
        await this.openTask(this.selectedTask.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка назначения агента'
      } finally {
        this.assigningAgent = false
      }
    },
    async buildDraftWithAi() {
      if (!this.selectedTask?.id || this.draftBuildLoading || this.hasDraftAwaitingApproval(this.selectedTask)) return
      this.draftBuildLoading = true
      try {
        const response = await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/build`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            message: this.draftText || ''
          })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось собрать AI-черновик')
        this.notice = data?.runtime?.configured
          ? 'AI-черновик добавлен (OpenClaw)'
          : 'AI-черновик добавлен (локальный fallback)'
        await this.openTask(this.selectedTask.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка AI-черновика'
      } finally {
        this.draftBuildLoading = false
      }
    },
    async sendClarificationQuick() {
      if (!this.selectedTask?.id || this.draftBuildLoading || this.hasDraftAwaitingApproval(this.selectedTask)) return
      if (this.selectedTask.taskType !== 'clarification') {
        this.notice = 'Подготовка доступна только для уточнений'
        return
      }
      this.draftBuildLoading = true
      this.quickSendLoading = true
      this.notice = ''
      try {
        const buildResponse = await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/build`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ message: this.draftText || '' })
        })
        const buildData = await buildResponse.json()
        if (!buildResponse.ok) throw new Error(buildData?.error || 'Не удалось собрать уточнение')
        const messageId = buildData?.message?.id
        if (!messageId) throw new Error('Не найден ID сообщения после сборки')

        this.notice = 'Черновик готов. Проверьте текст и одобрите его.'
        this.draftText = ''
        await this.openTask(this.selectedTask.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка подготовки уточнения'
      } finally {
        this.quickSendLoading = false
        this.draftBuildLoading = false
      }
    },
    async sendDispatchQuick() {
      if (!this.selectedTask?.id || this.draftBuildLoading || this.hasDraftAwaitingApproval(this.selectedTask)) return
      if (this.selectedTask.taskType !== 'dispatch_info') {
        this.notice = 'Подготовка рассылки доступна только для задач dispatch_info'
        return
      }
      this.draftBuildLoading = true
      this.quickDispatchLoading = true
      this.notice = ''
      try {
        const buildResponse = await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/build`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ message: this.draftText || '' })
        })
        const buildData = await buildResponse.json()
        if (!buildResponse.ok) throw new Error(buildData?.error || 'Не удалось собрать сообщение')
        const messageId = buildData?.message?.id
        if (!messageId) throw new Error('Не найден ID сообщения после сборки')

        this.notice = 'Черновик готов. Проверьте текст и одобрите его.'
        this.draftText = ''
        await this.openTask(this.selectedTask.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка подготовки деталей'
      } finally {
        this.quickDispatchLoading = false
        this.draftBuildLoading = false
      }
    },
    async syncFromOrders() {
      await fetch('/api/admin/chats/sync-from-orders', {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({})
      })
      await this.reloadAll()
      this.notice = 'Очередь синхронизирована из заказов'
    },
    async toggleConversationAgent(task) {
      if (!task || !task.id) return
      try {
        const response = await fetch(`/api/conversations/${task.id}/toggle-agent`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({})
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось переключить агента')
        this.notice = data.agent_paused ? 'Агент поставлен на паузу' : 'Агент возобновлен'
        await this.openTask(task.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка переключения агента'
      }
    },
    async createDraft() {
      if (!this.selectedTask || !this.draftText.trim()) return
      await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/messages`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          direction: 'outbound',
          source: 'operator',
          channel: this.selectedTask.channel || 'whatsapp',
          bodyText: this.draftText.trim(),
          approvalStatus: 'pending_human'
        })
      })
      this.draftText = ''
      await this.openTask(this.selectedTask.id)
      await this.loadTasks()
    },
    async copyMessage(message) {
      const text = String(this.messageDisplayText(message) || '').trim()
      if (!text) return
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text)
        } else {
          const el = document.createElement('textarea')
          el.value = text
          el.setAttribute('readonly', 'readonly')
          el.style.position = 'fixed'
          el.style.left = '-9999px'
          document.body.appendChild(el)
          el.select()
          document.execCommand('copy')
          document.body.removeChild(el)
        }
        this.copyStatus = 'Текст скопирован'
        this.notice = this.copyStatus
      } catch (_) {
        this.copyStatus = 'Не удалось скопировать автоматически. Выделите текст вручную.'
        this.notice = this.copyStatus
      }
    },
    async markManualSent(id) {
      if (!id || !this.selectedTask?.id) return
      try {
        const response = await fetch(`/api/admin/chats/messages/${id}/mark-manual-sent`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({})
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось отметить ручную отправку')
        this.notice = 'Сообщение отмечено как отправленное вручную'
        await this.openTask(this.selectedTask.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка ручной отправки'
      }
    },
    async processInboundMessage() {
      if (!this.selectedTask?.id || this.inboundProcessing || !this.inboundText.trim()) return
      this.inboundProcessing = true
      try {
        const response = await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/inbound`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ bodyText: this.inboundText.trim() })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось обработать входящее')
        const cls = data?.classification?.class || '-'
        const next = data?.taskState || '-'
        this.notice = `Входящее обработано: class=${cls}, state=${next}`
        this.lastStepTrace = data?.trace || null
        this.inboundText = ''
        await this.openTask(this.selectedTask.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка обработки входящего'
      } finally {
        this.inboundProcessing = false
      }
    },
    async applyInboundUpdate() {
      if (!this.selectedTask?.id || this.inboundUpdateSaving) return
      this.inboundUpdateSaving = true
      try {
        const response = await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/confirm-inbound-comment`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({})
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось сохранить ответ')
        this.notice = 'Ответ клиента сохранён во внутреннем комментарии'
        await this.openTask(this.selectedTask.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка сохранения ответа'
      } finally {
        this.inboundUpdateSaving = false
      }
    },
    async rejectInboundUpdate() {
      if (!this.selectedTask?.id || this.inboundUpdateSaving) return
      this.inboundUpdateSaving = true
      try {
        const response = await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/reject-inbound-update`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({})
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось отклонить обновление')
        this.notice = 'Обновление отклонено'
        await this.openTask(this.selectedTask.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка отклонения обновления'
      } finally {
        this.inboundUpdateSaving = false
      }
    },
    async applyTransition() {
      if (!this.selectedTask || !this.nextState) return
      await fetch(`/api/admin/chats/tasks/${this.selectedTask.id}/transition`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ toState: this.nextState })
      })
      await this.openTask(this.selectedTask.id)
      await this.loadTasks()
    },
    async approveMessage(id) {
      await fetch(`/api/admin/chats/messages/${id}/approve`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({})
      })
      await this.openTask(this.selectedTask.id)
    },
    async rejectMessage(id) {
      await fetch(`/api/admin/chats/messages/${id}/reject`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({})
      })
      await this.openTask(this.selectedTask.id)
    },
    async sendMessage(id) {
      try {
        if (!this.recipientReady) throw new Error('Сначала сохраните канал и номер получателя')
        const delivery = this.buildDeliveryPayload(id)
        const response = await fetch(`/api/admin/chats/messages/${id}/send`, {
          method: 'POST',
          headers: {
            ...this.headers(),
            'Idempotency-Key': `chat-message-send-${id}`
          },
          body: JSON.stringify({ delivery })
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          if (response.status === 409 && data?.code === 'WHATSAPP_TEMPLATE_REQUIRED') {
            this.forceTemplateMode(id)
            throw new Error('WhatsApp: свободный текст можно отправлять только в течение 24 часов после ответа клиента. Сейчас нужен approved template.')
          }
          throw new Error(data?.error || 'Не удалось отправить сообщение')
        }
        this.notice = data?.alreadySent ? 'Сообщение уже было отправлено — повторная отправка не выполнена' : 'Meta приняла сообщение. Ждём подтверждение доставки.'
        await this.openTask(this.selectedTask.id)
        await this.loadTasks()
      } catch (error) {
        this.notice = error?.message || 'Ошибка отправки сообщения'
      }
    },
    canSend(message) {
      return message.direction === 'outbound' && (message.approvalStatus === 'approved' || message.approvalStatus === null)
    },
    initializeDeliveryForms() {
      const next = { ...this.deliveryForms }
      const messages = Array.isArray(this.selectedTask?.messages) ? this.selectedTask.messages : []
      messages.forEach((message) => {
        if (!message?.id || message.direction !== 'outbound') return
        next[message.id] = next[message.id] || this.defaultDeliveryForm(message)
      })
      this.deliveryForms = next
    },
    parseBodyJson(message) {
      const raw = message?.bodyJson
      if (!raw) return {}
      if (typeof raw === 'object') return raw
      try {
        return JSON.parse(raw)
      } catch (_) {
        return {}
      }
    },
    messageChannel(message) {
      return String(message?.channel || this.selectedTask?.channel || '').trim().toLowerCase()
    },
    isWhatsappMessage(message) {
      return this.messageChannel(message) === 'whatsapp'
    },
    deliveryPayload(message) {
      const delivery = this.parseBodyJson(message)?.delivery
      return delivery && typeof delivery === 'object' ? delivery : {}
    },
    deliveryTrace(message) {
      const delivery = this.deliveryPayload(message)
      if (delivery?.policyTrace && typeof delivery.policyTrace === 'object') {
        return {
          ...delivery.policyTrace,
          reason: delivery.reason || delivery.policyTrace.reason || ''
        }
      }
      if (delivery?.recommended || delivery?.source === 'policy_guard') {
        return {
          rule: delivery.source || 'policy_guard',
          reason: delivery.reason || ''
        }
      }
      return null
    },
    deliveryRecommended(message) {
      const delivery = this.deliveryPayload(message)
      return Boolean(delivery?.recommended || delivery?.source === 'policy_guard')
    },
    defaultDeliveryForm(message) {
      const body = this.parseBodyJson(message)
      const delivery = body?.delivery && typeof body.delivery === 'object' ? body.delivery : {}
      const templateName = String(delivery.templateName || delivery.template_name || delivery.name || '').trim()
      const mode = String(delivery.mode || delivery.type || '').trim().toLowerCase()
      const variables = delivery.variables && typeof delivery.variables === 'object' ? delivery.variables : this.suggestTemplateVariables(message)
      return {
        mode: mode === 'template' || templateName ? 'template' : (this.isWhatsappMessage(message) && !this.whatsappFreeTextAllowed ? 'template' : 'free_text'),
        templateName: templateName || this.suggestTemplateName(message),
        language: String(delivery.language || delivery.languageCode || delivery.lang || this.suggestMessageLanguage()).trim() || 'en',
        variablesText: JSON.stringify(variables || {}, null, 2)
      }
    },
    deliveryForm(message) {
      const id = message?.id
      if (!id) return { mode: 'free_text', templateName: '', language: 'en', variablesText: '{}' }
      if (!this.deliveryForms[id]) {
        this.$set(this.deliveryForms, id, this.defaultDeliveryForm(message))
      }
      return this.deliveryForms[id]
    },
    updateDeliveryForm(messageId, field, value) {
      if (!messageId) return
      const current = this.deliveryForms[messageId] || { mode: 'free_text', templateName: '', language: 'en', variablesText: '{}' }
      this.$set(this.deliveryForms, messageId, { ...current, [field]: value })
    },
    setDeliveryMode(message, mode) {
      if (!message?.id) return
      const current = this.deliveryForm(message)
      this.$set(this.deliveryForms, message.id, {
        ...current,
        mode,
        templateName: current.templateName || this.suggestTemplateName(message),
        language: current.language || this.suggestMessageLanguage()
      })
    },
    knownTemplateName(templateName) {
      const name = String(templateName || '').trim()
      return this.whatsappTemplatePresets.some((tpl) => tpl.name === name) ? name : '__custom'
    },
    applyTemplatePreset(message, templateName) {
      if (!message?.id) return
      const current = this.deliveryForm(message)
      if (templateName === '__custom') {
        this.$set(this.deliveryForms, message.id, { ...current, templateName: '' })
        return
      }
      this.$set(this.deliveryForms, message.id, {
        ...current,
        mode: 'template',
        templateName,
        variablesText: JSON.stringify(this.suggestTemplateVariables(message, templateName), null, 2)
      })
    },
    forceTemplateMode(messageId) {
      const message = (this.selectedTask?.messages || []).find((row) => row.id === messageId)
      if (!message) return
      this.setDeliveryMode(message, 'template')
    },
    buildDeliveryPayload(messageId) {
      const message = (this.selectedTask?.messages || []).find((row) => row.id === messageId)
      const form = message ? this.deliveryForm(message) : this.deliveryForms[messageId]
      if (!form || form.mode !== 'template') return { mode: 'free_text' }
      const templateName = String(form.templateName || '').trim()
      if (!templateName) throw new Error('Для template-отправки укажите templateName.')
      let variables = {}
      const rawVariables = String(form.variablesText || '').trim()
      if (rawVariables) {
        try {
          variables = JSON.parse(rawVariables)
        } catch (_) {
          throw new Error('variables должны быть валидным JSON.')
        }
      }
      return {
        mode: 'template',
        templateName,
        language: String(form.language || 'en').trim() || 'en',
        variables
      }
    },
    suggestMessageLanguage() {
      return 'en'
    },
    contactReasonCode(message = null) {
      const reason = String(this.selectedTask?.order?.infoReason || message?.bodyText || '').toLowerCase()
      if (this.selectedTask?.taskType === 'dispatch_info') return 'trip'
      if (reason.includes('багаж') || reason.includes('luggage') || reason.includes('baggage') || reason.includes('bag') || reason.includes('suitcase') || reason.includes('чемодан')) return 'baggage'
      if (reason.includes('рейс') || reason.includes('flight') || reason.includes('arrival') || reason.includes('прилет') || reason.includes('прилёт')) return 'flight'
      if (reason.includes('пассажир') || reason.includes('passenger') || reason.includes('pax') || reason.includes('количество людей')) return 'passengers'
      if (reason.includes('адрес назначения') || reason.includes('место назначения') || reason.includes('destination') || reason.includes('drop-off') || reason.includes('dropoff')) return 'destination'
      return 'trip'
    },
    suggestTemplateName(message) {
      const code = this.contactReasonCode(message)
      const byReason = {
        baggage: 'riderra_baggage_request',
        flight: 'riderra_flight_request',
        passengers: 'riderra_passengers_request',
        destination: 'riderra_destination_request',
        trip: 'riderra_trip_message'
      }
      return byReason[code] || 'riderra_trip_message'
    },
    suggestTemplateVariables(message, templateName = '') {
      const order = this.selectedTask?.order || {}
      const pickupAt = order.pickupAt ? new Date(order.pickupAt) : null
      const pickupDate = pickupAt && Number.isFinite(pickupAt.getTime())
        ? pickupAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
        : ''
      const variables = {
        booking_number: this.publicOrderReference(order),
        route_from: order.fromPoint || '',
        route_to: order.toPoint || '',
        city: order.sourceCityCode || order.toPoint || order.fromPoint || 'your city',
        pickup_date: pickupDate || 'your trip date',
        question: String(message?.bodyText || '').trim()
      }
      const name = String(templateName || this.suggestTemplateName(message)).trim()
      if (name === 'riderra_trip_message') {
        variables.trip_details = String(message?.bodyText || '').trim()
      }
      return variables
    },
    templateHelp(templateName) {
      const tpl = this.whatsappTemplatePresets.find((row) => row.name === String(templateName || '').trim())
      if (!tpl) return 'Используйте только approved template из Meta. Если шаблон не из списка, проверьте точное имя и переменные.'
      const variables = tpl.variables?.length ? ` Переменные: ${tpl.variables.join(', ')}.` : ''
      return `${tpl.description}${variables}`
    },
    approvedTemplatePreview(message) {
      const form = this.deliveryForm(message)
      let variables = {}
      try { variables = JSON.parse(form.variablesText || '{}') } catch (_) {}
      const city = String(variables.city || '{{1}}')
      const pickupDate = String(variables.pickup_date || '{{2}}')
      const templates = {
        riderra_baggage_request: `Hello! We are writing to you regarding your transfer in ${city} on ${pickupDate}. Could you please clarify how many bags or suitcases you will have? Thank you!`,
        riderra_flight_request: `Hello! We are writing to you regarding your transfer in ${city} on ${pickupDate}. Could you please share your flight number? Thank you!`,
        riderra_passengers_request: `Hello! We are writing to you regarding your transfer in ${city} on ${pickupDate}. Could you please clarify how many passengers will be traveling? Thank you!`,
        riderra_destination_request: `Hello! We are writing to you regarding your transfer in ${city} on ${pickupDate}. Could you please share the exact destination address? Thank you!`,
        riderra_trip_message: `Hello! We are writing to you regarding your upcoming transfer in ${city} on ${pickupDate}. We will contact you here with important trip details. Thank you!`
      }
      return templates[form.templateName] || `Approved template: ${form.templateName || 'не выбран'}`
    },
    messageDisplayText(message) {
      const delivery = this.deliveryPayload(message)
      const isSentTemplate = message?.direction === 'outbound' && message?.approvalStatus === 'sent' && String(delivery?.mode || '').toLowerCase() === 'template'
      return isSentTemplate ? this.approvedTemplatePreview(message) : String(message?.bodyText || '')
    },
    deliveryHint(message) {
      if (!this.isWhatsappMessage(message)) return 'Для Telegram/OpenClaw можно отправлять обычный текст.'
      if (this.whatsappFreeTextAllowed) return 'Есть входящий ответ клиента за последние 24 часа: free text разрешён, template тоже можно выбрать вручную.'
      return 'WhatsApp вне 24-часового окна: Meta пропустит только approved template.'
    },
    lastInboundAtMs() {
      const messages = Array.isArray(this.selectedTask?.messages) ? this.selectedTask.messages : []
      return messages.reduce((max, message) => {
        if (message?.direction !== 'inbound') return max
        const ms = new Date(message.createdAt || 0).getTime()
        return Number.isFinite(ms) && ms > max ? ms : max
      }, 0)
    },
    agentProgressSteps(task) {
      const states = ['missing_data_detected', 'notify_draft', 'request_sent', 'customer_replied', 'pending_update_approval', 'closed']
      const labels = ['Готовит сообщение', 'Ждёт одобрения', 'Ждёт клиента', 'Разбирает ответ', 'Готовит благодарность', 'Завершено']
      const state = String(task?.state || '')
      const stateMap = {
        missing_data_detected: 0,
        ready_to_notify: 0,
        notify_draft: 1,
        request_sent: 2,
        notify_sent: 2,
        customer_replied: 3,
        field_validated: 3,
        field_rejected: 3,
        pending_update_approval: 4,
        order_complete: 4,
        notify_ack: 5,
        closed: 5,
        handoff_human: 3
      }
      const running = (task?.agentRuns || []).find((run) => ['queued', 'running'].includes(run.status))
      const activeIndex = running?.capability === 'riderra.customer.reply.classify' ? 3 : (running ? 0 : (stateMap[state] ?? 0))
      return states.map((key, index) => ({ key, label: labels[index], done: index < activeIndex || state === 'closed', current: index === activeIndex && state !== 'closed' }))
    },
    latestAgentActivity(task) {
      if (this.isWaitingForCustomer(task)) {
        return { title: 'Сообщение отправлено — ждём клиента', detail: 'Ответ появится в этом диалоге', live: false }
      }
      if (String(task?.state || '') === 'closed') {
        return { title: 'Диалог завершён', detail: 'Агент закончил работу по этой задаче', live: false }
      }
      if (String(task?.state || '') === 'handoff_human') {
        return { title: 'Нужна помощь сотрудника', detail: task?.lastError || 'Агент остановлен до решения сотрудника', live: false }
      }
      const runs = task?.agentRuns || []
      const run = runs.find((item) => ['queued', 'running'].includes(item.status)) || runs[0]
      if (!run) return { title: 'Агент готов к следующему шагу', detail: this.stateLabel(task?.state), live: false }
      const capability = {
        'riderra.customer.message.compose': 'Агент формулирует сообщение',
        'riderra.customer.reply.classify': 'Агент разбирает ответ',
        'riderra.order.field.extract_validate': 'Агент извлекает данные'
      }[run.capability] || 'Агент обрабатывает задачу'
      const status = { queued: 'В очереди', running: 'Выполняется', waiting_approval: 'Ждёт одобрения', completed: 'Завершено', failed: 'Нужна помощь сотрудника', fallback: 'Резервный режим' }[run.status] || run.status
      return { title: run.summary || capability, detail: `${status}${run.model ? ` · ${run.model}` : ''}`, live: ['queued', 'running'].includes(run.status) }
    },
    taskTypeLabel(code) {
      return code === 'dispatch_info' ? 'Рассылка' : 'Уточнение'
    },
    uiStateKey(code) {
      const value = String(code || '')
      if (this.isWaitingState(value)) return 'waiting_customer'
      if (value === 'handoff_human') return 'handoff_human'
      if (value === 'closed') return 'closed'
      if (['order_complete', 'ready_to_notify', 'notify_draft'].includes(value)) return 'draft_ready'
      return 'needs_reply'
    },
    stateLabel(code) {
      if (this.isWaitingState(code)) return 'Ждём клиента'
      const map = {
        missing_data_detected: 'Нужно ответить',
        customer_replied: 'Нужно ответить',
        pending_update_approval: 'Нужно ответить',
        field_validated: 'Нужно ответить',
        field_rejected: 'Нужно ответить',
        order_complete: 'Черновик готов',
        ready_to_notify: 'Черновик готов',
        notify_draft: 'Черновик готов',
        handoff_human: 'Передано человеку',
        closed: 'Закрыто'
      }
      return map[code] || code
    },
    isWaitingState(code) {
      return ['request_sent', 'notify_sent', 'notify_ack', 'notify_no_reply'].includes(String(code || ''))
    },
    isWaitingForCustomer(task) {
      return this.isWaitingState(task?.state)
    },
    directionLabel(code) {
      const map = { inbound: 'Входящее', outbound: 'Исходящее', internal: 'Внутреннее' }
      return map[code] || code
    },
    sourceLabel(code) {
      const map = { operator: 'Оператор', openclaw: 'OpenClaw', customer: 'Клиент', system: 'Система' }
      return map[code] || code
    },
    agentLabel(task) {
      const agent = task?.agentConfig
      if (!agent) return 'Агент: без назначения'
      const name = agent.name || agent.code || 'agent'
      return agent.isActive === false ? `Агент: ${name} (inactive)` : `Агент: ${name}`
    },
    isTaskMine(task) {
      const mineId = String(this.currentUserId || '').trim()
      const assigned = String(task?.assignedToUserId || '').trim()
      return Boolean(mineId && assigned && mineId === assigned)
    },
    ownerLabel(task) {
      const owner = task?.assignedOwner
      if (!owner?.id) return '—'
      if (this.isTaskMine(task)) return `${owner.email || owner.id} (я)`
      return owner.email || owner.id
    },
    ownerDisplayLabel(task) {
      const owner = task?.assignedOwner
      if (this.isTaskMine(task)) return 'Моё'
      if (!owner?.id) return 'Без владельца'
      return owner.email || owner.id
    },
    messageCountLabel(task) {
      const count = Math.max(0, Number(task?.unreadCount || 0))
      if (count === 0) return 'Нет новых сообщений'
      if (count === 1) return '1 новое сообщение'
      if (count > 1 && count < 5) return `${count} новых сообщения`
      return `${count} новых сообщений`
    },
    readyDraftMessage(task) {
      const messages = Array.isArray(task?.messages) ? task.messages : []
      return messages.find((message) => this.canSend(message)) || null
    },
    hasReadyDraft(task) {
      return Boolean(this.readyDraftMessage(task))
    },
    hasDraftAwaitingApproval(task) {
      const messages = Array.isArray(task?.messages) ? task.messages : []
      return messages.some((message) => message?.direction === 'outbound' && message?.approvalStatus === 'pending_human')
    },
    agentStatusLabel(task) {
      return task?.agentPaused ? 'Агент на паузе' : 'Агент работает'
    },
    agentToggleLabel(task) {
      return task?.agentPaused ? 'Возобновить работу агента' : 'Поставить агента на паузу'
    },
    cardActionLabel(task) {
      if (this.isWaitingForCustomer(task)) return 'Ждём клиента'
      if (String(task?.state || '') === 'notify_draft') return 'Проверить черновик'
      if (this.hasReadyDraft(task)) return 'Отправить'
      if (['ready_to_notify', 'order_complete'].includes(String(task?.state || ''))) return 'Проверить черновик'
      return 'Открыть'
    },
    cardActionDisabled(task) {
      return this.isWaitingForCustomer(task)
    },
    async runCardAction(task) {
      if (!task?.id || this.cardActionDisabled(task)) return
      await this.openTask(task.id)
      if (this.hasReadyDraft(this.selectedTask) && this.cardActionLabel(this.selectedTask) === 'Отправить') {
        const message = this.readyDraftMessage(this.selectedTask)
        if (message?.id) await this.sendMessage(message.id)
      }
    },
    isTaskSelected(taskId) {
      return this.selectedTaskIds.includes(taskId)
    },
    toggleTaskSelection(taskId, checked) {
      if (!taskId) return
      if (checked) {
        if (!this.selectedTaskIds.includes(taskId)) this.selectedTaskIds.push(taskId)
      } else {
        this.selectedTaskIds = this.selectedTaskIds.filter((id) => id !== taskId)
      }
    },
    selectAllDisplayed() {
      this.selectedTaskIds = this.displayedTasks.map((task) => task.id)
    },
    clearSelection() {
      this.selectedTaskIds = []
    },
    async bulkAssignToMe() {
      if (!this.selectedTaskIds.length || this.bulkLoading) return
      this.bulkLoading = true
      try {
        const response = await fetch('/api/admin/chats/tasks/bulk/assign-to-me', {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ taskIds: this.selectedTaskIds })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось назначить задачи')
        this.notice = `Назначено на вас: ${data.updated || 0}`
        await this.loadTasks()
        if (this.selectedTask?.id) await this.openTask(this.selectedTask.id)
      } catch (error) {
        this.notice = error?.message || 'Ошибка массового назначения'
      } finally {
        this.bulkLoading = false
      }
    },
    async bulkMoveToHandoff() {
      if (!this.selectedTaskIds.length || this.bulkLoading) return
      this.bulkLoading = true
      try {
        const response = await fetch('/api/admin/chats/tasks/bulk/transition', {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            taskIds: this.selectedTaskIds,
            toState: 'handoff_human',
            reason: 'bulk_handoff_from_queue'
          })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Не удалось передать задачи человеку')
        this.notice = `Передано человеку: ${data.updated || 0}, пропущено: ${data.skipped || 0}`
        await this.loadTasks()
        if (this.selectedTask?.id) await this.openTask(this.selectedTask.id)
      } catch (error) {
        this.notice = error?.message || 'Ошибка массового перехода'
      } finally {
        this.bulkLoading = false
      }
    },
    getSlaMeta(task) {
      const updatedMs = new Date(task?.updatedAt || 0).getTime()
      if (!Number.isFinite(updatedMs) || updatedMs <= 0) return { code: 'unknown', label: 'Без SLA', weight: 0 }
      const elapsedMin = Math.floor((Date.now() - updatedMs) / 60000)
      const state = String(task?.state || '')
      const taskType = String(task?.taskType || '')

      if (this.isWaitingState(state)) return { code: 'waiting', label: 'Ждём клиента', weight: 0 }

      const dueByState = {
        missing_data_detected: 15,
        customer_replied: 10,
        ready_to_notify: 15,
        notify_draft: 15,
        handoff_human: 20
      }
      const due = dueByState[state] || (taskType === 'clarification' ? 45 : 60)
      if (elapsedMin > due) return { code: 'overdue', label: `Просрочено на ${elapsedMin - due} мин`, weight: 3 }
      const left = Math.max(due - elapsedMin, 0)
      if (elapsedMin > Math.floor(due * 0.7)) return { code: 'warning', label: `Ответить за ${left} мин`, weight: 2 }
      return { code: 'ok', label: `Ответить за ${left} мин`, weight: 1 }
    },
    slaLabel(task) {
      return this.getSlaMeta(task).label
    },
    slaBadgeClass(task) {
      const code = this.getSlaMeta(task).code
      if (code === 'no_reply' || code === 'overdue') return 'badge--sla-critical'
      if (code === 'warning') return 'badge--sla-warning'
      if (code === 'waiting') return ''
      if (code === 'ok') return 'badge--sla-ok'
      return ''
    },
    compareBySortMode(a, b) {
      const updatedA = new Date(a?.updatedAt || 0).getTime()
      const updatedB = new Date(b?.updatedAt || 0).getTime()
      if (this.sortMode === 'updated_desc') return updatedB - updatedA
      if (this.sortMode === 'updated_asc') return updatedA - updatedB

      const slaA = this.getSlaMeta(a).weight
      const slaB = this.getSlaMeta(b).weight
      if (slaB !== slaA) return slaB - slaA
      const pA = Number(a?.priority ?? 999)
      const pB = Number(b?.priority ?? 999)
      if (pA !== pB) return pA - pB
      return updatedB - updatedA
    },
    approvalLabel(code) {
      const map = {
        pending_human: 'Ожидает одобрения',
        approved: 'Одобрено',
        rejected: 'Отклонено',
        expired: 'Истекло',
        sent: 'Отправлено'
      }
      return map[code] || code
    },
    deliveryStatusLabel(code) {
      const map = {
        accepted: 'Принято Meta',
        delivered: 'Доставлено',
        read: 'Прочитано',
        failed: 'Ошибка доставки'
      }
      return map[code] || code
    },
    deliveryStatusClass(code) {
      if (code === 'failed') return 'badge--sla-critical'
      if (code === 'delivered' || code === 'read') return 'badge--sla-ok'
      return 'badge--state'
    },
    orderLabel(order) {
      if (!order) return '-'
      return order.externalKey || order.id
    },
    routeLabel(order) {
      if (!order) return '-'
      const parts = []
      if (order.fromPoint) parts.push(order.fromPoint)
      if (order.toPoint) parts.push(order.toPoint)
      return parts.length ? parts.join(' -> ') : '-'
    },
    formatDate(value) {
      if (!value) return '-'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
    },
    formatMoney(value) {
      const n = Number(value)
      return Number.isFinite(n) ? `${n.toFixed(2)} EUR` : '-'
    },
    isTechnicalOrderReference(value = '') {
      const raw = String(value || '').trim()
      if (!raw) return true
      const lower = raw.toLowerCase()
      if (lower.startsWith('google_sheet:')) return true
      if (lower.includes('google_sheet')) return true
      if (lower.includes('spreadsheets/d/')) return true
      if (raw.split(':').length >= 4) return true
      if (/^\d+\.0+$/.test(raw)) return true
      if (/^\d{1,3}$/.test(raw)) return true
      return false
    },
    publicOrderReference(order = null) {
      const candidates = [
        order?.sourceBookingId,
        order?.sourceOrderNumber,
        order?.sourceInternalOrderNumber,
        String(order?.source || '').trim() === 'google_sheet' ? '' : order?.externalKey
      ]
      for (const candidate of candidates) {
        const value = String(candidate || '').trim()
        if (value && !this.isTechnicalOrderReference(value)) return value
      }
      return ''
    },
    applyClarificationTemplate(template) {
      const order = this.selectedTask?.order || {}
      const isRu = String(order.lang || '').trim().toLowerCase() === 'ru'
      const publicReference = this.publicOrderReference(order)
      const orderKey = publicReference
        ? (isRu ? `Номер заказа: ${publicReference}. ` : `Booking number: ${publicReference}. `)
        : ''
      const route = this.routeLabel(order)
      const infoReason = String(order.infoReason || '').trim()
      const base = isRu ? 'Здравствуйте! Это Riderra. ' : 'Hello! This is Riderra. '
      const closing = isRu
        ? 'Спасибо! После ответа сразу подтвердим детали поездки.'
        : 'Thank you. Once we receive your reply, we will confirm the trip details.'
      const mapRu = {
        generic: `${base}${orderKey}${infoReason ? `Подскажите, пожалуйста: ${infoReason}. ` : `Подскажите, пожалуйста, недостающие детали по поездке${route && route !== '-' ? ` (${route})` : ''}. `}${closing}`,
        luggage: `${base}${orderKey}Подскажите, пожалуйста, сколько чемоданов и сумок будет с собой? Если есть крупный багаж, детская коляска или нестандартные вещи, напишите тоже. ${closing}`,
        flight: `${base}${orderKey}Подскажите, пожалуйста, номер рейса и дату прилёта/вылета. Это нужно, чтобы водитель корректно отследил рейс. ${closing}`,
        pickup: `${base}${orderKey}Уточните, пожалуйста, точное место подачи (адрес/терминал/вход). ${closing}`
      }
      const mapEn = {
        generic: `${base}${orderKey}Could you please clarify the missing booking details${route && route !== '-' ? ` (${route})` : ''}? ${closing}`,
        luggage: `${base}${orderKey}Could you please tell us how many suitcases and bags you will have? If you have oversized luggage, a stroller, or any non-standard items, please mention that too. ${closing}`,
        flight: `${base}${orderKey}Could you please send us your flight number and arrival/departure date? This helps the driver track the flight correctly. ${closing}`,
        pickup: `${base}${orderKey}Could you please confirm the exact pickup point: address, terminal, entrance, or a clear landmark? ${closing}`
      }
      const map = isRu ? mapRu : mapEn
      this.draftText = map[template] || map.generic
    },
    stringifyTrace(value) {
      try {
        return JSON.stringify(value || {}, null, 2)
      } catch (_) {
        return '{}'
      }
    },
    getCapabilityOutput(name) {
      if (!this.lastStepTrace) return null
      const rows = Array.isArray(this.lastStepTrace.capabilities) ? this.lastStepTrace.capabilities : []
      const row = rows.find((item) => item && item.name === name)
      return row?.output || null
    }
  }
}
</script>

<style scoped>
.chat-mode-switch {
  display: flex;
  gap: 8px;
  margin: 0 0 16px;
}
.admin-chat-page { min-height: 100vh; color: #17233d; }
.chat-section { padding-top: 26px; padding-bottom: 40px; }
.container { max-width: 1480px; }
.page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-bottom: 14px; }
.page-head h1 { margin: 0; font-size: 34px; line-height: 1.1; color: #17233d; }
.page-subtitle { margin: 6px 0 0; max-width: 760px; color: #60708f; font-size: 15px; line-height: 1.55; }
.page-actions { display: flex; gap: 8px; }
.filters { display: grid; grid-template-columns: repeat(4, minmax(180px, 1fr)); gap: 10px; margin-bottom: 12px; align-items: center; }
.advanced-filters { border: 1px solid #d8d9e6; border-radius: 12px; background: #fff; padding: 10px 12px; margin-bottom: 14px; }
.advanced-filters summary { cursor: pointer; font-weight: 800; color: #17233d; }
.advanced-filters__grid { display: grid; grid-template-columns: repeat(4, minmax(180px, 1fr)); gap: 10px; margin-top: 10px; align-items: center; }
.quick-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #334155;
  border: 1px solid #d8d9e6;
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
}
.quick-filter input { margin: 0; }
.agent-card { border: 1px solid #d8d9e6; border-radius: 12px; background: #fff; padding: 12px; margin-bottom: 12px; }
.agent-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
.agent-head h3 { margin: 0; }
.agent-head-actions { display: flex; gap: 8px; align-items: center; }
.agent-grid { display: grid; grid-template-columns: 1.2fr 1fr 180px 180px 140px 220px; gap: 8px; margin-bottom: 8px; }
.agent-grid--meta { grid-template-columns: repeat(5, minmax(160px, 1fr)); }
.preset-row { display: flex; gap: 6px; flex-wrap: wrap; margin: 4px 0 10px; }
.compact { min-width: 280px; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.field span { font-size: 13px; color: #334155; }
.toggle { display: inline-flex; align-items: center; gap: 6px; color: #334155; border: 1px solid #d8d9e6; border-radius: 8px; padding: 8px; }
.textarea--code { font-family: Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 12px; min-height: 96px; }
.agent-actions { display: flex; justify-content: flex-end; }
.test-output { white-space: pre-wrap; background: #0b1220; color: #e2e8f0; border-radius: 8px; padding: 10px; font-size: 12px; max-height: 220px; overflow: auto; }
.workspace { display: grid; grid-template-columns: minmax(340px, 420px) minmax(0, 1fr); gap: 14px; align-items: start; }
.queue, .detail-pane { background: #fff; border: 1px solid #d8d9e6; border-radius: 12px; min-height: 680px; }
.queue { padding: 10px; overflow: auto; max-height: calc(100vh - 190px); position: sticky; top: 14px; }
.queue-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-weight: 700; margin-bottom: 10px; }
.queue-head-meta { font-size: 12px; font-weight: 500; color: #64748b; }
.queue-bulk { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; padding: 8px; border: 1px solid #dbe4f0; border-radius: 10px; background: #f8fafc; }
.queue-bulk__count { display: inline-flex; align-items: center; color: #475569; font-size: 12px; font-weight: 800; padding: 0 4px; }
.queue-item { width: 100%; border: 1px solid #d6dceb; border-radius: 10px; background: #f8fbff; padding: 12px; margin-bottom: 8px; text-align: left; cursor: pointer; transition: border-color .15s ease, box-shadow .15s ease, background .15s ease; }
.queue-item:hover { border-color: #b9c5dc; background: #fff; }
.queue-item--active { border-color: #702283; box-shadow: 0 0 0 1px #702283 inset; background: #fcf7fd; }
.queue-check { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; margin-bottom: 8px; }
.queue-owner { color: #334155; margin-bottom: 6px; font-size: 12px; }
.queue-title { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; font-weight: 700; }
.queue-title-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
.queue-route { color: #17233d; margin-bottom: 5px; font-size: 16px; line-height: 1.28; font-weight: 900; }
.queue-status { color: #60708f; margin-bottom: 8px; font-size: 13px; line-height: 1.35; }
.queue-agent { color: #475569; margin-bottom: 6px; font-size: 12px; }
.queue-meta { display: flex; gap: 8px; flex-wrap: wrap; color: #64748b; font-size: 12px; }
.queue-card-action { margin-top: 10px; display: flex; justify-content: flex-end; }
.detail-pane { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.dialog { border: 1px solid #e5eaf1; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; min-height: 320px; }
.dialog-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; border-bottom: 1px solid #edf1f6; padding-bottom: 10px; margin-bottom: 10px; }
.dialog-head h3 { margin: 0 0 6px; font-size: 22px; line-height: 1.25; color: #17233d; }
.dialog-head-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
.dialog-status-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.agent-progress { display:grid; gap:10px; border:1px solid #dbe4f0; border-radius:12px; background:#f8fafc; padding:12px; margin-bottom:10px; }
.agent-progress__head { display:flex; justify-content:space-between; gap:10px; align-items:center; }
.agent-progress__head > div { display:grid; gap:3px; }
.agent-progress__head span { color:#64748b; font-size:12px; }
.agent-live { border-radius:999px; background:#dcfce7; color:#166534 !important; padding:6px 9px; font-weight:800; animation:agent-live-pulse 1.4s ease-in-out infinite; }
@keyframes agent-live-pulse { 50% { opacity:.62; } }
.agent-progress__steps { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:6px; }
.agent-progress__step { display:flex; align-items:center; gap:6px; min-width:0; color:#94a3b8; }
.agent-progress__step > span { display:grid; place-items:center; width:22px; height:22px; flex:0 0 22px; border-radius:50%; border:1px solid #cbd5e1; background:#fff; font-size:10px; font-weight:900; }
.agent-progress__step small { overflow:hidden; text-overflow:ellipsis; font-size:10px; font-weight:800; line-height:1.2; }
.agent-progress__step--done { color:#166534; }
.agent-progress__step--done > span { border-color:#86efac; background:#dcfce7; }
.agent-progress__step--current { color:#17233d; }
.agent-progress__step--current > span { border-color:#17233d; background:#17233d; color:#fff; }
.recipient-card { border: 1px solid #dbe4f0; border-radius: 12px; background: #f8fafc; padding: 12px; margin-bottom: 10px; }
.recipient-card__head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; margin-bottom: 10px; }
.recipient-card__head h4, .recipient-card__head p { margin: 0; }
.recipient-card__badges { display: flex; gap: 6px; flex-wrap: wrap; }
.recipient-card__grid { display: grid; grid-template-columns: 140px minmax(210px, 1fr) auto auto; gap: 10px; align-items: end; }
.recipient-card__grid label:not(.recipient-test-toggle) { display: flex; flex-direction: column; gap: 4px; color: #475569; font-size: 12px; font-weight: 700; }
.recipient-test-toggle { display: inline-flex; gap: 7px; align-items: center; min-height: 38px; color: #334155; font-weight: 700; }
.recipient-warning { margin-top: 10px; border: 1px solid #fde68a; border-radius: 9px; background: #fffbeb; color: #92400e; padding: 9px 10px; font-size: 13px; }
.messages { overflow: auto; display: flex; flex-direction: column; gap: 8px; }
.message { border: 1px solid #e5eaf1; border-radius: 10px; padding: 8px 10px; background: #fff; }
.message--outbound { background: #f0f9ff; border-color: #bae6fd; }
.message--inbound { background: #f8fafc; }
.message-head { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; color: #64748b; font-size: 12px; margin-bottom: 6px; }
.message-body { white-space: pre-wrap; color: #1f2937; }
.send-preview { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1; color: #475569; font-size: 12px; }
.quick-templates { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.btn--tiny { padding: 6px 10px; font-size: 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; color: #0f172a; }
.message-actions { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
.delivery-panel { margin-top: 10px; border: 1px solid #dbe4f0; border-radius: 10px; background: #fff; padding: 10px; }
.delivery-panel--warning { border-color: #fde68a; background: #fffbeb; }
.delivery-panel__head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; margin-bottom: 8px; }
.delivery-mode { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 8px; }
.delivery-radio { display: inline-flex; gap: 6px; align-items: center; font-weight: 700; color: #1e2a44; cursor: pointer; }
.delivery-template-grid { display: grid; grid-template-columns: minmax(180px, 1fr) 120px; gap: 8px; align-items: start; }
.delivery-template-grid label { display: flex; flex-direction: column; gap: 4px; color: #475569; font-size: 12px; font-weight: 700; }
.delivery-template-grid__wide { grid-column: 1 / -1; }
.delivery-vars { min-height: 74px; margin-bottom: 0; }
.template-help { border: 1px dashed #cbd5e1; border-radius: 8px; background: #f8fafc; color: #475569; font-size: 12px; line-height: 1.35; padding: 8px; }
.template-preview { border: 1px solid #bbf7d0; border-radius: 8px; background: #f0fdf4; color: #14532d; padding: 10px; font-size: 13px; line-height: 1.45; }
.template-preview p { margin: 5px 0 0; }
.delivery-settings { margin-top: 10px; }
.delivery-settings summary { cursor: pointer; color: #475569; font-size: 13px; font-weight: 700; }
.delivery-settings .delivery-mode { margin-top: 10px; }
.policy-trace { margin-top: 8px; border: 1px solid #dbe4f0; border-radius: 8px; background: #f8fafc; padding: 8px; }
.policy-trace summary { cursor: pointer; font-weight: 800; color: #17233d; }
.policy-trace__grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 8px; margin-top: 8px; }
.policy-trace__grid div { border: 1px solid #e5eaf1; border-radius: 8px; background: #fff; padding: 8px; }
.policy-trace__grid span { display: block; color: #64748b; font-size: 11px; margin-bottom: 3px; }
.policy-trace__grid strong { color: #17233d; font-size: 12px; word-break: break-word; }
.policy-trace__json { white-space: pre-wrap; word-break: break-word; background: #0b1220; color: #dbeafe; border-radius: 8px; padding: 8px; font-size: 11px; max-height: 180px; overflow: auto; margin: 8px 0 0; }
.actions { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
.outcome-panel {
  border: 1px solid #d8e0ee;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  padding: 12px;
  margin-bottom: 10px;
}
.outcome-panel--attention { border-color: #f4d48b; background: linear-gradient(180deg, #fffdf5 0%, #fff7df 100%); }
.outcome-panel--warn { border-color: #fecaca; background: linear-gradient(180deg, #fff 0%, #fff1f2 100%); }
.outcome-panel--success { border-color: #bbf7d0; background: linear-gradient(180deg, #fff 0%, #f0fdf4 100%); }
.outcome-panel__head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; margin-bottom: 10px; }
.outcome-panel__head h4 { margin: 0 0 4px; }
.outcome-panel__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
.outcome-panel__grid div {
  border: 1px solid rgba(216,224,238,.8);
  border-radius: 10px;
  background: rgba(255,255,255,.72);
  padding: 8px;
}
.outcome-panel__grid span,
.outcome-panel__patch > span {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.outcome-panel__grid strong { display: block; color: #17233d; font-size: 14px; margin-top: 3px; word-break: break-word; }
.outcome-panel__patch { margin-bottom: 10px; }
.patch-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.patch-chip {
  border-radius: 999px;
  background: #17233d;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  padding: 5px 8px;
}
.actions-block { border: 1px solid #e5eaf1; border-radius: 10px; padding: 10px; margin-bottom: 10px; }
.actions-block h4 { margin: 0 0 8px; }
.section-summary { cursor: pointer; font-weight: 800; list-style: none; margin: -10px; padding: 10px; color: #17233d; background: #fcf7fd; }
.section-summary::-webkit-details-marker { display: none; }
.actions-block[open] .section-summary { border-bottom: 1px solid #e5eaf1; }
.actions-block > :not(summary) { padding-top: 10px; }
.trace-wrap { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #1e293b; }
.trace-row { line-height: 1.35; }
.trace-row--caps { margin-top: 4px; }
.review-gate { margin-top: 10px; border: 1px solid #f4d48b; background: #fff8e6; border-radius: 10px; padding: 10px; }
.review-gate--inline { margin-top: 0; }
.review-gate__actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.trace-cap { border: 1px solid #ead7f0; border-radius: 8px; background: #fcf7fd; padding: 8px; }
.trace-cap-name { font-weight: 700; font-size: 12px; color: #0f172a; }
.trace-cap-meta { font-size: 12px; color: #475569; margin: 4px 0; }
.trace-json { white-space: pre-wrap; word-break: break-word; background: #0b1220; color: #dbeafe; border-radius: 6px; padding: 6px; font-size: 11px; max-height: 160px; overflow: auto; margin: 0; }
.trace-time { color: #64748b; font-size: 12px; margin-top: 4px; }
.draft-recommended { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin: 12px 0; padding: 12px; border: 1px solid #d8e0ee; border-radius: 10px; background: #f8fafc; }
.draft-recommended > div { display: flex; flex-direction: column; gap: 3px; color: #64748b; }
.draft-recommended strong { color: #17233d; }
.draft-recommended .btn { flex: 0 0 auto; }
.draft-review { margin: 12px 0; padding: 14px; border: 1px solid #bae6fd; border-radius: 10px; background: #f0f9ff; }
.draft-review .message-body { font-size: 16px; line-height: 1.5; }
.draft-divider { display: flex; align-items: center; gap: 10px; margin: 12px 0 8px; color: #64748b; font-size: 12px; font-weight: 700; }
.draft-divider::before, .draft-divider::after { content: ''; height: 1px; flex: 1; background: #e5eaf1; }
.message-draft-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
.input { border: 1px solid #d8d8e6; border-radius: 8px; padding: 8px 10px; width: 100%; background: #fff; color: #1e2a44; }
.textarea { min-height: 110px; resize: vertical; margin-bottom: 8px; }
.badge { display: inline-flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 999px; padding: 2px 8px; font-size: 12px; color: #334155; background: #fff; }
.badge--state { border-color: #bae6fd; color: #0c4a6e; background: #e0f2fe; }
.badge--mine { border-color: #86efac; background: #dcfce7; color: #166534; }
.badge--sla-ok { border-color: #bbf7d0; background: #dcfce7; color: #166534; }
.badge--sla-warning { border-color: #fde68a; background: #fef3c7; color: #92400e; }
.badge--sla-critical { border-color: #fecaca; background: #fee2e2; color: #991b1b; }
.hint { color: #64748b; }
.empty { color: #64748b; padding: 14px; }
.empty--center { margin: auto; text-align: center; font-size: 18px; font-weight: 800; color: #60708f; }
.empty--queue { border: 1px dashed #cbd5e1; border-radius: 10px; text-align: center; background: #f8fafc; }
@media (max-width: 1300px) {
  .agent-grid { grid-template-columns: 1fr; }
  .agent-grid--meta { grid-template-columns: 1fr; }
  .agent-head { flex-direction: column; align-items: flex-start; }
  .agent-head-actions { width: 100%; flex-direction: column; align-items: stretch; }
  .compact { min-width: 0; width: 100%; }
  .workspace { grid-template-columns: 1fr; }
  .queue, .detail-pane, .dialog { min-height: auto; }
  .queue { position: static; max-height: none; }
  .filters, .advanced-filters__grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .chat-mode-switch {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chat-mode-switch .btn {
    width: 100%;
    min-width: 0;
    white-space: normal;
  }

  .chat-mode-switch__sandbox {
    grid-column: 1 / -1;
  }

  .page-head,
  .page-actions,
  .queue-head,
  .dialog-head,
  .dialog-head-actions,
  .draft-recommended,
  .message-actions,
  .message-draft-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .delivery-panel__head,
  .delivery-template-grid {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }
  .policy-trace__grid { grid-template-columns: 1fr; }
  .recipient-card__head { flex-direction: column; }
  .recipient-card__grid { grid-template-columns: 1fr; }
  .agent-progress__head { flex-direction:column; align-items:flex-start; }
  .agent-progress__steps { grid-template-columns:repeat(2,minmax(0,1fr)); }

  .page-actions .btn,
  .queue-bulk .btn,
  .message-actions .btn,
  .message-draft-actions .btn {
    width: 100%;
  }

  .queue-item,
  .actions-block,
  .dialog,
  .queue,
  .detail-pane {
    padding-left: 10px;
    padding-right: 10px;
  }
}
</style>
