<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/messages/back.svg" mode="aspectFit" role="button" aria-label="返回上一頁" @tap="closeCachedPage('/pages/index/index')" />
      <text class="title">在線客服</text>
    </view>

    <view class="conversation">
      <view v-if="orderContext.id" class="order-context">
        <view class="context-heading"><text>關於此訂單／行程</text><text class="context-status">{{ orderContext.status }}</text></view>
        <text class="context-id">訂單 ID：{{ orderContext.id }}</text>
        <text class="context-hint">頁面參考資訊；訂單關聯尚待後端核對。</text>
      </view>
      <view v-if="!messages.length" class="welcome-card">
        <view class="welcome-avatar">客</view>
        <text class="welcome-title">您好，有甚麼可以幫您？</text>
        <text class="welcome-copy">在這裡與客服人員交流行程及訂單問題。</text>
      </view>
      <view v-for="item in messages" :key="item.id" class="message" :class="{ 'message--mine': item.senderType === (guest ? 'GUEST' : 'PASSENGER') }"><text>{{ item.text }}</text><text class="message-time">{{ item.createdAt.slice(11, 16) }}</text></view>
      <view v-if="loading" class="notice" role="status">正在載入客服對話…</view>
      <view v-if="error" class="notice" role="alert"><text class="notice-title">{{ error }}</text><text @tap="initialize">點此重試</text></view>
    </view>

    <view class="composer">
      <view class="composer-actions">
        <view class="media-action" role="button" aria-disabled="true" aria-label="上傳圖片，尚未開放"><image src="/static/support/image.svg" mode="aspectFit" /><text>圖片</text></view>
      </view>
      <view class="composer-row"><input v-model="draft" class="input" :disabled="!conversationId || sending" maxlength="4000" placeholder="輸入訊息" confirm-type="send" @confirm="send" /><view class="send" role="button" :aria-disabled="!draft.trim() || sending" @tap="send">{{ sending ? '發送中' : '發送' }}</view></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { onLoad, onShow, onHide } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { cachedPageUrl, closeCachedPage, getCachedPageOrderQuery, pagePath } from '../../utils/navigation'
import { listSupportMessages, openSupportConversation, sendSupportMessage, type SupportMessage } from '../../services/api'

const { responsiveStyle } = useResponsiveCanvas()
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
.header{position:relative;height:118px;border-radius:25px;background:#fff}
.back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}
.title{position:absolute;top:56px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500;white-space:nowrap}
.welcome-avatar{display:flex;align-items:center;justify-content:center;border-radius:50%;background:#285cfc;color:#fff;font-weight:700}
.conversation{height:calc(100% - 270px);padding:24px 20px;box-sizing:border-box;overflow-y:auto}
.order-context{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;padding:17px 18px;border:1px solid #dbe4ff;border-radius:17px;background:#fff}.context-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#38434a;font-size:15px;font-weight:700}.context-status{flex:none;padding:5px 9px;border-radius:999px;background:#edf2ff;color:#285cfc;font-size:11px;font-weight:500}.context-id{color:#536069;font-size:12px;overflow-wrap:anywhere}.context-hint{color:#87949d;font-size:11px;line-height:1.4}
.welcome-card{display:flex;flex-direction:column;align-items:center;padding:32px 26px 27px;border:1px solid #e6ecee;border-radius:22px;background:#fff;box-shadow:0 8px 24px rgba(39,52,61,.04);text-align:center}
.message{display:flex;flex-direction:column;align-items:flex-start;gap:4px;max-width:78%;margin:10px 0;padding:10px 13px;border-radius:14px;background:#fff;overflow-wrap:anywhere;font-size:14px}.message--mine{margin-left:auto;background:#dfe9ff}.message-time{font-size:10px;color:#87949d}
.welcome-avatar{width:60px;height:60px;font-size:22px}.welcome-title{margin-top:18px;font-size:18px;font-weight:700;color:#38434a}.welcome-copy{margin-top:10px;font-size:13px;line-height:1.65;color:#667078}
.notice{display:flex;flex-direction:column;gap:5px;margin-top:16px;padding:15px 17px;border:1px solid #dbe4ff;border-radius:14px;background:#f4f7ff;color:#667078;font-size:12px;line-height:1.5}.notice-title{color:#285cfc;font-size:13px;font-weight:700}
.composer{position:absolute;bottom:0;left:0;right:0;min-height:152px;padding:12px 16px calc(14px + env(safe-area-inset-bottom));box-sizing:border-box;background:#fff;border-top:1px solid #e7eaed}
.composer-actions{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}.media-action{display:flex;align-items:center;gap:6px;min-height:32px;margin:0;padding:5px 10px;border:1px solid #dce5e8;border-radius:999px;background:#f6f8f9;color:#88969b;font-size:15px;line-height:1}.media-action image{width:17px;height:17px}.media-action text{font-size:11px}
.composer-row{display:flex;align-items:flex-end;gap:10px}.input{flex:1;min-height:42px;max-height:100px;padding:10px 13px;box-sizing:border-box;border-radius:20px;background:#f1f3f5;color:#89969b;font-size:14px;line-height:22px}.send{width:70px;height:42px;margin:0;padding:0;border:0;border-radius:21px;background:#b5c2c6;color:#fff;font-size:14px;line-height:42px;text-align:center}
@media(max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
