import { createApp, computed, h, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import './support-agent.css'
import { createIncomingTracker, playSupportAlert, readSupportAlertPreference, writeSupportAlertPreference } from './utils/support-alert.js'

const AgentButton = {
  inheritAttrs: false,
  props: { tone: { type: String, default: 'secondary' }, disabled: Boolean },
  methods: { focus() { this.$el?.focus() } },
  render() {
    return h('button', { ...this.$attrs, type: this.$attrs.type || 'button', disabled: this.disabled, class: ['agent-control-button', `agent-control-button--${this.tone}`, this.$attrs.class] }, this.$slots.default?.())
  },
}
const AgentInput = {
  inheritAttrs: false,
  props: { modelValue: { type: String, default: '' }, modelModifiers: { type: Object, default: () => ({}) }, disabled: Boolean },
  emits: ['update:modelValue'],
  methods: { focus() { this.$el?.focus() } },
  render() {
    return h('input', { ...this.$attrs, class: ['agent-control-input', this.$attrs.class], value: this.modelValue, disabled: this.disabled, onInput: event => { this.$emit('update:modelValue', this.modelModifiers.trim ? event.target.value.trim() : event.target.value); this.$attrs.onInput?.(event) } })
  },
}
const AgentTextarea = {
  inheritAttrs: false,
  props: { modelValue: { type: String, default: '' }, disabled: Boolean },
  emits: ['update:modelValue'],
  // 依內容自動增高，上限由 CSS max-height 控制。
  methods: { fit() { const element = this.$el; if (!element) return; element.style.height = 'auto'; element.style.height = `${element.scrollHeight}px`; element.style.overflowY = element.scrollHeight > element.clientHeight + 1 ? 'auto' : 'hidden' } },
  mounted() { this.fit() },
  updated() { this.fit() },
  render() {
    return h('textarea', { ...this.$attrs, class: ['agent-control-input', 'agent-control-textarea', this.$attrs.class], value: this.modelValue, disabled: this.disabled, onInput: event => this.$emit('update:modelValue', event.target.value) })
  },
}
const AgentSelect = {
  inheritAttrs: false,
  props: { modelValue: { type: String, default: '' }, disabled: Boolean },
  emits: ['update:modelValue'],
  render() {
    return h('select', { ...this.$attrs, class: ['agent-control-input', 'agent-control-select', this.$attrs.class], value: this.modelValue, disabled: this.disabled, onChange: event => { this.$emit('update:modelValue', event.target.value); this.$attrs.onChange?.(event) } }, this.$slots.default?.())
  },
}
const ICON_PATHS = {
  back: 'M15 18l-6-6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v5M12 8h.01',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  send: 'M5 12h14M13 6l6 6-6 6',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-3.6-3.6',
  chat: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2h-7l-5 4v-4H6a2 2 0 01-2-2z',
}
const AgentIcon = {
  props: { name: { type: String, required: true } },
  render() {
    return h('svg', { class: 'agent-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': this.name === 'more' ? 3 : 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, [h('path', { d: ICON_PATHS[this.name] })])
  },
}
const AgentLink = {
  inheritAttrs: false,
  render() { return h('a', { ...this.$attrs, class: ['agent-control-button', 'agent-control-button--icon', this.$attrs.class] }, this.$slots.default?.()) },
}
const baseUrl = import.meta.env.VITE_API_URL || '/api'
function csrfToken() {
  const item = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith('support_agent_csrf='))
  return item ? decodeURIComponent(item.split('=').slice(1).join('=')) : ''
}
async function request(path, options = {}) {
  const method = options.method || 'GET'
  const response = await fetch(`${baseUrl}/support-agent${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(method !== 'GET' ? { 'X-CSRF-Token': csrfToken() } : {}), ...(options.headers || {}) },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || `請求失敗（${response.status}）`)
  return result
}

createApp({
  setup() {
    const agent = ref(null)
    const credentials = reactive({ username: '', password: '' })
    const conversations = ref([])
    const selectedId = ref('')
    const messages = ref([])
    const participantProfile = ref(null)
    const participantProfileLoading = ref(false)
    const participantProfileError = ref('')
    const draft = ref('')
    const search = ref('')
    const replyFilter = ref('PENDING')
    const audience = ref('ALL')
    const audiences = [{ id: 'ALL', label: '全部' }, { id: 'PASSENGER', label: '乘客' }, { id: 'DRIVER', label: '司機' }, { id: 'GUEST', label: '訪客' }]
    const passwordOpen = ref(false)
    const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
    const passwordError = ref('')
    const passwordSaving = ref(false)
    const passwordFirst = ref(null)
    const profileExpanded = ref(false)
    const menuOpen = ref(false)
    const outboundOpen = ref(false)
    const outboundClose = ref(null)
    const viewportHeight = ref(0)
    // 手機鍵盤彈出時以可視區高度為準，讓輸入列貼在鍵盤上方。
    const appStyle = computed(() => viewportHeight.value ? { '--agent-viewport-height': `${viewportHeight.value}px` } : {})
    const touchInput = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
    const recipient = reactive({ participantType: 'PASSENGER', participantId: '' })
    const recipientLookupMode = ref('PHONE')
    const recipientCountryCode = ref('+852')
    const recipientPhone = ref('')
    const recipientOptions = ref([])
    const recipientSearching = ref(false)
    const recipientSearchPerformed = ref(false)
    const recipientSearchError = ref('')
    const error = ref('')
    const busy = ref(false)
    const inboxLoading = ref(false)
    const messagesLoading = ref(false)
    const messageList = ref(null)
    const hasMoreMessages = ref(false)
    const loadingOlder = ref(false)
    const notice = ref('')
    const alertSound = ref(readSupportAlertPreference())
    const trackIncoming = createIncomingTracker()
    const toggleAlertSound = () => { alertSound.value = !alertSound.value; writeSupportAlertPreference(alertSound.value); if (alertSound.value) playSupportAlert() }
    const pendingCount = computed(() => conversations.value.filter(item => item.needsStaffReply).length)
    const baseTitle = document.title
    watch(pendingCount, count => { document.title = count ? `(${count}) ${baseTitle}` : baseTitle })
    let noticeTimer = null
    let forceScroll = false
    let pendingReply = null
    let timer = null
    let messageRequest = 0
    let profileRequest = 0
    let profileLoadedFor = ''
    let recipientRequest = 0
    const participantLabel = type => ({ PASSENGER: '乘客', DRIVER: '司機', GUEST: '訪客' })[type] || '對話'
    const senderLabel = type => ({ PASSENGER: '乘客', DRIVER: '司機', GUEST: '訪客', ADMIN: '管理員', AGENT: '客服' })[type] || '對話成員'
    const formatTime = value => {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '時間未知' : new Intl.DateTimeFormat('zh-Hant', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    }
    const formatShortTime = value => {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const sameDay = date.toDateString() === new Date().toDateString()
      return new Intl.DateTimeFormat('zh-Hant', sameDay ? { hour: '2-digit', minute: '2-digit', hour12: false } : { month: 'numeric', day: 'numeric' }).format(date)
    }
    const conversationName = item => item.participantName || item.participantId || `訪客 ${item.id.slice(-4)}`
    const initial = name => [...String(name || '?').trim()][0]?.toUpperCase() || '?'
    const dayLabel = value => {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const today = new Date()
      const days = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - new Date(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000)
      if (days === 0) return '今天'
      if (days === 1) return '昨天'
      return new Intl.DateTimeFormat('zh-Hant', { ...(date.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }), month: 'long', day: 'numeric' }).format(date)
    }
    const startsNewDay = index => index === 0 || new Date(messages.value[index].createdAt).toDateString() !== new Date(messages.value[index - 1].createdAt).toDateString()
    const formatClock = value => {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('zh-Hant', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
    }
    const chatTitle = computed(() => participantProfile.value?.displayName || participantProfile.value?.name || selectedConversation.value?.participantName || (selectedConversation.value?.participantType === 'GUEST' ? `訪客 ${selectedId.value.slice(-4)}` : selectedConversation.value?.participantId || '對話'))
    const driverStatus = computed(() => selectedConversation.value?.participantType !== 'DRIVER' || !participantProfile.value ? '' : participantProfile.value.isOnline ? '在線' : participantProfile.value.enabled === false ? '已停用' : '離線')
    const chatSubtitle = computed(() => [selectedConversation.value?.participantPhone, driverStatus.value].filter(Boolean).join(' · '))
    const chatPhoneHref = computed(() => selectedConversation.value?.participantPhone ? `tel:${selectedConversation.value.participantPhone.replace(/[^+\d]/g, '')}` : '')
    // 各身份的待回覆數，顯示在分類切換上。
    const audienceCount = id => conversations.value.filter(item => item.needsStaffReply && (id === 'ALL' || item.participantType === id)).length
    const filtered = computed(() => {
      const keyword = search.value.trim().toLowerCase()
      return conversations.value.filter(item => replyFilter.value === 'ALL' || item.needsStaffReply).filter(item => audience.value === 'ALL' || item.participantType === audience.value).filter(item => !keyword || `${item.participantName || ''} ${item.participantPhone || ''} ${(item.participantPhone || '').replace(/\D/g, '')} ${item.participantId || ''} ${item.id}`.toLowerCase().includes(keyword))
    })
    const selectedConversation = computed(() => conversations.value.find(item => item.id === selectedId.value) || null)
    watch(selectedId, () => { profileExpanded.value = false })
    const participantPhone = profile => profile?.countryCode && profile?.phoneNumber ? `${profile.countryCode} ${profile.phoneNumber}` : '未提供'
    const driverRegionalPhone = (profile, region) => {
      if (!profile) return '未提供'
      if (region === 'mainland') return profile.mainlandPhone ? `+86 ${profile.mainlandPhone}` : profile.phoneCountryCode === '+86' && profile.phone ? `+86 ${profile.phone}` : '未提供'
      const code = profile.hongKongMacauCountryCode || (profile.phoneCountryCode !== '+86' ? profile.phoneCountryCode : '')
      const phone = profile.hongKongMacauPhone || (profile.phoneCountryCode !== '+86' ? profile.phone : '')
      return code && phone ? `${code} ${phone}` : '未提供'
    }
    const clearParticipantProfile = () => {
      profileRequest += 1
      profileLoadedFor = ''
      participantProfile.value = null
      participantProfileLoading.value = false
      participantProfileError.value = ''
    }
    const loadParticipantProfile = async id => {
      const requestId = ++profileRequest
      participantProfileLoading.value = true
      participantProfileError.value = ''
      try {
        const result = await request(`/conversations/${encodeURIComponent(id)}/participant`)
        if (requestId === profileRequest && selectedId.value === id) { participantProfile.value = result.profile || null; profileLoadedFor = id }
      } catch (cause) {
        if (requestId === profileRequest && selectedId.value === id) participantProfileError.value = cause.message
      } finally {
        if (requestId === profileRequest) participantProfileLoading.value = false
      }
    }
    const recipientLabel = computed(() => recipient.participantType === 'DRIVER' ? '司機' : '乘客')
    const recipientDisplayName = item => item.displayName || item.name || `${recipientLabel.value}帳戶`
    const resetRecipientSearch = () => {
      recipientRequest += 1
      recipient.participantId = ''
      recipientOptions.value = []
      recipientSearchPerformed.value = false
      recipientSearchError.value = ''
      recipientSearching.value = false
    }
    const setRecipientType = type => { recipient.participantType = type; resetRecipientSearch() }
    const setRecipientLookupMode = mode => { recipientLookupMode.value = mode; resetRecipientSearch() }
    const searchRecipients = async () => {
      if (recipientSearching.value) return
      const requestId = ++recipientRequest
      const phone = recipientPhone.value.replace(/[\s-]/g, '')
      recipientSearchPerformed.value = true
      recipientSearchError.value = ''
      recipientOptions.value = []
      recipient.participantId = ''
      if (!/^\d{4,15}$/.test(phone)) { recipientSearchError.value = '請輸入 4 至 15 位本地電話號碼'; return }
      recipientSearching.value = true
      try {
        const query = new URLSearchParams({ type: recipient.participantType, countryCode: recipientCountryCode.value, phone })
        const result = await request(`/conversations/recipients?${query}`)
        if (requestId === recipientRequest) recipientOptions.value = result.data || []
      } catch (cause) { if (requestId === recipientRequest) recipientSearchError.value = cause.message }
      finally { if (requestId === recipientRequest) recipientSearching.value = false }
    }
    const selectRecipient = item => { recipient.participantId = item.id; recipientSearchError.value = ''; void open() }
    const scrollMessagesToEnd = async () => {
      await nextTick()
      if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight
    }
    const load = async () => {
      if (!agent.value || inboxLoading.value || loadingOlder.value) return
      inboxLoading.value = true
      try {
        conversations.value = (await request('/conversations')).data || []
        error.value = ''
        const fresh = trackIncoming(conversations.value)
        if (fresh) {
          if (alertSound.value) playSupportAlert()
          notice.value = `收到 ${fresh} 個對話的新訊息`
          if (noticeTimer) clearTimeout(noticeTimer)
          noticeTimer = setTimeout(() => { notice.value = '' }, 6000)
        }
        if (selectedId.value && conversations.value.some(item => item.id === selectedId.value)) await select(selectedId.value, true)
        else if (selectedId.value) { selectedId.value = ''; messages.value = []; hasMoreMessages.value = false; clearParticipantProfile() }
      } catch (cause) { error.value = cause.message }
      finally { inboxLoading.value = false }
    }
    const select = async (id, preserve = false) => {
      const requestId = ++messageRequest
      const shouldScroll = !preserve || forceScroll || !messageList.value || messageList.value.scrollHeight - messageList.value.scrollTop - messageList.value.clientHeight < 48
      forceScroll = false
      const changedConversation = selectedId.value !== id
      selectedId.value = id
      if (changedConversation) { clearParticipantProfile(); void loadParticipantProfile(id) }
      // 對象資料只在切換對話或尚未成功載入時讀取，避免每次輪詢重複請求與狀態閃爍。
      else if (profileLoadedFor !== id && !participantProfileLoading.value && !participantProfileError.value) void loadParticipantProfile(id)
      if (!preserve) { messages.value = []; hasMoreMessages.value = false }
      messagesLoading.value = !preserve
      try {
        const result = await request(`/conversations/${encodeURIComponent(id)}/messages`)
        if (requestId === messageRequest && selectedId.value === id) {
          const latest = result.data || []
          const latestIds = new Set(latest.map(item => item.id))
          const earlier = !preserve || !latest.length ? [] : messages.value.filter(item => !latestIds.has(item.id) && item.createdAt <= latest[0].createdAt)
          if (!earlier.length) hasMoreMessages.value = result.hasMore === true
          messages.value = [...earlier, ...latest]
          error.value = ''
          if (shouldScroll) await scrollMessagesToEnd()
        }
      }
      catch (cause) { if (requestId === messageRequest) error.value = cause.message }
      finally { if (requestId === messageRequest) messagesLoading.value = false }
    }
    const loadOlderMessages = async () => {
      const id = selectedId.value
      const first = messages.value[0]
      if (!id || !first || loadingOlder.value || !hasMoreMessages.value) return
      const requestId = messageRequest
      loadingOlder.value = true
      try {
        const result = await request(`/conversations/${encodeURIComponent(id)}/messages?before=${encodeURIComponent(first.id)}`)
        if (requestId === messageRequest && selectedId.value === id) {
          const known = new Set(messages.value.map(item => item.id))
          const element = messageList.value
          const previous = element ? element.scrollHeight - element.scrollTop : 0
          messages.value = [...(result.data || []).filter(item => !known.has(item.id)), ...messages.value]
          hasMoreMessages.value = result.hasMore === true
          await nextTick()
          if (element) element.scrollTop = element.scrollHeight - previous
        }
      } catch (cause) { if (requestId === messageRequest && selectedId.value === id) error.value = cause.message }
      finally { loadingOlder.value = false }
    }
    const backToInbox = () => { selectedId.value = ''; messages.value = []; hasMoreMessages.value = false; draft.value = ''; pendingReply = null; messageRequest += 1; clearParticipantProfile() }
    const openOutbound = async () => { menuOpen.value = false; resetRecipientSearch(); recipientPhone.value = ''; outboundOpen.value = true; await nextTick(); outboundClose.value?.focus() }
    const closeOutbound = () => { outboundOpen.value = false }
    const openPassword = async () => { menuOpen.value = false; passwordForm.currentPassword = ''; passwordForm.newPassword = ''; passwordForm.confirmPassword = ''; passwordError.value = ''; passwordOpen.value = true; await nextTick(); passwordFirst.value?.focus() }
    const closePassword = () => { if (!passwordSaving.value) passwordOpen.value = false }
    const changePassword = async () => {
      if (passwordSaving.value) return
      if (passwordForm.newPassword !== passwordForm.confirmPassword) { passwordError.value = '兩次輸入的新密碼不一致'; return }
      passwordSaving.value = true
      passwordError.value = ''
      try {
        await request('/auth/password', { method: 'POST', body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }) })
        passwordOpen.value = false
        notice.value = '密碼已更新，其他裝置的登入已失效'
        if (noticeTimer) clearTimeout(noticeTimer)
        noticeTimer = setTimeout(() => { notice.value = '' }, 6000)
      } catch (cause) { passwordError.value = cause.message }
      finally { passwordSaving.value = false }
    }
    const signOutFromMenu = async () => { menuOpen.value = false; await signOut() }
    const signIn = async () => {
      busy.value = true
      try { error.value = ''; agent.value = (await request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) })).agent; credentials.password = ''; await load() }
      catch (cause) { error.value = cause.message }
      finally { busy.value = false }
    }
    const signOut = async () => {
      try { await request('/auth/logout', { method: 'POST' }); agent.value = null; selectedId.value = ''; conversations.value = []; messages.value = []; clearParticipantProfile(); draft.value = ''; pendingReply = null; resetRecipientSearch() }
      catch (cause) { error.value = cause.message }
    }
    const send = async () => {
      if (!selectedId.value || !draft.value.trim() || busy.value) return
      busy.value = true
      try {
        error.value = ''
        const text = draft.value.trim()
        if (pendingReply?.text !== text || pendingReply?.conversationId !== selectedId.value) pendingReply = { text, conversationId: selectedId.value, id: `m${Date.now()}${Math.random().toString(36).slice(2, 12)}` }
        await request(`/conversations/${encodeURIComponent(selectedId.value)}/messages`, { method: 'POST', body: JSON.stringify({ text, clientMessageId: pendingReply.id }) })
        pendingReply = null
        draft.value = ''; forceScroll = true; await load()
      } catch (cause) { error.value = cause.message }
      finally { busy.value = false }
    }
    // 桌面鍵盤 Enter 發送、Shift+Enter 換行；輸入法選字中不發送。觸控鍵盤的 Enter 一律換行，改用發送鍵。
    const onComposerKeydown = event => {
      if (touchInput || event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return
      event.preventDefault()
      void send()
    }
    const open = async () => {
      if (!recipient.participantId.trim() || busy.value) return
      busy.value = true
      try {
        error.value = ''
        const conversation = await request('/conversations', { method: 'POST', body: JSON.stringify({ participantType: recipient.participantType, participantId: recipient.participantId.trim() }) })
        outboundOpen.value = false
        await load(); await select(conversation.id)
      } catch (cause) { error.value = cause.message }
      finally { busy.value = false }
    }
    // 輸入列增高、資料區展開或鍵盤彈出時，若原本停在底部就繼續貼住最新訊息。
    const nearBottom = () => !messageList.value || messageList.value.scrollHeight - messageList.value.scrollTop - messageList.value.clientHeight < 48
    const keepAtBottom = async () => { if (!nearBottom()) return; await nextTick(); await scrollMessagesToEnd() }
    watch([draft, profileExpanded], keepAtBottom)
    const syncViewport = () => { void keepAtBottom(); viewportHeight.value = Math.round(window.visualViewport?.height || 0) }
    onMounted(async () => {
      syncViewport()
      window.visualViewport?.addEventListener('resize', syncViewport)
      try { agent.value = await request('/auth/me'); await load() } catch { agent.value = null }
      timer = setInterval(() => { if (agent.value) void load() }, 5000)
    })
    onUnmounted(() => { window.visualViewport?.removeEventListener('resize', syncViewport); if (timer) clearInterval(timer); if (noticeTimer) clearTimeout(noticeTimer); document.title = baseTitle; clearParticipantProfile() })
    return { conversationName, initial, dayLabel, startsNewDay, formatClock, audience, audiences, audienceCount, driverStatus, chatPhoneHref, passwordOpen, passwordForm, passwordError, passwordSaving, passwordFirst, openPassword, closePassword, changePassword, menuOpen, outboundOpen, outboundClose, appStyle, touchInput, formatShortTime, chatTitle, chatSubtitle, openOutbound, closeOutbound, signOutFromMenu, hasMoreMessages, loadingOlder, loadOlderMessages, notice, alertSound, toggleAlertSound, pendingCount, onComposerKeydown, agent, credentials, conversations, filtered, selectedId, selectedConversation, participantProfile, participantProfileLoading, participantProfileError, participantPhone, driverRegionalPhone, loadParticipantProfile, messages, draft, search, replyFilter, profileExpanded, recipient, recipientLookupMode, recipientCountryCode, recipientPhone, recipientOptions, recipientSearching, recipientSearchPerformed, recipientSearchError, recipientLabel, recipientDisplayName, resetRecipientSearch, setRecipientType, setRecipientLookupMode, searchRecipients, selectRecipient, error, busy, inboxLoading, messagesLoading, messageList, participantLabel, senderLabel, formatTime, signIn, signOut, select, backToInbox, send, open }
  },
  components: { AgentButton, AgentIcon, AgentInput, AgentLink, AgentSelect, AgentTextarea },
  template: `
    <main class="support-agent-app" :class="{ 'is-chat': agent && selectedId, 'is-signed-out': !agent }" :style="appStyle">
      <div v-if="error || (agent && notice)" class="agent-banners">
        <p v-if="error" role="alert" class="agent-banner agent-banner--error">{{error}}</p>
        <p v-if="agent && notice" role="status" class="agent-banner">{{notice}}</p>
      </div>
      <form v-if="!agent" class="login-card" @submit.prevent="signIn">
        <span class="login-mark"><AgentIcon name="chat"/></span>
        <h1>客服工作台</h1>
        <p>登入後即可接收及回覆客服對話。</p>
        <label><span>帳號</span><AgentInput v-model.trim="credentials.username" autocomplete="username" autocapitalize="none" required/></label>
        <label><span>密碼</span><AgentInput v-model="credentials.password" type="password" autocomplete="current-password" required/></label>
        <AgentButton type="submit" tone="primary" :disabled="busy">{{busy ? '登入中…' : '登入'}}</AgentButton>
      </form>
      <template v-else>
        <section class="inbox" aria-label="對話列表">
          <header class="app-bar">
            <h1>客服工作台<span v-if="pendingCount" class="pending-count" :aria-label="pendingCount + ' 個對話待回覆'">{{pendingCount}}</span></h1>
            <div class="app-bar-actions">
              <AgentButton tone="bar" @click="openOutbound"><AgentIcon name="plus"/>新對話</AgentButton>
              <AgentButton tone="bar" class="app-bar-menu" aria-label="選單" aria-controls="agent-menu" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen"><AgentIcon name="more"/></AgentButton>
            </div>
            <div v-if="menuOpen" id="agent-menu" class="app-menu" @keydown.esc="menuOpen = false">
              <span class="app-menu-name"><span class="avatar avatar--staff" aria-hidden="true">{{initial(agent.displayName)}}</span>{{agent.displayName}}</span>
              <AgentButton :aria-pressed="alertSound" @click="toggleAlertSound">{{alertSound ? '提示音：開' : '提示音：關'}}</AgentButton>
              <AgentButton @click="openPassword">修改密碼</AgentButton>
              <AgentButton @click="signOutFromMenu">登出</AgentButton>
            </div>
          </header>
          <div class="inbox-tools">
            <label class="search-field"><AgentIcon name="search"/><AgentInput v-model="search" type="search" aria-label="搜尋對話" placeholder="搜尋姓名、電話或 ID"/></label>
            <div class="segmented" role="group" aria-label="對話篩選">
              <AgentButton tone="segment" :aria-pressed="replyFilter === 'PENDING'" @click="replyFilter = 'PENDING'">待回覆{{pendingCount ? ' ' + pendingCount : ''}}</AgentButton>
              <AgentButton tone="segment" :aria-pressed="replyFilter === 'ALL'" @click="replyFilter = 'ALL'">全部對話</AgentButton>
            </div>
            <div class="audience-chips" role="group" aria-label="對象分類">
              <AgentButton v-for="item in audiences" :key="item.id" tone="chip" :aria-pressed="audience === item.id" @click="audience = item.id">{{item.label}}<span v-if="audienceCount(item.id)" class="chip-count" :aria-label="audienceCount(item.id) + ' 個待回覆'">{{audienceCount(item.id)}}</span></AgentButton>
            </div>
          </div>
          <p v-if="inboxLoading && !conversations.length" class="list-state" role="status">正在載入對話…</p>
          <div v-else-if="!filtered.length" class="list-empty">
            <span class="empty-mark"><AgentIcon name="chat"/></span>
            <strong>{{search.trim() ? '沒有符合搜尋的對話' : replyFilter === 'PENDING' ? '目前沒有待回覆的' + (audience === 'ALL' ? '' : participantLabel(audience)) + '對話' : audience === 'ALL' ? '暫無對話' : '暫無' + participantLabel(audience) + '對話'}}</strong>
            <AgentButton v-if="replyFilter === 'PENDING' && !search.trim() && conversations.length" @click="replyFilter = 'ALL'">查看全部對話</AgentButton>
          </div>
          <div v-else class="conversation-list">
            <AgentButton v-for="item in filtered" :key="item.id" tone="row" class="conversation-item" :class="{ 'is-pending': item.needsStaffReply }" :aria-current="selectedId === item.id ? 'true' : undefined" @click="select(item.id)">
              <span class="avatar" :class="'avatar--' + item.participantType.toLowerCase()" aria-hidden="true">{{initial(conversationName(item))}}</span>
              <span class="conversation-body">
                <span class="conversation-top"><strong>{{conversationName(item)}}</strong><time v-if="item.lastMessageAt" :datetime="item.lastMessageAt">{{formatShortTime(item.lastMessageAt)}}</time></span>
                <span class="conversation-bottom"><span class="conversation-preview">{{item.lastMessagePreview || '尚無訊息'}}</span><span v-if="item.needsStaffReply" class="reply-dot" aria-label="待回覆"></span></span>
                <span class="conversation-tag"><span class="type-badge" :class="'type-badge--' + item.participantType.toLowerCase()">{{participantLabel(item.participantType)}}</span>{{item.participantPhone || ''}}</span>
              </span>
            </AgentButton>
            <p class="list-footnote">僅顯示最近 100 筆對話</p>
          </div>
        </section>
        <section class="chat" aria-label="對話內容">
          <div v-if="!selectedId" class="chat-empty"><span class="empty-mark"><AgentIcon name="chat"/></span><strong>選取對話以查看訊息</strong></div>
          <template v-else>
            <header class="chat-bar">
              <AgentButton tone="icon" class="chat-back" aria-label="返回對話列表" @click="backToInbox"><AgentIcon name="back"/></AgentButton>
              <span v-if="selectedConversation" class="avatar" :class="'avatar--' + selectedConversation.participantType.toLowerCase()" aria-hidden="true">{{initial(chatTitle)}}</span>
              <div class="chat-title"><strong>{{chatTitle}}</strong><span><span v-if="selectedConversation" class="type-badge" :class="'type-badge--' + selectedConversation.participantType.toLowerCase()">{{participantLabel(selectedConversation.participantType)}}</span>{{chatSubtitle}}</span></div>
              <AgentLink v-if="chatPhoneHref" :href="chatPhoneHref" aria-label="撥打電話"><AgentIcon name="phone"/></AgentLink>
              <AgentButton tone="icon" aria-label="對象資料" aria-controls="agent-chat-profile" :aria-expanded="profileExpanded" @click="profileExpanded = !profileExpanded"><AgentIcon name="info"/></AgentButton>
            </header>
            <div v-if="profileExpanded" id="agent-chat-profile" class="chat-profile">
              <p v-if="participantProfileLoading" role="status">正在載入資料…</p>
              <p v-else-if="participantProfileError" class="chat-profile-error">資料讀取失敗。<AgentButton @click="loadParticipantProfile(selectedId)">重試</AgentButton></p>
              <template v-if="participantProfile">
                <div><span>姓名</span><strong>{{participantProfile.displayName || participantProfile.name || '未提供'}}</strong></div>
                <template v-if="selectedConversation?.participantType === 'DRIVER'">
                  <div><span>港澳號碼</span><strong>{{driverRegionalPhone(participantProfile, 'regional')}}</strong></div>
                  <div><span>內地號碼</span><strong>{{driverRegionalPhone(participantProfile, 'mainland')}}</strong></div>
                  <div><span>司機狀態</span><strong>{{participantProfile.isOnline ? '在線' : participantProfile.enabled === false ? '已停用' : '離線'}}</strong></div>
                </template>
                <div v-else><span>電話</span><strong>{{participantPhone(participantProfile)}}</strong></div>
              </template>
              <div v-if="selectedConversation?.participantId"><span>帳戶 ID</span><strong>{{selectedConversation.participantId}}</strong></div>
              <div><span>對話 ID</span><strong>{{selectedId}}</strong></div>
            </div>
            <div ref="messageList" class="message-list" role="log" aria-live="polite" aria-label="對話訊息">
              <p v-if="messagesLoading" class="list-state" role="status">正在載入訊息…</p>
              <p v-else-if="!messages.length" class="list-state">暫無訊息</p>
              <div v-if="!messagesLoading && hasMoreMessages" class="load-older"><AgentButton :disabled="loadingOlder" @click="loadOlderMessages">{{loadingOlder ? '載入中…' : '載入更早的訊息'}}</AgentButton></div>
              <template v-for="(item, index) in messages" :key="item.id">
                <p v-if="startsNewDay(index)" class="day-separator"><span>{{dayLabel(item.createdAt)}}</span></p>
                <article class="message" :class="{ 'is-staff': item.senderType === 'AGENT' || item.senderType === 'ADMIN' }">
                  <p>{{item.text}}</p>
                  <div class="message-meta"><span v-if="item.senderType === 'AGENT' || item.senderType === 'ADMIN'">{{item.senderName || senderLabel(item.senderType)}}</span><time :datetime="item.createdAt" :title="formatTime(item.createdAt)">{{formatClock(item.createdAt)}}</time></div>
                </article>
              </template>
            </div>
            <form class="composer" @submit.prevent="send">
              <AgentTextarea v-model="draft" class="composer-input" rows="1" aria-label="輸入訊息" maxlength="4000" :placeholder="touchInput ? '輸入訊息' : '輸入訊息（Enter 發送，Shift+Enter 換行）'" :disabled="busy" @keydown="onComposerKeydown"/>
              <AgentButton class="composer-send" type="submit" tone="primary" aria-label="發送" :disabled="busy || !draft.trim()"><AgentIcon name="send"/></AgentButton>
            </form>
          </template>
        </section>
        <div v-if="outboundOpen" class="sheet-backdrop" @click.self="closeOutbound" @keydown.esc="closeOutbound">
          <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="agent-outbound-title">
            <header class="sheet-bar"><h2 id="agent-outbound-title">新對話</h2><AgentButton ref="outboundClose" tone="icon" aria-label="關閉" @click="closeOutbound"><AgentIcon name="close"/></AgentButton></header>
            <div class="segmented" role="group" aria-label="聯繫對象">
              <AgentButton tone="segment" :aria-pressed="recipient.participantType === 'PASSENGER'" @click="setRecipientType('PASSENGER')">乘客</AgentButton>
              <AgentButton tone="segment" :aria-pressed="recipient.participantType === 'DRIVER'" @click="setRecipientType('DRIVER')">司機</AgentButton>
            </div>
            <div class="segmented" role="group" aria-label="查找方式">
              <AgentButton tone="segment" :aria-pressed="recipientLookupMode === 'PHONE'" @click="setRecipientLookupMode('PHONE')">用電話查找</AgentButton>
              <AgentButton tone="segment" :aria-pressed="recipientLookupMode === 'ID'" @click="setRecipientLookupMode('ID')">用帳戶 ID</AgentButton>
            </div>
            <form v-if="recipientLookupMode === 'PHONE'" class="sheet-form" @submit.prevent="searchRecipients">
              <div class="sheet-phone"><AgentSelect v-model="recipientCountryCode" aria-label="選擇區號" @change="resetRecipientSearch"><option value="+852">+852</option><option value="+853">+853</option><option value="+86">+86</option></AgentSelect><AgentInput v-model.trim="recipientPhone" type="tel" inputmode="numeric" :aria-label="recipientLabel + '電話號碼'" placeholder="電話號碼" autocomplete="off" @input="resetRecipientSearch"/></div>
              <AgentButton type="submit" tone="primary" :disabled="recipientSearching || !recipientPhone.trim()">{{recipientSearching ? '查找中…' : '查找'}}</AgentButton>
            </form>
            <form v-else class="sheet-form" @submit.prevent="open">
              <AgentInput v-model.trim="recipient.participantId" :aria-label="recipientLabel + '帳戶 ID'" placeholder="帳戶 ID" autocomplete="off" autocapitalize="none"/>
              <AgentButton type="submit" tone="primary" :disabled="busy || !recipient.participantId.trim()">{{busy ? '開啟中…' : '開始對話'}}</AgentButton>
            </form>
            <p v-if="recipientSearchError" class="sheet-error" role="alert">{{recipientSearchError}}</p>
            <p v-if="recipientLookupMode === 'PHONE' && recipientSearchPerformed && !recipientSearching && !recipientSearchError && !recipientOptions.length" class="list-state">找不到符合的{{recipientLabel}}帳戶</p>
            <div v-if="recipientLookupMode === 'PHONE' && recipientOptions.length" class="sheet-results" aria-label="查找結果">
              <AgentButton v-for="item in recipientOptions" :key="item.id" tone="row" class="conversation-item" :disabled="busy" @click="selectRecipient(item)"><span class="avatar" :class="'avatar--' + recipient.participantType.toLowerCase()" aria-hidden="true">{{initial(recipientDisplayName(item))}}</span><span class="conversation-body"><span class="conversation-top"><strong>{{recipientDisplayName(item)}}</strong></span><span class="conversation-tag">{{item.phone}} · ID {{item.id}}</span></span></AgentButton>
            </div>
          </section>
        </div>
        <div v-if="passwordOpen" class="sheet-backdrop" @click.self="closePassword" @keydown.esc="closePassword">
          <form class="sheet" role="dialog" aria-modal="true" aria-labelledby="agent-password-title" @submit.prevent="changePassword">
            <header class="sheet-bar"><h2 id="agent-password-title">修改密碼</h2><AgentButton tone="icon" aria-label="關閉" :disabled="passwordSaving" @click="closePassword"><AgentIcon name="close"/></AgentButton></header>
            <label class="sheet-field"><span>目前密碼</span><AgentInput ref="passwordFirst" v-model="passwordForm.currentPassword" type="password" autocomplete="current-password" required :disabled="passwordSaving"/></label>
            <label class="sheet-field"><span>新密碼</span><AgentInput v-model="passwordForm.newPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" required :disabled="passwordSaving"/></label>
            <label class="sheet-field"><span>再次輸入新密碼</span><AgentInput v-model="passwordForm.confirmPassword" type="password" autocomplete="new-password" maxlength="128" required :disabled="passwordSaving"/></label>
            <p class="sheet-hint">至少 8 個字元。更新後，此帳戶在其他裝置的登入會失效。</p>
            <p v-if="passwordError" class="sheet-error" role="alert">{{passwordError}}</p>
            <AgentButton type="submit" tone="primary" :disabled="passwordSaving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword">{{passwordSaving ? '更新中…' : '更新密碼'}}</AgentButton>
          </form>
        </div>
      </template>
    </main>`,
}).mount('#app')
