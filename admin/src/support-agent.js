import { createApp, computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import './support-agent.css'

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
    const draft = ref('')
    const recipient = reactive({ participantType: 'PASSENGER', participantId: '' })
    const error = ref('')
    const busy = ref(false)
    let pendingReply = null
    let timer = null
    const filtered = computed(() => conversations.value)
    const load = async () => {
      try {
        conversations.value = (await request('/conversations')).data || []
        if (selectedId.value) await select(selectedId.value)
        error.value = ''
      } catch (cause) { error.value = cause.message }
    }
    const select = async id => {
      selectedId.value = id
      try { messages.value = (await request(`/conversations/${encodeURIComponent(id)}/messages`)).data || []; error.value = '' }
      catch (cause) { error.value = cause.message }
    }
    const signIn = async () => {
      busy.value = true
      try { agent.value = (await request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) })).agent; credentials.password = ''; await load() }
      catch (cause) { error.value = cause.message }
      finally { busy.value = false }
    }
    const signOut = async () => {
      try { await request('/auth/logout', { method: 'POST' }); agent.value = null; selectedId.value = ''; conversations.value = []; messages.value = [] }
      catch (cause) { error.value = cause.message }
    }
    const send = async () => {
      if (!selectedId.value || !draft.value.trim() || busy.value) return
      busy.value = true
      try {
        const text = draft.value.trim()
        if (pendingReply?.text !== text || pendingReply?.conversationId !== selectedId.value) pendingReply = { text, conversationId: selectedId.value, id: `m${Date.now()}${Math.random().toString(36).slice(2, 12)}` }
        await request(`/conversations/${encodeURIComponent(selectedId.value)}/messages`, { method: 'POST', body: JSON.stringify({ text, clientMessageId: pendingReply.id }) })
        pendingReply = null
        draft.value = ''; await load()
      } catch (cause) { error.value = cause.message }
      finally { busy.value = false }
    }
    const open = async () => {
      if (!recipient.participantId.trim() || busy.value) return
      busy.value = true
      try {
        const conversation = await request('/conversations', { method: 'POST', body: JSON.stringify({ participantType: recipient.participantType, participantId: recipient.participantId.trim() }) })
        await load(); await select(conversation.id)
      } catch (cause) { error.value = cause.message }
      finally { busy.value = false }
    }
    onMounted(async () => {
      try { agent.value = await request('/auth/me'); await load() } catch { agent.value = null }
      timer = setInterval(() => { if (agent.value) void load() }, 5000)
    })
    onUnmounted(() => { if (timer) clearInterval(timer) })
    return { agent, credentials, conversations, filtered, selectedId, messages, draft, recipient, error, busy, signIn, signOut, select, send, open }
  },
  template: `
    <main class="support-agent-app">
      <header><div><small>CUSTOMER SUPPORT</small><h1>客服工作台</h1></div><button v-if="agent" type="button" @click="signOut">登出 {{agent.displayName}}</button></header>
      <p v-if="error" role="alert" class="error">{{error}}</p>
      <form v-if="!agent" class="login-card" @submit.prevent="signIn"><h2>客服登入</h2><label>帳號<input v-model.trim="credentials.username" autocomplete="username" required/></label><label>密碼<input v-model="credentials.password" type="password" autocomplete="current-password" required/></label><button :disabled="busy">登入</button></form>
      <template v-else>
        <section class="outbound"><h2>按現有 ID 聯繫</h2><select v-model="recipient.participantType" aria-label="對象身份"><option value="PASSENGER">乘客</option><option value="DRIVER">司機</option></select><input v-model.trim="recipient.participantId" placeholder="現有帳戶 ID" aria-label="現有帳戶 ID"/><button :disabled="busy || !recipient.participantId" @click="open">開啟對話</button></section>
        <div class="workspace"><section class="inbox"><h2>共用收件匣</h2><p v-if="!filtered.length">暫無對話</p><button v-for="item in filtered" :key="item.id" :class="{ selected: selectedId === item.id }" @click="select(item.id)">{{item.participantType}} · {{item.participantId || item.id}}</button></section><section class="conversation"><h2>對話內容</h2><p v-if="!selectedId">選取對話以查看訊息</p><div v-else class="message-list"><p v-if="!messages.length">暫無訊息</p><article v-for="item in messages" :key="item.id"><strong>{{item.senderType}}</strong><p>{{item.text}}</p><small>{{item.createdAt}}</small></article></div><form v-if="selectedId" @submit.prevent="send"><label>回覆<textarea v-model="draft" maxlength="4000" rows="3"/></label><button :disabled="busy || !draft.trim()">發送</button></form></section></div>
      </template>
    </main>`,
}).mount('#app')
