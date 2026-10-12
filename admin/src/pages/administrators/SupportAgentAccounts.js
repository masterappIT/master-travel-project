import { computed, h, inject, nextTick, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import './support-agent-accounts.css'

const AgentAccountButton = {
  name: 'AgentAccountButton',
  inheritAttrs: false,
  props: { disabled: Boolean, tone: { type: String, default: 'secondary' } },
  render() {
    return h('button', {
      ...this.$attrs,
      type: this.$attrs.type || 'button',
      class: ['agent-account-button', `agent-account-button--${this.tone}`, this.$attrs.class],
      disabled: this.disabled
    }, this.$slots.default?.())
  }
}

const AgentAccountInput = {
  name: 'AgentAccountInput',
  inheritAttrs: false,
  props: { modelValue: { type: String, default: '' }, disabled: Boolean },
  emits: ['update:modelValue'],
  methods: { focus() { this.$el?.focus() } },
  render() {
    return h('input', {
      ...this.$attrs,
      class: ['agent-account-input', this.$attrs.class],
      value: this.modelValue,
      disabled: this.disabled,
      onInput: event => this.$emit('update:modelValue', event.target.value)
    })
  }
}

export const SupportAgentAccounts = {
  name: 'SupportAgentAccounts',
  components: { AgentAccountButton, AgentAccountInput },
  setup() {
    const { api, canWrite, notify, requestConfirmation, displayError } = inject('adminSupportAgentAccountsContext')
    const agents = ref([])
    const agentsLoading = ref(false)
    const agentsLoaded = ref(false)
    const agentsError = ref('')
    const agentForm = ref(null)
    const formError = ref('')
    const saving = ref(false)
    const agentActionId = ref('')
    const firstField = ref(null)
    const enabledCount = computed(() => agents.value.filter(item => item.enabled).length)
    const isLocked = agent => Boolean(agent.lockedUntil) && new Date(agent.lockedUntil) > new Date()
    const formatTime = value => {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('zh-Hant', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    }
    const formValid = computed(() => {
      const form = agentForm.value
      if (!form || !form.displayName.trim()) return false
      return form.id ? true : Boolean(form.username.trim() && form.password)
    })
    let request = 0
    const loadAgents = async () => {
      const current = ++request
      if (!agentsLoaded.value) agentsError.value = ''
      agentsLoading.value = true
      try {
        const response = await api('/admin/support/agents', { cancelOnNavigate: false })
        if (current === request) { agents.value = response.data || []; agentsLoaded.value = true; agentsError.value = '' }
      } catch (cause) { if (current === request) agentsError.value = displayError(cause) }
      finally { if (current === request) agentsLoading.value = false }
    }
    const openForm = async agent => {
      formError.value = ''
      agentForm.value = agent ? { id: agent.id, username: agent.username, displayName: agent.displayName, originalDisplayName: agent.displayName, password: '' } : { id: '', username: '', displayName: '', password: '' }
      await nextTick()
      firstField.value?.focus()
    }
    const closeForm = () => { if (!saving.value) agentForm.value = null }
    const saveAgent = async () => {
      const form = agentForm.value
      if (!canWrite.value || !form || !formValid.value || saving.value) return
      if (form.id && form.displayName.trim() === form.originalDisplayName && !form.password) { agentForm.value = null; return }
      saving.value = true
      formError.value = ''
      try {
        if (form.id) {
          const changes = { ...(form.displayName.trim() !== form.originalDisplayName ? { displayName: form.displayName.trim() } : {}), ...(form.password ? { password: form.password } : {}) }
          await api(`/admin/support/agents/${encodeURIComponent(form.id)}`, { method: 'PATCH', body: JSON.stringify(changes) })
          notify(form.password ? '客服帳戶已更新，原有登入已失效' : '客服帳戶已更新')
        } else {
          await api('/admin/support/agents', { method: 'POST', body: JSON.stringify({ username: form.username.trim(), displayName: form.displayName.trim(), password: form.password }) })
          notify('客服帳戶已建立')
        }
        agentForm.value = null
        await loadAgents()
      } catch (cause) { formError.value = displayError(cause) }
      finally { saving.value = false }
    }
    const runAction = async (agent, confirmation, action) => {
      if (!canWrite.value || agentActionId.value || saving.value) return
      agentActionId.value = agent.id
      try {
        if (confirmation && !await requestConfirmation(confirmation)) return
        await action()
        await loadAgents()
      } catch (cause) { notify(displayError(cause), 'error') }
      finally { agentActionId.value = '' }
    }
    const setAgentEnabled = agent => runAction(agent, agent.enabled ? { title: '停用客服帳戶', message: `確定停用「${agent.displayName}」？此帳戶的現有登入工作階段會立即失效。`, confirmLabel: '停用', danger: true } : null, async () => {
      await api(`/admin/support/agents/${encodeURIComponent(agent.id)}`, { method: 'PATCH', body: JSON.stringify({ enabled: !agent.enabled }) })
      notify(agent.enabled ? '客服帳戶已停用' : '客服帳戶已啟用')
    })
    const unlockAgent = agent => runAction(agent, { title: '解除帳戶鎖定', message: `確定解除「${agent.displayName}」的登入鎖定？`, confirmLabel: '解除鎖定' }, async () => {
      await api(`/admin/support/agents/${encodeURIComponent(agent.id)}/unlock`, { method: 'POST' })
      notify('帳戶鎖定已解除')
    })
    const revokeAgentSessions = agent => runAction(agent, { title: '撤銷登入工作階段', message: `確定登出「${agent.displayName}」在客服工作台的所有裝置？`, confirmLabel: '全部登出', danger: true }, async () => {
      const result = await api(`/admin/support/agents/${encodeURIComponent(agent.id)}/revoke-sessions`, { method: 'POST' })
      notify(`已撤銷 ${result.revokedCount} 個工作階段`)
    })
    // 頁面是 KeepAlive 內的非同步元件：首次掛載時子元件收不到 activated，之後切回才會收到。
    let active = false
    const start = () => { if (active) return; active = true; void loadAgents() }
    const stop = () => { active = false; request += 1; agentsLoading.value = false }
    onMounted(start)
    onActivated(start)
    onDeactivated(stop)
    onUnmounted(stop)
    return { canWrite, agents, agentsLoading, agentsLoaded, agentsError, agentForm, formError, formValid, saving, agentActionId, firstField, enabledCount, isLocked, formatTime, loadAgents, openForm, closeForm, saveAgent, setAgentEnabled, unlockAgent, revokeAgentSessions }
  },
  template: String.raw`
    <section class="support-agent-accounts" aria-labelledby="support-agent-accounts-title">
      <div class="agent-accounts-heading">
        <div><span class="agent-accounts-kicker">SUPPORT AGENTS</span><h3 id="support-agent-accounts-title">客服帳戶</h3><p>客服帳戶只能登入獨立客服工作台處理對話，不能登入管理後台，也不屬於上方的管理員角色。</p></div>
        <AgentAccountButton v-if="canWrite" tone="primary" @click="openForm()">＋ 新增客服帳戶</AgentAccountButton>
      </div>
      <div class="agent-accounts-panel">
        <p v-if="agentsLoaded" class="agent-accounts-summary"><strong>{{agents.length}}</strong> 個客服帳戶 · <strong>{{enabledCount}}</strong> 個啟用中</p>
        <p v-if="agentsError" class="agent-accounts-error" role="alert">帳戶清單讀取失敗：{{agentsError}} <AgentAccountButton tone="compact" @click="loadAgents">重試</AgentAccountButton></p>
        <p v-if="agentsLoading && !agentsLoaded" class="agent-accounts-state" role="status">正在載入客服帳戶…</p>
        <div v-else-if="agentsLoaded && !agents.length" class="agent-accounts-state"><strong>尚未建立客服帳戶</strong><span>建立後，客服人員即可用該帳號登入獨立客服工作台。</span></div>
        <div v-if="agents.length" class="agent-accounts-table-wrap">
          <table class="agent-accounts-table">
            <thead><tr><th scope="col">帳號</th><th scope="col">名稱</th><th scope="col">狀態</th><th scope="col">安全狀態</th><th scope="col">最後登入</th><th scope="col">操作</th></tr></thead>
            <tbody>
              <tr v-for="agent in agents" :key="agent.id">
                <td><strong class="agent-accounts-username">{{agent.username}}</strong></td>
                <td>{{agent.displayName}}</td>
                <td><span class="agent-accounts-status" :class="{ 'is-enabled': agent.enabled }">{{agent.enabled ? '已啟用' : '已停用'}}</span></td>
                <td><div class="agent-accounts-security"><strong :class="{ 'is-locked': isLocked(agent) }">{{isLocked(agent) ? '已鎖定' : '正常'}}</strong><small>{{agent.failedLoginAttempts || 0}} 次失敗 · {{agent.activeSessionCount || 0}} 個工作階段</small></div></td>
                <td>{{agent.lastLoginAt ? formatTime(agent.lastLoginAt) : '—'}}</td>
                <td>
                  <div v-if="canWrite" class="agent-accounts-actions">
                    <AgentAccountButton tone="row" :disabled="Boolean(agentActionId)" @click="openForm(agent)">編輯</AgentAccountButton>
                    <AgentAccountButton v-if="isLocked(agent)" tone="row-warning" :disabled="Boolean(agentActionId)" @click="unlockAgent(agent)">解鎖</AgentAccountButton>
                    <AgentAccountButton v-if="agent.activeSessionCount" tone="row" :disabled="Boolean(agentActionId)" @click="revokeAgentSessions(agent)">登出</AgentAccountButton>
                    <AgentAccountButton :tone="agent.enabled ? 'row-danger' : 'row'" :disabled="Boolean(agentActionId)" @click="setAgentEnabled(agent)">{{agentActionId === agent.id ? '處理中' : agent.enabled ? '停用' : '啟用'}}</AgentAccountButton>
                  </div>
                  <span v-else class="agent-accounts-readonly">唯讀</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-if="agentForm" class="agent-accounts-dialog-backdrop" @click.self="closeForm" @keydown.esc="closeForm">
        <form class="agent-accounts-dialog" role="dialog" aria-modal="true" aria-labelledby="support-agent-dialog-title" @submit.prevent="saveAgent">
          <div class="agent-accounts-dialog-heading"><div><span class="agent-accounts-kicker">{{agentForm.id ? 'EDIT AGENT' : 'NEW AGENT'}}</span><h3 id="support-agent-dialog-title">{{agentForm.id ? '編輯客服帳戶' : '新增客服帳戶'}}</h3><p>此帳戶僅用於登入獨立客服工作台。</p></div><AgentAccountButton tone="close" aria-label="關閉" :disabled="saving" @click="closeForm">×</AgentAccountButton></div>
          <p v-if="formError" class="agent-accounts-error" role="alert">{{formError}}</p>
          <label v-if="!agentForm.id"><span>登入帳號</span><AgentAccountInput ref="firstField" v-model="agentForm.username" placeholder="例如：cs_agent01" autocomplete="off" maxlength="64" :disabled="saving"/><small>3 至 64 個字元，可用英文字母、數字、點、底線與連字號；建立後不可更改。</small></label>
          <div v-else class="agent-accounts-dialog-readonly"><span>登入帳號</span><strong>{{agentForm.username}}</strong></div>
          <label><span>顯示名稱</span><AgentAccountInput v-if="agentForm.id" ref="firstField" v-model="agentForm.displayName" placeholder="例如：客服小陳" autocomplete="off" maxlength="100" :disabled="saving"/><AgentAccountInput v-else v-model="agentForm.displayName" placeholder="例如：客服小陳" autocomplete="off" maxlength="100" :disabled="saving"/></label>
          <label><span>{{agentForm.id ? '重設密碼' : '初始密碼'}}</span><AgentAccountInput v-model="agentForm.password" type="password" autocomplete="new-password" maxlength="128" :placeholder="agentForm.id ? '留空即不修改密碼' : '至少 8 個字元'" :disabled="saving"/><small>{{agentForm.id ? '重設密碼後，此帳戶的現有登入會立即失效，登入鎖定也會一併解除。' : '請使用至少 8 個字元且不易猜測的密碼。'}}</small></label>
          <div class="agent-accounts-dialog-actions"><AgentAccountButton :disabled="saving" @click="closeForm">取消</AgentAccountButton><AgentAccountButton type="submit" tone="primary" :disabled="saving || !formValid">{{saving ? '儲存中…' : agentForm.id ? '保存修改' : '建立客服帳戶'}}</AgentAccountButton></div>
        </form>
      </div>
    </section>`
}
