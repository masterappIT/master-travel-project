import { computed, nextTick, onActivated, onDeactivated, onUnmounted, reactive, ref, watch } from 'vue'
import { createSupportApi } from './support.api.js'
import { createSupportActions } from './support.actions.js'

export function useSupportPage(context) {
  const { api, canWrite, isSuperAdministrator, supportSettings, settingsLoader, notify, requestConfirmation, displayError } = context
  const supportApi = createSupportApi(api)
  const section = ref('inbox')
  const audience = ref('ALL')
  const search = ref('')
  const recipientType = ref('PASSENGER')
  const recipientLookupMode = ref('PHONE')
  const recipientId = ref('')
  const recipientCountryCode = ref('+852')
  const recipientPhone = ref('')
  const recipientOptions = ref([])
  const recipientSearching = ref(false)
  const recipientSearchPerformed = ref(false)
  const recipientSearchError = ref('')
  const draft = ref('')
  const conversations = ref([])
  const messages = ref([])
  const participantProfile = ref(null)
  const participantProfileLoading = ref(false)
  const participantProfileError = ref('')
  const messageListElement = ref(null)
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
  const requests = { inbox: 0, messages: 0, profile: 0, agents: 0, pendingReply: null }
  let refreshTimer = null
  const participantLabel = type => ({ PASSENGER: '乘客', DRIVER: '司機', GUEST: '訪客' })[type] || '對話對象'
  const senderLabel = type => ({ PASSENGER: '乘客', DRIVER: '司機', GUEST: '訪客', ADMIN: '管理員', AGENT: '客服' })[type] || '未知發送者'
  const staffMessage = type => type === 'ADMIN' || type === 'AGENT'
  const formatTime = value => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '時間未知' : new Intl.DateTimeFormat('zh-Hant', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  }
  const scrollMessagesToEnd = async () => {
    await nextTick()
    const element = messageListElement.value
    if (element) element.scrollTop = element.scrollHeight
  }
  const filteredConversations = computed(() => conversations.value.filter(item => audience.value === 'ALL' || item.participantType === audience.value).filter(item => !search.value.trim() || `${item.participantId || ''} ${item.id}`.toLowerCase().includes(search.value.trim().toLowerCase())))
  const selectedConversation = computed(() => conversations.value.find(item => item.id === selectedId.value) || null)
  const stopRefresh = () => {
    if (refreshTimer) clearInterval(refreshTimer)
    refreshTimer = null
    requests.inbox += 1
    requests.messages += 1
    requests.profile += 1
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
  const recipientLabel = computed(() => recipientType.value === 'DRIVER' ? '司機' : '乘客')
  const formatRecipientPhone = item => {
    if (item.phoneCountryCode && item.phone) return `${item.phoneCountryCode} ${item.phone}`
    if (item.phone) return item.phone
    return item.mainlandPhone ? `+86 ${item.mainlandPhone}` : '電話未提供'
  }
  const recipientDisplayName = item => item.displayName || item.name || `${recipientLabel.value}帳戶`
  const participantPhone = profile => {
    if (!profile) return '未提供'
    if (profile.countryCode && profile.phoneNumber) return `${profile.countryCode} ${profile.phoneNumber}`
    if (profile.phoneCountryCode && profile.phone) return `${profile.phoneCountryCode} ${profile.phone}`
    return profile.phone || profile.phoneNumber || '未提供'
  }
  const driverRegionalPhone = (profile, region) => {
    if (!profile) return '未提供'
    if (region === 'mainland') return profile.mainlandPhone ? `+86 ${profile.mainlandPhone}` : profile.phoneCountryCode === '+86' && profile.phone ? `+86 ${profile.phone}` : '未提供'
    const code = profile.hongKongMacauCountryCode || (profile.phoneCountryCode !== '+86' ? profile.phoneCountryCode : '')
    const phone = profile.hongKongMacauPhone || (profile.phoneCountryCode !== '+86' ? profile.phone : '')
    return code && phone ? `${code} ${phone}` : '未提供'
  }
  const actions = createSupportActions({ supportApi, canWrite, isSuperAdministrator, supportSettings, settingsLoader, notify, requestConfirmation, displayError, section, recipientType, recipientId, recipientCountryCode, recipientPhone, recipientLookupMode, recipientOptions, recipientSearching, recipientSearchPerformed, recipientSearchError, draft, conversations, messages, selectedId, busy, inboxLoading, inboxLoaded, inboxError, messagesLoading, messagesLoaded, messagesError, actionError, participantProfile, participantProfileLoading, participantProfileError, agentActionId, agentsLoading, agentsLoaded, agentsError, agents, agentForm, savingSettings, settingsSaved, settingsDraft, serviceEnabled, requests, scrollMessagesToEnd })
  const { loadInbox, selectConversation, backToInbox, sendReply, searchRecipients, resetRecipientSearch, selectRecipient, openRecipient, loadParticipantProfile, loadAgents, createAgent, setAgentEnabled, saveSettings, onTabKeydown } = actions
  onActivated(() => {
    void loadInbox()
    if (isSuperAdministrator.value) void loadAgents()
    if (!refreshTimer) refreshTimer = setInterval(() => { if (section.value === 'inbox' && !inboxLoading.value) void loadInbox() }, 5000)
  })
  onDeactivated(stopRefresh)
  onUnmounted(stopRefresh)
  return { section, audience, search, recipientType, recipientLookupMode, recipientId, recipientCountryCode, recipientPhone, recipientOptions, recipientSearching, recipientSearchPerformed, recipientSearchError, recipientLabel, recipientDisplayName, formatRecipientPhone, participantPhone, driverRegionalPhone, serviceEnabled, settingsDraft, savingSettings, settingsSaved, saveSettings, canWrite, isSuperAdministrator, conversations, filteredConversations, selectedConversation, messages, selectedId, participantProfile, participantProfileLoading, participantProfileError, messageListElement, draft, busy, inboxLoading, inboxLoaded, inboxError, messagesLoading, messagesLoaded, messagesError, actionError, agents, agentsLoading, agentsLoaded, agentsError, agentActionId, agentForm, participantLabel, senderLabel, staffMessage, formatTime, loadInbox, selectConversation, backToInbox, sendReply, searchRecipients, resetRecipientSearch, selectRecipient, openRecipient, loadParticipantProfile, createAgent, setAgentEnabled, onTabKeydown, scrollMessagesToEnd }
}
