import { computed, nextTick, onActivated, onDeactivated, onUnmounted, reactive, ref, watch } from 'vue'
import { createSupportApi } from './support.api.js'
import { createSupportActions } from './support.actions.js'
import { createIncomingTracker, playSupportAlert, readSupportAlertPreference, writeSupportAlertPreference } from '../../utils/support-alert.js'

export function useSupportPage(context) {
  const { api, navigate, canWrite, isSuperAdministrator, supportSettings, settingsLoader, notify, requestConfirmation, displayError } = context
  const supportApi = createSupportApi(api)
  const section = ref('inbox')
  const audience = ref('ALL')
  const replyFilter = ref('PENDING')
  const audiences = [{ id: 'ALL', label: '全部' }, { id: 'PASSENGER', label: '乘客' }, { id: 'DRIVER', label: '司機' }, { id: 'GUEST', label: '訪客' }]
  const outboundOpen = ref(false)
  const outboundFirstField = ref(null)
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
  const profileExpanded = ref(false)
  watch(selectedId, () => { profileExpanded.value = false })
  const busy = ref(false)
  const inboxLoading = ref(false)
  const inboxLoaded = ref(false)
  const inboxError = ref('')
  const messagesLoading = ref(false)
  const messagesLoaded = ref(false)
  const messagesError = ref('')
  const hasMoreMessages = ref(false)
  const loadingOlder = ref(false)
  const alertSound = ref(readSupportAlertPreference())
  const trackIncoming = createIncomingTracker()
  const toggleAlertSound = () => { alertSound.value = !alertSound.value; writeSupportAlertPreference(alertSound.value); if (alertSound.value) playSupportAlert() }
  const actionError = ref('')
  const requests = { inbox: 0, messages: 0, profile: 0, pendingReply: null, forceScroll: false, profileLoadedFor: '' }
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
  const isNearBottom = () => {
    const element = messageListElement.value
    return !element || element.scrollHeight - element.scrollTop - element.clientHeight < 48
  }
  const keepScrollPosition = async update => {
    const element = messageListElement.value
    const previous = element ? element.scrollHeight - element.scrollTop : 0
    update()
    await nextTick()
    if (element) element.scrollTop = element.scrollHeight - previous
  }
  const conversationTitle = item => item.participantName || item.participantId || `訪客 ${item.id.slice(-4)}`
  const formatShortTime = value => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const sameDay = date.toDateString() === new Date().toDateString()
    return new Intl.DateTimeFormat('zh-Hant', sameDay ? { hour: '2-digit', minute: '2-digit', hour12: false } : { month: 'numeric', day: 'numeric' }).format(date)
  }
  // 各身份的待回覆數，顯示在分類按鈕上。
  const audienceCount = id => conversations.value.filter(item => item.needsStaffReply && (id === 'ALL' || item.participantType === id)).length
  const conversationSearchText = item => `${item.participantName || ''} ${item.participantPhone || ''} ${(item.participantPhone || '').replace(/\D/g, '')} ${item.participantId || ''} ${item.id}`.toLowerCase()
  const pendingCount = computed(() => conversations.value.filter(item => item.needsStaffReply).length)
  let baseTitle = null
  const syncTitle = () => { if (baseTitle !== null) document.title = pendingCount.value ? `(${pendingCount.value}) ${baseTitle}` : baseTitle }
  watch(pendingCount, syncTitle)
  const filteredConversations = computed(() => conversations.value.filter(item => audience.value === 'ALL' || item.participantType === audience.value).filter(item => replyFilter.value === 'ALL' || item.needsStaffReply).filter(item => !search.value.trim() || conversationSearchText(item).includes(search.value.trim().toLowerCase())))
  const selectedConversation = computed(() => conversations.value.find(item => item.id === selectedId.value) || null)
  const chatTitle = computed(() => participantProfile.value?.displayName || participantProfile.value?.name || (selectedConversation.value ? conversationTitle(selectedConversation.value) : ''))
  const driverStatus = computed(() => selectedConversation.value?.participantType !== 'DRIVER' || !participantProfile.value ? '' : participantProfile.value.isOnline ? '在線' : participantProfile.value.enabled === false ? '已停用' : '離線')
  const chatSubtitle = computed(() => [selectedConversation.value?.participantPhone, driverStatus.value].filter(Boolean).join(' · '))
  const stopRefresh = () => {
    if (refreshTimer) clearInterval(refreshTimer)
    refreshTimer = null
    requests.inbox += 1
    requests.messages += 1
    requests.profile += 1
    inboxLoading.value = false
    messagesLoading.value = false
    if (baseTitle !== null) { document.title = baseTitle; baseTitle = null }
  }
  const settingsDraft = reactive({ ...supportSettings.value })
  const savingSettings = ref(false)
  const settingsSaved = ref(false)
  const settingsDirty = computed(() => settingsDraft.enabled !== supportSettings.value.enabled || settingsDraft.guestEnabled !== supportSettings.value.guestEnabled || settingsDraft.directContactEnabled !== supportSettings.value.directContactEnabled)
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
  const actions = createSupportActions({ supportApi, canWrite, isSuperAdministrator, supportSettings, settingsLoader, notify, requestConfirmation, displayError, section, outboundOpen, recipientType, recipientId, recipientCountryCode, recipientPhone, recipientLookupMode, recipientOptions, recipientSearching, recipientSearchPerformed, recipientSearchError, draft, conversations, messages, selectedId, busy, inboxLoading, inboxLoaded, inboxError, messagesLoading, messagesLoaded, messagesError, actionError, participantProfile, participantProfileLoading, participantProfileError, hasMoreMessages, loadingOlder, alertSound, trackIncoming, playSupportAlert, isNearBottom, keepScrollPosition, savingSettings, settingsSaved, settingsDraft, serviceEnabled, requests, scrollMessagesToEnd })
  const { loadInbox, selectConversation, loadOlderMessages, retryParticipantProfile, backToInbox, sendReply, onComposerKeydown, searchRecipients, resetRecipientSearch, selectRecipient, openRecipient, loadParticipantProfile, saveSettings } = actions
  const openOutbound = async () => { resetRecipientSearch(); recipientPhone.value = ''; outboundOpen.value = true; await nextTick(); outboundFirstField.value?.focus() }
  const closeOutbound = () => { if (!busy.value) outboundOpen.value = false }
  onActivated(() => {
    if (baseTitle === null) { baseTitle = document.title; syncTitle() }
    void loadInbox()
    if (!refreshTimer) refreshTimer = setInterval(() => { if (!inboxLoading.value) void loadInbox() }, 5000)
  })
  onDeactivated(stopRefresh)
  onUnmounted(stopRefresh)
  return { audiences, audienceCount, formatShortTime, chatTitle, chatSubtitle, outboundOpen, outboundFirstField, openOutbound, closeOutbound, navigate, hasMoreMessages, loadingOlder, loadOlderMessages, retryParticipantProfile, onComposerKeydown, alertSound, toggleAlertSound, pendingCount, conversationTitle, section, audience, replyFilter, search, recipientType, recipientLookupMode, recipientId, recipientCountryCode, recipientPhone, recipientOptions, recipientSearching, recipientSearchPerformed, recipientSearchError, recipientLabel, recipientDisplayName, formatRecipientPhone, participantPhone, driverRegionalPhone, serviceEnabled, settingsDraft, settingsDirty, savingSettings, settingsSaved, saveSettings, canWrite, isSuperAdministrator, conversations, filteredConversations, selectedConversation, messages, selectedId, profileExpanded, participantProfile, participantProfileLoading, participantProfileError, messageListElement, draft, busy, inboxLoading, inboxLoaded, inboxError, messagesLoading, messagesLoaded, messagesError, actionError, participantLabel, senderLabel, staffMessage, formatTime, loadInbox, selectConversation, backToInbox, sendReply, searchRecipients, resetRecipientSearch, selectRecipient, openRecipient, loadParticipantProfile, scrollMessagesToEnd }
}
