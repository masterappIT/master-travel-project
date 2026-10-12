export function createSupportActions(context) {
  const { supportApi, canWrite, isSuperAdministrator, supportSettings, settingsLoader, notify, requestConfirmation, displayError, section, outboundOpen, recipientType, recipientId, recipientCountryCode, recipientPhone, recipientLookupMode, recipientOptions, recipientSearching, recipientSearchPerformed, recipientSearchError, draft, conversations, messages, selectedId, busy, inboxLoading, inboxLoaded, inboxError, messagesLoading, messagesLoaded, messagesError, actionError, participantProfile, participantProfileLoading, participantProfileError, hasMoreMessages, loadingOlder, alertSound, trackIncoming, playSupportAlert, isNearBottom, keepScrollPosition, savingSettings, settingsSaved, settingsDraft, serviceEnabled, requests, scrollMessagesToEnd } = context
  const loadInbox = async () => {
    const request = ++requests.inbox
      if (!inboxLoaded.value) inboxError.value = ''
    inboxLoading.value = true
    try {
      const response = await supportApi.listConversations()
      if (request !== requests.inbox) return
      conversations.value = response.data || []
      const fresh = trackIncoming(conversations.value)
      if (fresh) { if (alertSound.value) playSupportAlert(); notify(`收到 ${fresh} 個對話的新訊息`) }
      inboxLoaded.value = true
      inboxError.value = ''
      if (selectedId.value && section.value === 'inbox' && !conversations.value.some(item => item.id === selectedId.value)) {
        selectedId.value = ''; messages.value = []; messagesLoaded.value = false; hasMoreMessages.value = false; participantProfile.value = null; requests.messages += 1; requests.profile += 1
      }
    } catch (cause) { if (request === requests.inbox) inboxError.value = displayError(cause) }
    finally { if (request === requests.inbox) inboxLoading.value = false }
      if (request === requests.inbox && !inboxError.value && selectedId.value && section.value === 'inbox' && !messagesLoading.value && !loadingOlder.value) await selectConversation(selectedId.value, false)
  }
  const selectConversation = async (id, clear = true) => {
    const request = ++requests.messages
    if (selectedId.value !== id) { draft.value = ''; requests.pendingReply = null }
    selectedId.value = id
    if (clear) { requests.profile += 1; requests.profileLoadedFor = ''; messages.value = []; messagesLoaded.value = false; messagesError.value = ''; hasMoreMessages.value = false; participantProfile.value = null; participantProfileError.value = ''; participantProfileLoading.value = false }
    // 背景刷新時只有在使用者停留於底部（或剛發送）才跟隨到最新訊息，避免打斷閱讀歷史。
    const follow = clear || requests.forceScroll || isNearBottom()
    requests.forceScroll = false
    messagesLoading.value = true
    try {
      const response = await supportApi.listMessages(id)
      if (request === requests.messages && selectedId.value === id) {
        const latest = response.data || []
        const latestIds = new Set(latest.map(item => item.id))
        const earlier = clear || !latest.length ? [] : messages.value.filter(item => !latestIds.has(item.id) && item.createdAt <= latest[0].createdAt)
        if (!earlier.length) hasMoreMessages.value = response.hasMore === true
        messages.value = [...earlier, ...latest]
        messagesLoaded.value = true
        messagesError.value = ''
        if (follow) await scrollMessagesToEnd()
        // 對象資料只在切換對話或尚未成功載入時讀取，避免每次輪詢重複請求與狀態閃爍。
        if (requests.profileLoadedFor !== id && !participantProfileLoading.value && !participantProfileError.value) await loadParticipantProfile(response.conversation || conversations.value.find(item => item.id === id))
      }
    } catch (cause) { if (request === requests.messages && selectedId.value === id) messagesError.value = displayError(cause) }
    finally { if (request === requests.messages) messagesLoading.value = false }
  }
  const loadParticipantProfile = async (conversation, request = ++requests.profile) => {
    if (!conversation?.participantId || !conversation.participantType) { participantProfile.value = null; participantProfileLoading.value = false; requests.profileLoadedFor = conversation?.id || ''; return }
    participantProfileLoading.value = true
    participantProfileError.value = ''
    try {
      const profile = await supportApi.participantProfile(conversation)
      if (request === requests.profile && selectedId.value === conversation.id) { participantProfile.value = profile; requests.profileLoadedFor = conversation.id }
    } catch (cause) {
      if (request === requests.profile && selectedId.value === conversation.id) participantProfileError.value = displayError(cause)
    } finally {
      if (request === requests.profile) participantProfileLoading.value = false
    }
  }
  const loadOlderMessages = async () => {
    const id = selectedId.value
    const first = messages.value[0]
    if (!id || !first || loadingOlder.value || !hasMoreMessages.value) return
    const request = requests.messages
    loadingOlder.value = true
    try {
      const response = await supportApi.listMessages(id, first.id)
      if (request === requests.messages && selectedId.value === id) {
        const known = new Set(messages.value.map(item => item.id))
        await keepScrollPosition(() => { messages.value = [...(response.data || []).filter(item => !known.has(item.id)), ...messages.value] })
        hasMoreMessages.value = response.hasMore === true
        messagesError.value = ''
      }
    } catch (cause) { if (request === requests.messages && selectedId.value === id) messagesError.value = displayError(cause) }
    finally { loadingOlder.value = false }
  }
  const retryParticipantProfile = () => {
    participantProfileError.value = ''
    return loadParticipantProfile(conversations.value.find(item => item.id === selectedId.value))
  }
  const backToInbox = () => {
    selectedId.value = ''
    messages.value = []
    hasMoreMessages.value = false
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
    if (sent) { requests.forceScroll = true; notify('回覆已發送'); await loadInbox() }
  }
  // 輸入法選字時的 Enter 不發送；Shift+Enter 換行。
  const onComposerKeydown = event => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return
    event.preventDefault()
    void sendReply()
  }
  const resetRecipientSearch = () => {
    recipientId.value = ''
    recipientOptions.value = []
    recipientSearchPerformed.value = false
    recipientSearchError.value = ''
  }
  const searchRecipients = async () => {
    if (!canWrite.value || !serviceEnabled.value || recipientSearching.value) return
    const phone = recipientPhone.value.replace(/[\s-]/g, '')
    recipientSearchPerformed.value = true
    recipientSearchError.value = ''
    recipientOptions.value = []
    recipientId.value = ''
    if (!/^\d{4,15}$/.test(phone)) {
      recipientSearchError.value = '請輸入 4 至 15 位本地電話號碼'
      return
    }
    recipientSearching.value = true
    try {
      const response = await supportApi.searchRecipients(recipientType.value, recipientCountryCode.value, phone)
      recipientOptions.value = response.data || []
    } catch (cause) {
      recipientSearchError.value = displayError(cause)
    } finally {
      recipientSearching.value = false
    }
  }
  const openRecipient = async () => {
    if (!canWrite.value || !serviceEnabled.value || !recipientId.value.trim() || busy.value) return
    busy.value = true
    actionError.value = ''
    try {
      const response = await supportApi.openConversation(recipientType.value, recipientId.value.trim())
      section.value = 'inbox'
      outboundOpen.value = false
      await loadInbox()
      await selectConversation(response.id)
    } catch (cause) { actionError.value = displayError(cause) }
    finally { busy.value = false }
  }
  // 點選查找結果即開啟對話，不需再按一次確認。
  const selectRecipient = item => {
    recipientId.value = item.id || ''
    recipientSearchError.value = ''
    return openRecipient()
  }
  const saveSettings = async () => {
    if (!canWrite.value || !isSuperAdministrator.value || savingSettings.value) return
    if (settingsDraft.enabled === supportSettings.value.enabled && settingsDraft.guestEnabled === supportSettings.value.guestEnabled && settingsDraft.directContactEnabled === supportSettings.value.directContactEnabled) return
    if (supportSettings.value.enabled && !settingsDraft.enabled && !await requestConfirmation({ title: '停用內置客服', message: '停用後，乘客端、司機端、訪客及後台客服入口都將無法繼續使用文字客服。確定儲存此設定？', confirmLabel: '停用並儲存', danger: true })) return
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
  return { loadInbox, selectConversation, loadOlderMessages, retryParticipantProfile, backToInbox, sendReply, onComposerKeydown, searchRecipients, resetRecipientSearch, selectRecipient, openRecipient, saveSettings }
}
