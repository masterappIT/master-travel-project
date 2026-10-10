import { createApp, computed, h, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import './support-agent.css'

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
  render() {
    return h('input', { ...this.$attrs, class: ['agent-control-input', this.$attrs.class], value: this.modelValue, disabled: this.disabled, onInput: event => { this.$emit('update:modelValue', this.modelModifiers.trim ? event.target.value.trim() : event.target.value); this.$attrs.onInput?.(event) } })
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
    const mobilePanel = ref('inbox')
    const mobileDrawerOpen = ref(false)
    const drawerTrigger = ref(null)
    const drawerClose = ref(null)
    const drawerIsOpen = computed(() => agent.value && mobileDrawerOpen.value)
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
    let pendingReply = null
    let timer = null
    let messageRequest = 0
    let profileRequest = 0
    let recipientRequest = 0
    const participantLabel = type => ({ PASSENGER: '乘客', DRIVER: '司機', GUEST: '訪客' })[type] || '對話'
    const senderLabel = type => ({ PASSENGER: '乘客', DRIVER: '司機', GUEST: '訪客', ADMIN: '管理員', AGENT: '客服' })[type] || '對話成員'
    const formatTime = value => {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '時間未知' : new Intl.DateTimeFormat('zh-Hant', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    }
    const filtered = computed(() => {
      const keyword = search.value.trim().toLowerCase()
      return conversations.value.filter(item => !keyword || `${item.participantId || ''} ${item.id}`.toLowerCase().includes(keyword))
    })
    const selectedConversation = computed(() => conversations.value.find(item => item.id === selectedId.value) || null)
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
        if (requestId === profileRequest && selectedId.value === id) participantProfile.value = result.profile || null
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
    const selectRecipient = item => { recipient.participantId = item.id; recipientSearchError.value = '' }
    const scrollMessagesToEnd = async () => {
      await nextTick()
      if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight
    }
    const load = async () => {
      if (!agent.value || inboxLoading.value) return
      inboxLoading.value = true
      try {
        conversations.value = (await request('/conversations')).data || []
        error.value = ''
        if (selectedId.value && conversations.value.some(item => item.id === selectedId.value)) await select(selectedId.value, true)
        else if (selectedId.value) { selectedId.value = ''; messages.value = []; clearParticipantProfile() }
      } catch (cause) { error.value = cause.message }
      finally { inboxLoading.value = false }
    }
    const select = async (id, preserve = false) => {
      const requestId = ++messageRequest
      const shouldScroll = !preserve || !messageList.value || messageList.value.scrollHeight - messageList.value.scrollTop - messageList.value.clientHeight < 48
      const changedConversation = selectedId.value !== id
      selectedId.value = id
      if (changedConversation) { clearParticipantProfile(); void loadParticipantProfile(id) }
      else if (preserve && !participantProfileLoading.value) void loadParticipantProfile(id)
      if (!preserve) mobilePanel.value = 'inbox'
      if (!preserve) messages.value = []
      messagesLoading.value = !preserve
      try {
        const result = await request(`/conversations/${encodeURIComponent(id)}/messages`)
        if (requestId === messageRequest && selectedId.value === id) { messages.value = result.data || []; error.value = ''; if (shouldScroll) await scrollMessagesToEnd() }
      }
      catch (cause) { if (requestId === messageRequest) error.value = cause.message }
      finally { if (requestId === messageRequest) messagesLoading.value = false }
    }
    const backToInbox = () => { selectedId.value = ''; messages.value = []; draft.value = ''; pendingReply = null; messageRequest += 1; clearParticipantProfile(); mobilePanel.value = 'inbox' }
    const openMobileDrawer = async () => { mobileDrawerOpen.value = true; await nextTick(); drawerClose.value?.focus() }
    const closeMobileDrawer = async () => { mobileDrawerOpen.value = false; await nextTick(); drawerTrigger.value?.focus() }
    const showMobilePanel = panel => { mobilePanel.value = panel; mobileDrawerOpen.value = false; drawerTrigger.value?.focus() }
    const showMobileInbox = () => { backToInbox(); mobileDrawerOpen.value = false; drawerTrigger.value?.focus() }
    const signOutFromDrawer = async () => { mobileDrawerOpen.value = false; await signOut() }
    const trapDrawerFocus = event => {
      const buttons = [...event.currentTarget.querySelectorAll('button:not([disabled])')]
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus() }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus() }
    }
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
        draft.value = ''; await load(); await scrollMessagesToEnd()
      } catch (cause) { error.value = cause.message }
      finally { busy.value = false }
    }
    const open = async () => {
      if (!recipient.participantId.trim() || busy.value) return
      busy.value = true
      try {
        error.value = ''
        const conversation = await request('/conversations', { method: 'POST', body: JSON.stringify({ participantType: recipient.participantType, participantId: recipient.participantId.trim() }) })
        await load(); await select(conversation.id)
      } catch (cause) { error.value = cause.message }
      finally { busy.value = false }
    }
    onMounted(async () => {
      try { agent.value = await request('/auth/me'); await load() } catch { agent.value = null }
      timer = setInterval(() => { if (agent.value) void load() }, 5000)
    })
    onUnmounted(() => { if (timer) clearInterval(timer); clearParticipantProfile() })
    return { agent, credentials, conversations, filtered, selectedId, selectedConversation, participantProfile, participantProfileLoading, participantProfileError, participantPhone, driverRegionalPhone, loadParticipantProfile, messages, draft, search, mobilePanel, mobileDrawerOpen, drawerIsOpen, drawerTrigger, drawerClose, recipient, recipientLookupMode, recipientCountryCode, recipientPhone, recipientOptions, recipientSearching, recipientSearchPerformed, recipientSearchError, recipientLabel, recipientDisplayName, resetRecipientSearch, setRecipientType, setRecipientLookupMode, searchRecipients, selectRecipient, error, busy, inboxLoading, messagesLoading, messageList, participantLabel, senderLabel, formatTime, signIn, signOut, signOutFromDrawer, select, backToInbox, openMobileDrawer, closeMobileDrawer, showMobilePanel, showMobileInbox, trapDrawerFocus, send, open }
  },
  components: { AgentButton, AgentInput, AgentSelect },
  template: `
    <main class="support-agent-app">
      <header class="agent-header"><div class="agent-brand"><span class="agent-brand-mark" aria-hidden="true">✦</span><div><small>CUSTOMER SUPPORT</small><h1>客服工作台</h1><p v-if="agent">共用客服收件匣</p></div></div><div v-if="agent" class="agent-header-actions"><span class="agent-online"><span aria-hidden="true"></span>客服在線</span><AgentButton class="desktop-signout" tone="ghost" @click="signOut">登出 {{agent.displayName}}</AgentButton><AgentButton ref="drawerTrigger" class="mobile-menu-trigger" tone="ghost" :aria-expanded="mobileDrawerOpen" aria-controls="agent-mobile-drawer" @click="openMobileDrawer">☰ <span>選單</span></AgentButton></div></header>
      <p v-if="error" role="alert" class="error">{{error}}</p>
      <form v-if="!agent" class="login-card" @submit.prevent="signIn"><span class="section-kicker">SUPPORT AGENT</span><h2>客服登入</h2><p>登入後即可接收及回覆共用客服收件匣的對話。</p><label><span>帳號</span><AgentInput v-model.trim="credentials.username" autocomplete="username" required/></label><label><span>密碼</span><AgentInput v-model="credentials.password" type="password" autocomplete="current-password" required/></label><AgentButton type="submit" tone="primary" :disabled="busy">{{busy ? '登入中…' : '登入工作台'}}</AgentButton></form>
      <template v-else>
        <section class="outbound" :class="{ 'mobile-hidden': mobilePanel !== 'outbound' }"><div class="outbound-heading"><div><span class="section-kicker">START CONVERSATION</span><h2>主動聯繫</h2><p>透過電話號碼或帳戶 ID 找到現有乘客、司機，再開始對話。</p></div><span class="outbound-badge">安全查找</span></div><div class="outbound-fields"><div class="recipient-field"><span id="recipient-type-label">聯繫對象</span><div class="recipient-types" role="group" aria-labelledby="recipient-type-label"><AgentButton :class="{ 'is-selected': recipient.participantType === 'PASSENGER' }" :aria-pressed="recipient.participantType === 'PASSENGER'" @click="setRecipientType('PASSENGER')">乘客</AgentButton><AgentButton :class="{ 'is-selected': recipient.participantType === 'DRIVER' }" :aria-pressed="recipient.participantType === 'DRIVER'" @click="setRecipientType('DRIVER')">司機</AgentButton></div></div><div class="recipient-field"><span id="recipient-lookup-label">查找方式</span><div class="recipient-types" role="group" aria-labelledby="recipient-lookup-label"><AgentButton :class="{ 'is-selected': recipientLookupMode === 'PHONE' }" :aria-pressed="recipientLookupMode === 'PHONE'" @click="setRecipientLookupMode('PHONE')">電話號碼</AgentButton><AgentButton :class="{ 'is-selected': recipientLookupMode === 'ID' }" :aria-pressed="recipientLookupMode === 'ID'" @click="setRecipientLookupMode('ID')">帳戶 ID</AgentButton></div></div><form v-if="recipientLookupMode === 'PHONE'" class="recipient-lookup" @submit.prevent="searchRecipients"><label><span>{{recipientLabel}}電話號碼</span><span class="recipient-phone-fields"><AgentSelect v-model="recipientCountryCode" aria-label="選擇區號" @change="resetRecipientSearch"><option value="+852">香港 +852</option><option value="+853">澳門 +853</option><option value="+86">中國內地 +86</option></AgentSelect><AgentInput v-model.trim="recipientPhone" type="tel" inputmode="numeric" placeholder="輸入本地電話號碼" autocomplete="tel-national" @input="resetRecipientSearch"/></span></label><AgentButton type="submit" tone="primary" :disabled="recipientSearching || !recipientPhone.trim()">{{recipientSearching ? '查找中…' : '查找帳戶'}}</AgentButton></form><label v-else class="outbound-id"><span>{{recipientLabel}}帳戶 ID</span><AgentInput v-model.trim="recipient.participantId" placeholder="輸入現有帳戶 ID" autocomplete="off"/></label></div><p v-if="recipientSearchError" class="recipient-search-error" role="alert">{{recipientSearchError}}</p><p v-if="recipientLookupMode === 'PHONE' && recipientSearchPerformed && !recipientSearching && !recipientSearchError && !recipientOptions.length" class="recipient-search-empty">找不到符合電話號碼的{{recipientLabel}}帳戶，請確認號碼。</p><div v-if="recipientLookupMode === 'PHONE' && recipientOptions.length" class="recipient-results" aria-label="查找結果"><p>選取一個帳戶後開始對話</p><AgentButton v-for="item in recipientOptions" :key="item.id" class="recipient-result" :class="{ 'is-selected': recipient.participantId === item.id }" :aria-pressed="recipient.participantId === item.id" @click="selectRecipient(item)"><strong>{{recipientDisplayName(item)}}</strong><span>{{item.phone}}</span><small>帳戶 ID：{{item.id}}</small></AgentButton></div><div class="outbound-confirm"><span>{{recipient.participantId ? '已選取帳戶，可開始對話。' : recipientLookupMode === 'PHONE' ? '選取帳戶後才能開始對話。' : '輸入帳戶 ID 後即可開始對話。'}}</span><AgentButton tone="primary" :disabled="busy || !recipient.participantId.trim()" @click="open">{{busy ? '開啟中…' : '開始對話'}}</AgentButton></div></section>
        <div class="workspace" :class="{ 'is-detail': selectedId, 'mobile-hidden': mobilePanel === 'outbound' }"><section class="inbox" aria-label="共用客服收件匣"><div class="panel-heading"><div><span class="section-kicker">INBOX</span><h2>全部對話</h2></div><span class="count" :aria-label="filtered.length + ' 筆對話'">{{filtered.length}}</span></div><label class="search-field"><span>搜尋對話</span><AgentInput v-model="search" type="search" placeholder="帳戶 ID 或對話 ID"/></label><p v-if="inboxLoading && !conversations.length" class="list-state" role="status">正在載入對話…</p><p v-else-if="!filtered.length" class="list-empty"><strong>{{search.trim() ? '沒有符合條件的對話' : '暫無對話'}}</strong><span>{{search.trim() ? '請改用其他帳戶 ID 或對話 ID。' : '新對話會顯示在這裡。'}}</span></p><div v-else class="conversation-list"><AgentButton v-for="item in filtered" :key="item.id" class="conversation-item" :class="{ selected: selectedId === item.id }" :aria-current="selectedId === item.id ? 'true' : undefined" @click="select(item.id)"><strong>{{participantLabel(item.participantType)}} · {{item.participantId || '訪客對話'}}</strong><small>{{item.lastMessageAt ? formatTime(item.lastMessageAt) : '尚無訊息'}}</small><span v-if="!item.participantId">對話 {{item.id}}</span></AgentButton></div></section><section class="conversation" aria-label="對話內容"><div class="conversation-header"><AgentButton class="mobile-back" tone="ghost" @click="backToInbox">← 對話列表</AgentButton><div><span class="section-kicker">CHAT</span><h2>{{selectedId ? '對話內容' : '選取對話'}}</h2></div><span class="conversation-id">{{selectedId ? '對話 ' + selectedId : '尚未選取'}}</span></div><article v-if="selectedId" class="participant-card" aria-label="對話對象資訊"><div class="participant-card-heading"><div><span class="section-kicker">{{selectedConversation?.participantType === 'DRIVER' ? 'DRIVER PROFILE' : selectedConversation?.participantType === 'GUEST' ? 'GUEST PROFILE' : 'PASSENGER PROFILE'}}</span><h3>{{selectedConversation?.participantType === 'DRIVER' ? '司機資料' : selectedConversation?.participantType === 'GUEST' ? '訪客資料' : '乘客資料'}}</h3></div><span class="participant-status" role="status">{{participantProfileLoading ? '載入中…' : participantProfileError ? '資料暫不可用' : participantProfile ? '已連結' : selectedConversation?.participantType === 'GUEST' ? '訪客' : '帳戶未找到'}}</span></div><p v-if="participantProfileError" class="participant-error">資料讀取失敗。<AgentButton tone="ghost" @click="loadParticipantProfile(selectedId)">重試</AgentButton></p><div v-if="participantProfile" class="participant-grid"><div><span>姓名</span><strong>{{participantProfile.displayName || participantProfile.name || '未提供'}}</strong></div><div><span>帳戶 ID</span><strong>{{participantProfile.id}}</strong></div><template v-if="selectedConversation?.participantType === 'DRIVER'"><div><span>港澳號碼</span><strong>{{driverRegionalPhone(participantProfile, 'regional')}}</strong></div><div><span>內地號碼</span><strong>{{driverRegionalPhone(participantProfile, 'mainland')}}</strong></div><div><span>司機狀態</span><strong>{{participantProfile.isOnline ? '在線' : participantProfile.enabled === false ? '已停用' : '離線'}}</strong></div></template><div v-else><span>電話</span><strong>{{participantPhone(participantProfile)}}</strong></div></div><div v-else class="participant-grid"><div><span>對話對象</span><strong>{{participantLabel(selectedConversation?.participantType)}}</strong></div><div><span>帳戶 ID</span><strong>{{selectedConversation?.participantId || '未提供'}}</strong></div></div></article><div v-if="!selectedId" class="conversation-empty"><span class="empty-mark" aria-hidden="true">✦</span><strong>選取對話以查看訊息</strong><span>收到的乘客、司機及訪客訊息會集中顯示在這裡。</span></div><div v-else ref="messageList" class="message-list" role="log" aria-live="polite" aria-label="對話訊息"><p v-if="messagesLoading" class="list-state" role="status">正在載入訊息…</p><p v-else-if="!messages.length" class="list-empty"><strong>暫無訊息</strong><span>可以從下方回覆此對話。</span></p><article v-for="item in messages" :key="item.id" class="message" :class="{ 'is-staff': item.senderType === 'AGENT' || item.senderType === 'ADMIN' }"><div class="message-meta"><strong>{{senderLabel(item.senderType)}}</strong><time :datetime="item.createdAt">{{formatTime(item.createdAt)}}</time></div><p>{{item.text}}</p></article></div><form v-if="selectedId" class="composer" @submit.prevent="send"><div class="composer-attachments"><AgentButton class="composer-image" disabled aria-label="圖片訊息尚未開放"><span aria-hidden="true">▧</span> 圖片</AgentButton></div><div class="composer-row"><AgentInput v-model="draft" class="composer-input" type="text" aria-label="輸入訊息" maxlength="4000" placeholder="輸入訊息" autocomplete="off" :disabled="busy"/><AgentButton class="composer-send" type="submit" tone="primary" :disabled="busy || !draft.trim()">{{busy ? '發送中…' : '發送'}}</AgentButton></div></form></section></div>
        <div v-if="drawerIsOpen" class="mobile-drawer-overlay" @click.self="closeMobileDrawer"><aside id="agent-mobile-drawer" class="mobile-drawer" role="dialog" aria-modal="true" aria-label="工作台選單" @keydown.esc="closeMobileDrawer" @keydown.tab="trapDrawerFocus"><div class="mobile-drawer-heading"><strong>工作台選單</strong><AgentButton ref="drawerClose" class="mobile-drawer-close" aria-label="關閉選單" @click="closeMobileDrawer">✕</AgentButton></div><nav class="mobile-drawer-nav" aria-label="工作台導覽"><AgentButton :class="{ active: mobilePanel === 'inbox' && !selectedId }" :aria-current="mobilePanel === 'inbox' && !selectedId ? 'page' : undefined" @click="showMobileInbox">收件匣</AgentButton><AgentButton :class="{ active: mobilePanel === 'outbound' }" :aria-current="mobilePanel === 'outbound' ? 'page' : undefined" @click="showMobilePanel('outbound')">主動聯繫</AgentButton><AgentButton class="mobile-drawer-signout" @click="signOutFromDrawer">登出</AgentButton></nav></aside></div>
      </template>
    </main>`,
}).mount('#app')
