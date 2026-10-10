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
        <text class="context-hint">頁面參考資訊；客服接通後仍需核對訂單。</text>
      </view>
      <view class="welcome-card">
        <view class="welcome-avatar">客</view>
        <text class="welcome-title">您好，有甚麼可以幫您？</text>
        <text class="welcome-copy">未來可在這裡與客服人員交流行程及訂單問題，傳送圖片、影片和語音訊息，或接聽語音通話。</text>
      </view>
      <view class="notice" role="status"><text class="notice-title">客服服務尚未接通</text><text>目前無法傳送訊息或附件，也無法撥打電話。請勿在此輸入緊急事項。</text></view>
    </view>

    <view class="composer">
      <view class="composer-actions">
        <view class="media-action" role="button" aria-disabled="true" aria-label="上傳圖片，尚未開放"><image src="/static/support/image.svg" mode="aspectFit" /><text>圖片</text></view>
        <view class="media-action" role="button" aria-disabled="true" aria-label="上傳影片，尚未開放"><image src="/static/support/video.svg" mode="aspectFit" /><text>影片</text></view>
        <view class="voice-action" role="button" aria-disabled="true" aria-label="錄製語音訊息，尚未開放">♫<text>語音訊息</text></view>
        <view class="call-action" role="button" aria-disabled="true" aria-label="語音通話，尚未開放">☎<text>語音通話</text></view>
      </view>
      <view class="composer-row"><view class="input" aria-disabled="true">客服服務接通後可輸入訊息</view><view class="send" role="button" aria-disabled="true">發送</view></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { cachedPageUrl, closeCachedPage, getCachedPageOrderQuery, pagePath } from '../../utils/navigation'

const { responsiveStyle } = useResponsiveCanvas()
const orderContext = reactive({ id: '', status: '' })
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
.welcome-avatar{width:60px;height:60px;font-size:22px}.welcome-title{margin-top:18px;font-size:18px;font-weight:700;color:#38434a}.welcome-copy{margin-top:10px;font-size:13px;line-height:1.65;color:#667078}
.notice{display:flex;flex-direction:column;gap:5px;margin-top:16px;padding:15px 17px;border:1px solid #dbe4ff;border-radius:14px;background:#f4f7ff;color:#667078;font-size:12px;line-height:1.5}.notice-title{color:#285cfc;font-size:13px;font-weight:700}
.composer{position:absolute;bottom:0;left:0;right:0;min-height:152px;padding:12px 16px calc(14px + env(safe-area-inset-bottom));box-sizing:border-box;background:#fff;border-top:1px solid #e7eaed}
.composer-actions{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}.media-action,.voice-action,.call-action{display:flex;align-items:center;gap:6px;min-height:32px;margin:0;padding:5px 10px;border:1px solid #dce5e8;border-radius:999px;background:#f6f8f9;color:#88969b;font-size:15px;line-height:1}.media-action image{width:17px;height:17px}.media-action text,.voice-action text,.call-action text{font-size:11px}
.composer-row{display:flex;align-items:flex-end;gap:10px}.input{flex:1;min-height:42px;max-height:100px;padding:10px 13px;box-sizing:border-box;border-radius:20px;background:#f1f3f5;color:#89969b;font-size:14px;line-height:22px}.send{width:70px;height:42px;margin:0;padding:0;border:0;border-radius:21px;background:#b5c2c6;color:#fff;font-size:14px;line-height:42px;text-align:center}
@media(max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
