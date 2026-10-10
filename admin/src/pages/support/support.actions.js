export function createSupportActions(context) {
  const { supportApi, canWrite, isSuperAdministrator, supportSettings, settingsLoader, notify, requestConfirmation, displayError, section, recipientType, recipientId, recipientCountryCode, recipientPhone, recipientLookupMode, recipientOptions, recipientSearching, recipientSearchPerformed, recipientSearchError, draft, conversations, messages, selectedId, busy, inboxLoading, inboxLoaded, inboxError, messagesLoading, messagesLoaded, messagesError, actionError, participantProfile, participantProfileLoading, participantProfileError, agentActionId, agentsLoading, agentsLoaded, agentsError, agents, agentForm, savingSettings, settingsSaved, settingsDraft, serviceEnabled, requests, scrollMessagesToEnd } = context
  const loadInbox = async () => {
    const request = ++requests.inbox
      if (!inboxLoaded.value) inboxError.value = ''
    inboxLoading.value = true
    try {
      const response = await supportApi.listConversations()
      if (request !== requests.inbox) return
      conversations.value = response.data || []
      inboxLoaded.value = true
      inboxError.value = ''
      if (selectedId.value && section.value === 'inbox' && !conversations.value.some(item => item.id === selectedId.value)) {
        selectedId.value = ''; messages.value = []; messagesLoaded.value = false; participantProfile.value = null; requests.messages += 1; requests.profile += 1
      }
    } catch (cause) { if (request === requests.inbox) inboxError.value = displayError(cause) }
    finally { if (request === requests.inbox) inboxLoading.value = false }
      if (request === requests.inbox && !inboxError.value && selectedId.value && section.value === 'inbox' && !messagesLoading.value) await selectConversation(selectedId.value, false)
  }
  const selectConversation = async (id, clear = true) => {
    const request = ++requests.messages
    const profileRequest = ++requests.profile
    if (selectedId.value !== id) { draft.value = ''; requests.pendingReply = null }
    selectedId.value = id
      if (clear) { messages.value = []; messagesLoaded.value = false; messagesError.value = ''; participantProfile.value = null; participantProfileError.value = '' }
    messagesLoading.value = true
    try {
      const response = await supportApi.listMessages(id)
      if (request === requests.messages && selectedId.value === id) { messages.value = response.data || []; messagesLoaded.value = true; messagesError.value = ''; await scrollMessagesToEnd(); await loadParticipantProfile(response.conversation || conversations.value.find(item => item.id === id), profileRequest) }
    } catch (cause) { if (request === requests.messages && selectedId.value === id) messagesError.value = displayError(cause) }
    finally { if (request === requests.messages) messagesLoading.value = false }
  }
  const loadParticipantProfile = async (conversation, request = ++requests.profile) => {
    if (!conversation?.participantId || !conversation.participantType) { participantProfile.value = null; participantProfileLoading.value = false; return }
    participantProfileLoading.value = true
    participantProfileError.value = ''
    try {
      const profile = await supportApi.participantProfile(conversation)
      if (request === requests.profile && selectedId.value === conversation.id) participantProfile.value = profile
    } catch (cause) {
      if (request === requests.profile && selectedId.value === conversation.id) participantProfileError.value = displayError(cause)
    } finally {
      if (request === requests.profile) participantProfileLoading.value = false
    }
  }
  const backToInbox = () => {
    selectedId.value = ''
    messages.value = []
    messagesLoaded.value = false
    messagesError.value = ''
    participantProfile.value = null
    participantProfileError.value = ''
    participantProfileLoading.value = false
    requests.messages += 1
    requests.profile += 1
  }
  const sendReply = async () => {
    if (!canWrite.value || !serviceEnabled.value || !selectedId.value || !draft.value.trim() || busy.value) return
    busy.value = true
    actionError.value = ''
    let sent = false
    try {
      const text = draft.value.trim()
      const conversationId = selectedId.value
      if (requests.pendingReply?.text !== text || requests.pendingReply?.conversationId !== conversationId) requests.pendingReply = { text, conversationId, id: `m${Date.now()}${Math.random().toString(36).slice(2, 12)}` }
      await supportApi.sendMessage(conversationId, text, requests.pendingReply.id)
      requests.pendingReply = null
      if (selectedId.value === conversationId && draft.value.trim() === text) draft.value = ''
      sent = true
    } catch (cause) { actionError.value = displayError(cause) }
    finally { busy.value = false }
    if (sent) { notify('回覆已發送'); await loadInbox() }
  }
  const normalizePhoneSearch = value => {
    const digits = String(value || '').replace(/\D/g, '')
    for (const prefix of ['852', '853', '86']) {
      if (digits.startsWith(prefix) && digits.length > prefix.length + 4) return digits.slice(prefix.length)
    }
    return digits
  }
  const resetRecipientSearch = () => {
    recipientId.value = ''
    recipientOptions.value = []
    recipientSearchPerformed.value = false
    recipientSearchError.value = ''
  }
  const searchRecipients = async () => {
    if (!canWrite.value || !serviceEnabled.value || recipientSearching.value) return
    const phone = normalizePhoneSearch(`${recipientCountryCode.value}${recipientPhone.value}`)
    recipientSearchPerformed.value = true
    recipientSearchError.value = ''
    recipientOptions.value = []
    recipientId.value = ''
    if (phone.length < 4) {
      recipientSearchError.value = '請輸入至少 4 位電話號碼'
      return
    }
    recipientSearching.value = true
    try {
      const response = await supportApi.searchRecipients(recipientType.value, phone)
      recipientOptions.value = response.data || []
    } catch (cause) {
      recipientSearchError.value = displayError(cause)
    } finally {
      recipientSearching.value = false
    }
  }
  const selectRecipient = item => {
    recipientId.value = item.id || ''
    recipientSearchError.value = ''
  }
  const openRecipient = async () => {
    if (!canWrite.value || !serviceEnabled.value || !recipientId.value.trim() || busy.value) return
    busy.value = true
    actionError.value = ''
    try {
      const response = await supportApi.openConversation(recipientType.value, recipientId.value.trim())
      section.value = 'inbox'
      notify('對話已開啟')
      await loadInbox()
      await selectConversation(response.id)
    } catch (cause) { actionError.value = displayError(cause) }
    finally { busy.value = false }
  }
  const loadAgents = async () => {
    if (!isSuperAdministrator.value) return
    const request = ++requests.agents
      if (!agentsLoaded.value) agentsError.value = ''
    agentsLoading.value = true
    try { const response = await supportApi.listAgents(); if (request === requests.agents) { agents.value = response.data || []; agentsLoaded.value = true; agentsError.value = '' } }
    catch (cause) { if (request === requests.agents) agentsError.value = displayError(cause) }
    finally { if (request === requests.agents) agentsLoading.value = false }
  }
  const createAgent = async () => {
    if (!canWrite.value || !isSuperAdministrator.value || busy.value || agentActionId.value) return
    busy.value = true
    actionError.value = ''
    try {
      await supportApi.createAgent(agentForm)
      agentForm.username = ''; agentForm.displayName = ''; agentForm.password = ''
      notify('客服帳戶已建立')
      await loadAgents()
    } catch (cause) { actionError.value = displayError(cause) }
    finally { busy.value = false }
  }
  const setAgentEnabled = async agent => {
    if (!canWrite.value || !isSuperAdministrator.value || busy.value || agentActionId.value) return
    agentActionId.value = agent.id
    try {
      if (agent.enabled && !await requestConfirmation({ title: '停用客服帳戶', message: `確定停用「${agent.displayName}」？此帳戶的現有登入工作階段會立即失效。`, confirmLabel: '停用', danger: true })) return
      actionError.value = ''
      await supportApi.setAgentEnabled(agent.id, !agent.enabled)
      notify(agent.enabled ? '客服帳戶已停用' : '客服帳戶已啟用')
      await loadAgents()
    } catch (cause) { actionError.value = displayError(cause) }
    finally { agentActionId.value = '' }
  }
  const saveSettings = async () => {
    if (!canWrite.value || !isSuperAdministrator.value || savingSettings.value) return
    savingSettings.value = true
    settingsSaved.value = false
    try {
      const response = await supportApi.saveSettings({ enabled: settingsDraft.enabled, guestEnabled: settingsDraft.guestEnabled, directContactEnabled: settingsDraft.directContactEnabled })
      Object.assign(supportSettings.value, response.support || settingsDraft)
      settingsLoader.invalidate()
      settingsSaved.value = true
      notify('客服設定已儲存')
    } catch (cause) {
      notify(displayError(cause), 'error')
    } finally {
      savingSettings.value = false
    }
  }
  const onTabKeydown = event => {
    const tabs = ['inbox', 'outbound', 'settings']
    const current = tabs.indexOf(section.value)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : event.key === 'ArrowRight' ? (current + 1) % tabs.length : event.key === 'ArrowLeft' ? (current + tabs.length - 1) % tabs.length : -1
    if (next < 0) return
    event.preventDefault()
    section.value = tabs[next]
    event.currentTarget.querySelectorAll('[role="tab"]')[next]?.focus()
  }
  return { loadInbox, selectConversation, backToInbox, sendReply, searchRecipients, resetRecipientSearch, selectRecipient, openRecipient, loadAgents, createAgent, setAgentEnabled, saveSettings, onTabKeydown }
}
