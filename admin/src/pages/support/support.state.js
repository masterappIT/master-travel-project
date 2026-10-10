import { computed, onActivated, onDeactivated, onUnmounted, reactive, ref, watch } from 'vue'
import { createSupportApi } from './support.api.js'
import { createSupportActions } from './support.actions.js'

export function useSupportPage(context) {
  const { api, canWrite, isSuperAdministrator, supportSettings, settingsLoader, notify, requestConfirmation, displayError } = context
  const supportApi = createSupportApi(api)
  const section = ref('inbox')
  const audience = ref('ALL')
  const search = ref('')
  const recipientType = ref('PASSENGER')
  const recipientId = ref('')
  const draft = ref('')
  const conversations = ref([])
  const messages = ref([])
  const selectedId = ref('')
  const busy = ref(false)
  const inboxLoading = ref(false)
  const inboxLoaded = ref(false)
  const inboxError = ref('')
  const messagesLoading = ref(false)
  const messagesLoaded = ref(false)
  const messagesError = ref('')
  const actionError = ref('')
  const agentActionId = ref('')
  const agentsLoading = ref(false)
  const agentsLoaded = ref(false)
  const agentsError = ref('')
  const agents = ref([])
  const agentForm = reactive({ username: '', displayName: '', password: '' })
  const requests = { inbox: 0, messages: 0, agents: 0, pendingReply: null }
  let refreshTimer = null
  const participantLabel = type => ({ PASSENGER: '乘客', DRIVER: '司機', GUEST: '訪客' })[type] || '對話對象'
  const senderLabel = type => ({ PASSENGER: '乘客', DRIVER: '司機', GUEST: '訪客', ADMIN: '管理員', AGENT: '客服' })[type] || '未知發送者'
  const staffMessage = type => type === 'ADMIN' || type === 'AGENT'
  const formatTime = value => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '時間未知' : new Intl.DateTimeFormat('zh-Hant', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  }
  const filteredConversations = computed(() => conversations.value.filter(item => audience.value === 'ALL' || item.participantType === audience.value).filter(item => !search.value.trim() || `${item.participantId || ''} ${item.id}`.toLowerCase().includes(search.value.trim().toLowerCase())))
  const stopRefresh = () => {
    if (refreshTimer) clearInterval(refreshTimer)
    refreshTimer = null
    requests.inbox += 1
    requests.messages += 1
    requests.agents += 1
    inboxLoading.value = false
    messagesLoading.value = false
    agentsLoading.value = false
  }
  const settingsDraft = reactive({ ...supportSettings.value })
  const savingSettings = ref(false)
  const settingsSaved = ref(false)
  const serviceEnabled = computed(() => supportSettings.value.enabled)
  watch(supportSettings, value => Object.assign(settingsDraft, value), { deep: true })
  watch(() => [settingsDraft.enabled, settingsDraft.guestEnabled, settingsDraft.directContactEnabled], () => {
    if (settingsDraft.enabled !== supportSettings.value.enabled || settingsDraft.guestEnabled !== supportSettings.value.guestEnabled || settingsDraft.directContactEnabled !== supportSettings.value.directContactEnabled) settingsSaved.value = false
  })
  const recipientLabel = computed(() => recipientType.value === 'DRIVER' ? '司機 ID' : '乘客 ID')
  const { loadInbox, selectConversation, sendReply, openRecipient, loadAgents, createAgent, setAgentEnabled, saveSettings, onTabKeydown } = createSupportActions({ supportApi, canWrite, isSuperAdministrator, supportSettings, settingsLoader, notify, requestConfirmation, displayError, section, recipientType, recipientId, draft, conversations, messages, selectedId, busy, inboxLoading, inboxLoaded, inboxError, messagesLoading, messagesLoaded, messagesError, actionError, agentActionId, agentsLoading, agentsLoaded, agentsError, agents, agentForm, savingSettings, settingsSaved, settingsDraft, serviceEnabled, requests })
  onActivated(() => {
    void loadInbox()
    if (isSuperAdministrator.value) void loadAgents()
    if (!refreshTimer) refreshTimer = setInterval(() => { if (section.value === 'inbox' && !inboxLoading.value) void loadInbox() }, 5000)
  })
  onDeactivated(stopRefresh)
  onUnmounted(stopRefresh)
  return { section, audience, search, recipientType, recipientId, draft, recipientLabel, serviceEnabled, settingsDraft, savingSettings, settingsSaved, saveSettings, canWrite, isSuperAdministrator, conversations, filteredConversations, messages, selectedId, busy, inboxLoading, inboxLoaded, inboxError, messagesLoading, messagesLoaded, messagesError, actionError, agents, agentsLoading, agentsLoaded, agentsError, agentActionId, agentForm, participantLabel, senderLabel, staffMessage, formatTime, loadInbox, selectConversation, sendReply, openRecipient, createAgent, setAgentEnabled, onTabKeydown }
}
