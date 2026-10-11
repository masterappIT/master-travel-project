<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/messages/back.svg" mode="aspectFit" role="button" aria-label="返回上一頁" @tap="closeCachedPage('/pages/index/index')" />
      <view class="header-copy"><text class="eyebrow">MASTER SUPPORT</text><text class="title">在線客服</text><text class="header-subtitle">我們會在這裡協助您</text></view>
    </view>

    <view class="conversation">
      <view class="conversation-status" :class="{ 'conversation-status--error': error }"><view class="status-icon">{{ error ? '!' : '✓' }}</view><view><text class="conversation-status-title">文字客服</text><text class="conversation-status-copy">訊息會安全保存在此對話中</text></view><text class="conversation-status-state">{{ loading ? '連線中' : error ? '暫不可用' : conversationId ? '已連線' : '準備連線' }}</text></view>
      <view v-if="orderContext.id" class="order-context">
        <view class="context-heading"><view class="context-title-wrap"><view class="context-icon">訂</view><text>關於此訂單／行程</text></view><text class="context-status">{{ orderContext.status }}</text></view>
        <text class="context-id">訂單 ID：{{ orderContext.id }}</text>
        <text class="context-hint">客服可先參考此情境，訂單權限仍由系統核對。</text>
      </view>
      <view v-if="!messages.length && !loading && !error" class="welcome-card">
        <view class="welcome-avatar"><image src="/static/customer-service.svg" mode="aspectFit" /></view>
        <text class="welcome-title">您好，有甚麼可以幫您？</text>
        <text class="welcome-copy">請描述您的問題，客服人員會在這裡回覆您。</text>
        <view class="welcome-tips"><text>行程問題</text><text>訂單查詢</text><text>付款協助</text></view>
      </view>
      <view v-for="item in messages" :key="item.id" class="message-row" :class="{ 'message-row--mine': isMine(item.senderType) }"><view class="message" :class="{ 'message--mine': isMine(item.senderType) }"><view class="message-meta"><text class="message-sender">{{ senderLabel(item.senderType) }}</text></view><text class="message-copy">{{ item.text }}</text><view class="message-footer"><text class="message-date">{{ formatMessageDate(item.createdAt) }}</text><text class="message-time">{{ formatMessageTime(item.createdAt) }}</text></view></view></view>
      <view v-if="loading" class="notice notice--loading" role="status"><view class="loading-dot" /><text>正在載入客服對話…</text></view>
      <view v-if="error" class="notice notice--error" role="alert"><text class="notice-title">{{ error }}</text><text class="retry" role="button" @tap="initialize">重新載入</text></view>
    </view>

    <view class="composer">
      <view class="composer-heading"><text>回覆客服</text><text>{{ draft.length }}/4000</text></view>
      <view class="composer-row"><input v-model="draft" class="input" :disabled="!conversationId || sending" maxlength="4000" placeholder="輸入訊息…" confirm-type="send" adjust-position="false" @confirm="send" /><view class="send" :class="{ 'send--active': draft.trim() && !sending }" role="button" :aria-disabled="!draft.trim() || sending" @tap="send"><text>{{ sending ? '發送中' : '發送' }}</text><text v-if="!sending" class="send-arrow">↑</text></view></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { onLoad, onShow, onHide } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { cachedPageUrl, closeCachedPage, getCachedPageOrderQuery, pagePath } from '../../utils/navigation'
import { listSupportMessages, openSupportConversation, sendSupportMessage, type SupportMessage } from '../../services/api'

const { responsiveStyle } = useResponsiveCanvas({ preserveHeightOnKeyboard: true })
const orderContext = reactive({ id: '', status: '' })
const messages = ref<SupportMessage[]>([])
const conversationId = ref('')
const guest = ref(false)
const draft = ref('')
const loading = ref(false)
const sending = ref(false)
const error = ref('')
let pendingMessage: { text: string; id: string } | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null
let requestVersion = 0
const senderLabel = (senderType: string) => {
  if (senderType === 'ADMIN' || senderType === 'AGENT') return '客服人員'
  if (senderType === 'PASSENGER' || senderType === 'GUEST') return '我'
  return '對話參與者'
}
const isMine = (senderType: string) => senderType === 'PASSENGER' || senderType === 'GUEST'
const formatMessageTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
const formatMessageDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}
const refresh = async () => {
  if (!conversationId.value) return
  const version = ++requestVersion
  try { const result = await listSupportMessages(conversationId.value, guest.value); if (version === requestVersion) { messages.value = result; error.value = '' } }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '無法載入客服訊息' }
}
const initialize = async () => {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const session = await openSupportConversation()
    if (conversationId.value !== session.conversation.id) { messages.value = []; pendingMessage = null }
    conversationId.value = session.conversation.id
    guest.value = session.guest
    await refresh()
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '客服服務目前不可用' }
  finally { loading.value = false }
}
const send = async () => {
  const value = draft.value.trim()
  if (!value || !conversationId.value || sending.value) return
  sending.value = true
  if (pendingMessage?.text !== value) pendingMessage = { text: value, id: `m${Date.now()}${Math.random().toString(36).slice(2, 12)}` }
  try { await sendSupportMessage(conversationId.value, guest.value, value, pendingMessage.id); pendingMessage = null; draft.value = ''; await refresh() }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '發送失敗，請重試' }
  finally { sending.value = false }
}
const startConversation = () => {
  void initialize()
  if (!refreshTimer) refreshTimer = setInterval(() => void refresh(), 5000)
}
const stopConversation = () => {
  requestVersion++
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = null
}
onShow(startConversation)
onHide(stopConversation)
// #ifdef MP-WEIXIN || MP-TOUTIAO
// The mini-program mounts this view inside the home page, so page onShow does
// not run when the embedded view first appears.
onMounted(startConversation)
// #endif
onUnmounted(stopConversation)
const knownStatuses = new Set(['待確認', '待出行', '司機已安排', '行程進行中', '已完成', '已取消'])
const applyContext = (url: string) => {
  if (pagePath(url) !== '/pages/support/chat') return
  const query = getCachedPageOrderQuery(url)
  orderContext.id = (query.orderId || '').slice(0, 100)
  orderContext.status = orderContext.id && knownStatuses.has(query.orderStatus) ? query.orderStatus : '訂單狀態待核對'
}
onLoad(options => {
  const query = options ? `?orderId=${encodeURIComponent(options.orderId || '')}&orderStatus=${encodeURIComponent(options.orderStatus || '')}` : ''
  applyContext(`/pages/support/chat${query}`)
})
// #ifdef H5
const applyHashContext = () => { if (typeof window !== 'undefined') applyContext(window.location.hash.slice(1)) }
onMounted(() => { applyHashContext(); window.addEventListener('hashchange', applyHashContext) })
onUnmounted(() => window.removeEventListener('hashchange', applyHashContext))
// #endif
// #ifdef MP-WEIXIN || MP-TOUTIAO
watch(cachedPageUrl, applyContext, { immediate: true })
// #endif
</script>

<style scoped>
.page{position:fixed;top:50%;left:50%;width:430px;height:932px;overflow:hidden;background:#f0f2f5;border-radius:35px;box-sizing:border-box;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:translate(-50%,-50%)}
.header{position:relative;height:124px;padding-top:1px;border-radius:25px;background:#fff;box-shadow:0 3px 14px rgba(56,67,74,.04)}.back{position:absolute;top:56px;left:22px;width:30px;height:38px;padding:7px;box-sizing:border-box}.header-copy{position:absolute;top:53px;left:72px;display:flex;flex-direction:column}.eyebrow{color:#285cfc;font-size:10px;font-weight:800;letter-spacing:.13em}.title{margin-top:4px;font-size:22px;font-weight:700;line-height:30px;white-space:nowrap}.header-subtitle{margin-top:2px;color:#87949d;font-size:11px}
.conversation{height:calc(100% - 232px - env(safe-area-inset-bottom) - var(--keyboard-offset, 0px));min-height:0;padding:17px 16px 26px;box-sizing:border-box;overflow-y:auto;overscroll-behavior:contain}.conversation-status{display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:12px 14px;border:1px solid #e0e7eb;border-radius:15px;background:#fff}.conversation-status--error{border-color:#f0d6d1;background:#fff7f5}.status-icon{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:10px;background:#e2fbf1;color:#12a56e;font-size:14px;font-weight:800}.conversation-status--error .status-icon{background:#ffe8e2;color:#c15b4b}.conversation-status-title{display:block;font-size:12px;font-weight:700}.conversation-status-copy{display:block;margin-top:2px;color:#87949d;font-size:10px}.conversation-status-state{margin-left:auto;color:#12a56e;font-size:10px;font-weight:700}.conversation-status--error .conversation-status-state{color:#c15b4b}
.order-context{display:flex;flex-direction:column;gap:7px;margin-bottom:12px;padding:14px 15px;border:1px solid #dbe4ff;border-radius:16px;background:#fff}.context-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#38434a;font-size:13px;font-weight:700}.context-title-wrap{display:flex;align-items:center;gap:8px}.context-icon{display:flex;align-items:center;justify-content:center;width:25px;height:25px;border-radius:8px;background:#edf2ff;color:#285cfc;font-size:10px}.context-status{flex:none;padding:4px 8px;border-radius:999px;background:#edf2ff;color:#285cfc;font-size:10px;font-weight:600}.context-id{color:#536069;font-size:11px;overflow-wrap:anywhere}.context-hint{color:#87949d;font-size:10px;line-height:1.4}
.welcome-card{display:flex;flex-direction:column;align-items:center;padding:28px 24px 22px;border:1px solid #e6ecee;border-radius:20px;background:#fff;box-shadow:0 8px 24px rgba(39,52,61,.04);text-align:center}.welcome-avatar{display:flex;align-items:center;justify-content:center;width:58px;height:58px;border-radius:18px;background:#edf2ff}.welcome-avatar image{width:34px;height:34px}.welcome-title{margin-top:15px;color:#38434a;font-size:17px;font-weight:700}.welcome-copy{margin-top:7px;color:#667078;font-size:12px;line-height:1.6}.welcome-tips{display:flex;gap:7px;margin-top:17px}.welcome-tips text{padding:6px 9px;border-radius:999px;color:#285cfc;background:#f3f6ff;font-size:10px}
.message-row{display:flex;justify-content:flex-start;margin:10px 0}.message-row--mine{justify-content:flex-end}.message{display:flex;flex-direction:column;max-width:78%;padding:10px 12px;border:1px solid #e1e9ed;border-radius:15px 15px 15px 5px;background:#fff;overflow-wrap:anywhere}.message--mine{border-color:#d5e0ff;border-radius:15px 15px 5px 15px;background:#dfe9ff}.message-meta{display:flex;align-items:center;gap:10px;margin-bottom:6px}.message-sender{color:#536069;font-size:10px;font-weight:700}.message--mine .message-sender{color:#285cfc}.message-copy{color:#38434a;font-size:13px;line-height:1.55;white-space:pre-wrap}.message-footer{display:flex;align-items:center;justify-content:flex-end;gap:7px;margin-top:7px}.message-date,.message-time{color:#87949d;font-size:9px;line-height:1.2;white-space:nowrap}
.notice{display:flex;align-items:center;gap:9px;margin-top:13px;padding:12px 14px;border:1px solid #dbe4ff;border-radius:13px;background:#f4f7ff;color:#667078;font-size:11px;line-height:1.5}.notice--error{justify-content:space-between;border-color:#f0d6d1;background:#fff7f5}.notice-title{color:#c15b4b;font-size:11px;font-weight:700}.retry{flex:none;color:#285cfc;font-size:11px;font-weight:700}.loading-dot{width:10px;height:10px;border:2px solid #cad8ff;border-top-color:#285cfc;border-radius:50%;animation:chat-spin .8s linear infinite}@keyframes chat-spin{to{transform:rotate(360deg)}}
.composer{position:absolute;bottom:var(--keyboard-offset, 0px);left:0;right:0;height:calc(108px + env(safe-area-inset-bottom));min-height:calc(108px + env(safe-area-inset-bottom));padding:8px 16px calc(28px + env(safe-area-inset-bottom));box-sizing:border-box;background:#fff;border-top:1px solid #e7eaed;box-shadow:0 -5px 16px rgba(56,67,74,.04);z-index:2}.composer-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;color:#536069;font-size:11px;font-weight:700}.composer-heading text:last-child{color:#a0abb2;font-weight:400}.composer-row{display:flex;align-items:flex-end;gap:9px}.input{flex:1;min-height:44px;max-height:100px;padding:10px 13px;box-sizing:border-box;border:1px solid #dce5e8;border-radius:14px;background:#f6f8f9;color:#38434a;font-size:13px;line-height:22px}.input:focus{border-color:#9db8ff;background:#fff}.send{display:flex;align-items:center;justify-content:center;gap:3px;width:74px;height:44px;margin:0;padding:0;border-radius:14px;background:#c7d0d4;color:#fff;font-size:12px;font-weight:700}.send--active{background:#285cfc;box-shadow:0 4px 10px rgba(40,92,252,.2)}.send-arrow{font-size:15px;line-height:1}
@media(max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
