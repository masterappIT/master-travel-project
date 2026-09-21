<template>
  <view class="page" :style="responsiveStyle">
    <view class="header"><view class="back" @tap="goBack"><image src="/static/orders/traveling-back.svg" mode="aspectFit" /></view><text class="header-title">邀請好友</text></view>
    <scroll-view class="content" scroll-y>
      <view class="hero">
        <view class="hero-orb orb-one"/><view class="hero-orb orb-two"/>
        <text class="eyebrow">INVITE & RIDE TOGETHER</text><text class="hero-title">好友同行，雙向有禮</text><text class="hero-copy">每成功邀請 1 位好友完成首趟跨境行程</text>
        <view class="reward-pair"><view><text>你可獲得</text><strong>{{ inviterMileage }} KM</strong><span>會員里程</span></view><view class="gift-mark">＋</view><view><text>好友可獲得</text><strong>{{ fareReward }}</strong><span>車資餘額</span></view></view>
      </view>

      <view class="invite-card">
        <text class="invite-label">我的專屬邀請碼</text>
        <view v-if="loading" class="invite-state">載入中...</view>
        <view v-else-if="loadError" class="invite-state error-state" @tap="loadDashboard">載入失敗，點此重試</view>
        <template v-else>
          <view v-if="dashboard?.enabled" class="code-row"><text class="invite-code">{{ dashboard.code }}</text><view class="copy-button" @tap="copyCode">複製</view></view>
          <view v-else class="activity-paused"><strong>邀請活動暫停</strong><text>目前不接受新的邀請碼綁定，既有邀請紀錄及獎勵不受影響。</text></view>
          <text v-if="dashboard?.enabled" class="invite-note">好友註冊時輸入邀請碼，完成首趟後獎勵自動到帳</text>
          <view v-if="dashboard?.enabled" class="share-button" @tap="shareInvite"><text class="share-icon">↗</text><text>立即邀請好友</text></view>
          <view v-if="dashboard?.enabled" class="share-methods"><view v-for="method in methods" :key="method.name" @tap="shareBy(method.name)"><view :class="['method-icon',method.tone]">{{method.icon}}</view><text>{{method.name}}</text></view></view>
        </template>
      </view>

      <view class="section progress-section">
        <view class="section-head"><view><text class="section-title">本月邀請進度</text><text class="section-subtitle">好友完成首單後，獎勵自動入帳</text></view><view class="month-pill">{{ summary.month }} 月</view></view>
        <view class="progress-summary"><view><strong>{{ summary.invited }}</strong><text>已邀請好友</text></view><view><strong>{{ summary.mileageEarned }}</strong><text>已獲得里程</text></view><view><strong>{{ summary.pending }}</strong><text>待完成首單</text></view></view>
        <view class="milestone-track"><view class="track-line"><view class="track-value" :style="{width: progressWidth}"/></view><view v-for="(step,index) in milestones" :key="step.count" :class="['milestone',{done:summary.rewarded>=step.count,current:summary.rewarded+1===step.count}]" :style="{left:`${index*33.33}%`}"><view class="milestone-dot">{{summary.rewarded>=step.count?'✓':step.count}}</view><text>{{step.reward}}</text></view></view>
        <view class="bonus"><view class="bonus-icon">禮</view><view><text>持續邀請好友</text><text>每位完成首單可獲 {{ dashboard?.rewards.inviterMileage || 300 }} KM</text></view><view class="bonus-status">{{ summary.pending }} 位待首單</view></view>
      </view>

      <view class="section steps-section"><text class="section-title">如何獲得獎勵</text><view class="steps"><view v-for="(step,index) in steps" :key="step.title" class="step"><view class="step-number">{{index+1}}</view><view class="step-copy"><text>{{step.title}}</text><text>{{step.desc}}</text></view><view v-if="index<steps.length-1" class="step-line"/></view></view></view>

      <view class="section records-section"><view class="section-head"><text class="section-title">邀請紀錄</text><text v-if="dashboard && dashboard.records.length > 3" class="more" @tap="showAllRecords">{{ showAll ? '收起' : '查看全部 ›' }}</text></view><view v-if="!visibleRecords.length" class="empty-records">尚未有邀請紀錄</view><view v-for="record in visibleRecords" :key="record.id" class="record-row"><view class="avatar">{{record.name.slice(0,1)}}</view><view class="record-copy"><text>{{record.name}}</text><text>{{formatRecordDate(record)}}</text></view><view :class="['record-status',record.status==='REWARDED'?'completed':'pending']"><text>{{record.status==='REWARDED'?'已完成':record.status==='EXPIRED'?'已失效':'待首單'}}</text><span>{{record.status==='REWARDED'?`+${record.reward} KM`:record.status==='EXPIRED'?'未達條件':'等待中'}}</span></view></view></view>

      <view class="section rules-section">
        <text class="section-title">活動規則</text>
        <view class="rule-row"><text>1</text><text>好友須為首次註冊用戶，並使用你的專屬邀請碼完成註冊。</text></view>
        <view class="rule-row"><text>2</text><text>好友須於註冊後 {{ qualificationDays }} 天內完成首趟有效跨境行程。</text></view>
        <view class="rule-row"><text>3</text><text>完成條件後，你可獲 {{ inviterMileage }} KM，好友可獲 {{ fareReward }} 車資餘額，可用於下次行程。</text></view>
        <view class="rule-row"><text>4</text><text>每位好友只可綁定一次邀請關係，獎勵通常於行程完成後 24 小時內發放。</text></view>
      </view>

      <view class="notice"><text>溫馨提示</text><text>好友需為首次註冊用戶，並於註冊後 {{ qualificationDays }} 天內完成首趟有效行程。獎勵通常於行程完成後 24 小時內發放，獎勵里程有效期為 {{ mileageValidityMonths }} 個月。</text></view><view class="bottom-space"/>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { closeCachedPage } from '../../utils/navigation'
import { formatCurrencyAmount } from '../../composables/useCurrency'
import { getInvitationDashboard, type InvitationDashboard } from '../../services/api'

const { responsiveStyle } = useResponsiveCanvas()
const dashboard = ref<InvitationDashboard | null>(null)
const loading = ref(true)
const loadError = ref(false)
const showAll = ref(false)
const methods=[{icon:'鏈',name:'複製連結',tone:'blue'},{icon:'訊',name:'WhatsApp',tone:'green'},{icon:'碼',name:'邀請碼',tone:'purple'}]
const inviterMileage = computed(() => dashboard.value?.rewards.inviterMileage ?? 300)
const qualificationDays = computed(() => dashboard.value?.qualificationDays ?? 30)
const mileageValidityMonths = computed(() => dashboard.value?.mileageValidityMonths ?? 12)
const fareReward = computed(() => formatCurrencyAmount(dashboard.value?.rewards.inviteeFare ?? 50, dashboard.value?.rewards.currency ?? 'HKD'))
const milestones = computed(() => [1,2,3,4].map(count => ({ count, reward: `${(inviterMileage.value * count).toLocaleString()} KM` })))
const steps=[{title:'分享邀請',desc:'將專屬邀請碼或連結傳給好友'},{title:'好友註冊',desc:'好友使用你的邀請碼完成新用戶註冊'},{title:'完成首單',desc:'好友完成首趟跨境行程後雙方獲獎'}]
const summary = computed(() => dashboard.value?.summary || { month: new Date().getMonth() + 1, invited: 0, rewarded: 0, pending: 0, mileageEarned: 0 })
const visibleRecords = computed(() => showAll.value ? dashboard.value?.records || [] : dashboard.value?.records.slice(0, 3) || [])
const progressWidth = computed(() => `${Math.min(100, summary.value.rewarded / 4 * 100)}%`)
const loadDashboard = async () => {
  loading.value = true
  loadError.value = false
  try { dashboard.value = await getInvitationDashboard() } catch { loadError.value = true } finally { loading.value = false }
}
onShow(loadDashboard)
const formatRecordDate = (record: InvitationDashboard['records'][number]) => {
  const date = new Date(record.rewardedAt || record.registeredAt)
  return `${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')} ${record.status === 'REWARDED' ? '已完成首單' : '已註冊'}`
}
const copy = (data: string, title: string) => data && uni.setClipboardData({data,success:()=>uni.showToast({title,icon:'none'})})
const goBack=()=>closeCachedPage('/pages/trips/trips')
const copyCode=()=>dashboard.value?.enabled && copy(dashboard.value.code,'邀請碼已複製')
const shareInvite=()=>shareBy('複製連結')
const shareBy=(name:string)=>{
  if (!dashboard.value?.enabled) return
  const link=dashboard.value.shareUrl || ''
  if(name==='邀請碼') return copyCode()
  if(name==='WhatsApp') {
    // #ifdef H5
    if(link) window.open(`https://wa.me/?text=${encodeURIComponent(`使用我的邀請碼 ${dashboard.value?.code} 註冊：${link}`)}`,'_blank')
    // #endif
    // #ifndef H5
    copy(link,'邀請連結已複製')
    // #endif
    return
  }
  copy(link,'邀請連結已複製')
}
const showAllRecords=()=>{showAll.value=!showAll.value}
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform:scale(var(--mobile-scale, 1));transform-origin:top left;border-radius:35px}.header{position:absolute;z-index:5;top:0;left:0;width:430px;height:110px;overflow:hidden;border-radius:25px;background:#fff;color:#38434a}.back{position:absolute;top:53px;left:25px;width:28px;height:40px;display:flex;align-items:center;justify-content:center}.back image{width:16px;height:29px}.header-title{position:absolute;top:58px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500;line-height:27px;white-space:nowrap}.rules{position:absolute;top:61px;right:20px;font-size:14px;line-height:27px}.content{position:absolute;top:110px;left:0;width:430px;height:822px}.hero{position:relative;height:260px;padding:30px 25px;box-sizing:border-box;overflow:hidden;background:linear-gradient(145deg,#56657e,#3e4d65);color:#fff;text-align:center}.hero-orb{position:absolute;border-radius:50%}.orb-one{width:180px;height:180px;right:-75px;top:-90px;background:rgba(40,92,252,.42)}.orb-two{width:130px;height:130px;left:-70px;bottom:-60px;background:rgba(30,255,170,.14)}.eyebrow,.hero-title,.hero-copy,.reward-pair{position:relative}.eyebrow{display:block;font-size:14px;letter-spacing:1.7px;color:#1effaa}.hero-title{display:block;margin-top:9px;font-size:24px;line-height:1.35;font-weight:700}.hero-copy{display:block;margin-top:9px;font-size:14px;line-height:1.5;color:#d5dce7}.reward-pair{height:96px;margin-top:22px;display:flex;align-items:center;justify-content:center;gap:18px}.reward-pair>view:not(.gift-mark){width:125px;height:86px;padding-top:11px;box-sizing:border-box;border:1px solid rgba(255,255,255,.15);border-radius:16px;background:rgba(255,255,255,.08);display:flex;flex-direction:column}.reward-pair text{font-size:14px;color:#d7dde6}.reward-pair strong{margin-top:3px;font:700 21px Georgia,serif;color:#1effaa}.reward-pair span{margin-top:2px;font-size:14px;color:#fff}.gift-mark{font-size:22px;color:#1effaa}.invite-card{position:relative;margin:-1px 15px 0;padding:25px 20px 21px;box-sizing:border-box;border-radius:0 0 22px 22px;background:#fff;text-align:center}.invite-state{height:160px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#7e8994}.error-state{color:#d45555}.empty-records{padding:28px 0;text-align:center;font-size:14px;color:#8b949d}.invite-label{font-size:14px;color:#8c949f}.activity-paused{width:300px;margin:14px auto 0;padding:16px;box-sizing:border-box;border:1px solid #e2e6eb;border-radius:13px;display:flex;flex-direction:column;gap:6px;background:#f6f7f9;color:#6d7781}.activity-paused strong{font-size:14px}.activity-paused text{font-size:14px;line-height:1.5}.code-row{width:260px;height:49px;margin:10px auto 0;padding:0 6px 0 18px;box-sizing:border-box;border:1px dashed #91a2be;border-radius:13px;display:flex;align-items:center;justify-content:space-between;background:#f7f9fc}.invite-code{font:700 20px monospace;letter-spacing:3px;color:#285cfc}.copy-button{width:57px;height:35px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#e7edff;color:#285cfc;font-size:14px}.invite-note{display:block;margin-top:11px;font-size:14px;line-height:1.5;color:#969da7}.share-button{height:52px;margin-top:19px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:8px;background:#285cfc;color:#fff;font-size:14px;font-weight:600;box-shadow:0 7px 16px rgba(40,92,252,.23)}.share-icon{font-size:20px}.share-methods{display:flex;justify-content:center;gap:46px;margin-top:21px}.share-methods>view{display:flex;flex-direction:column;align-items:center;gap:5px;font-size:14px}.method-icon{width:35px;height:35px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700}.method-icon.blue{background:#e7edff;color:#285cfc}.method-icon.green{background:#e0faef;color:#10a36b}.method-icon.purple{background:#eee8fc;color:#7958b8}.section{margin:18px 15px 0;padding:21px;border-radius:20px;background:#fff}.section-head{display:flex;align-items:center;justify-content:space-between}.section-title{display:block;font-size:16px;font-weight:700}.section-subtitle{display:block;margin-top:3px;font-size:14px;color:#969ca5}.month-pill{padding:5px 10px;border-radius:12px;background:#edf1f7;color:#56657e;font-size:14px}.progress-summary{height:74px;margin-top:20px;display:flex;justify-content:space-around;align-items:center;border-radius:14px;background:#f6f8fa}.progress-summary>view{display:flex;flex-direction:column;gap:3px;text-align:center}.progress-summary strong{font-size:17px;color:#285cfc}.progress-summary text{font-size:14px;color:#9097a1}.milestone-track{position:relative;height:80px;margin:26px 17px 0}.track-line{position:absolute;left:10px;right:10px;top:11px;height:4px;border-radius:3px;background:#e4e8ee}.track-value{width:66%;height:100%;border-radius:3px;background:linear-gradient(90deg,#285cfc,#1effaa)}.milestone{position:absolute;top:0;width:58px;margin-left:-18px;text-align:center}.milestone-dot{width:25px;height:25px;margin:auto;border:3px solid #e4e8ee;border-radius:50%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:#fff;color:#939aa4;font-size:14px}.milestone.done .milestone-dot{border-color:#285cfc;background:#285cfc;color:#fff}.milestone.current .milestone-dot{border-color:#1effaa;color:#13a36f;box-shadow:0 0 0 4px rgba(30,255,170,.15)}.milestone text{display:block;margin-top:6px;font-size:14px;color:#858d98}.bonus{height:64px;padding:0 12px;display:flex;align-items:center;border-radius:13px;background:linear-gradient(100deg,#f0f4ff,#e7fff5)}.bonus-icon{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#285cfc;color:#fff;font-size:14px}.bonus>view:nth-child(2){margin-left:10px;display:flex;flex-direction:column;gap:3px}.bonus>view:nth-child(2) text:first-child{font-size:14px;font-weight:600}.bonus>view:nth-child(2) text:last-child{font-size:14px;color:#818a95}.bonus-status{margin-left:auto;padding:4px 8px;border-radius:10px;background:#fff;color:#285cfc;font-size:14px}.steps{margin-top:22px}.step{position:relative;height:64px;display:flex;align-items:flex-start}.step-number{z-index:1;width:27px;height:27px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#56657e;color:#fff;font-size:14px}.step-line{position:absolute;left:13px;top:27px;width:1px;height:28px;background:#cdd5e0}.step-copy{margin-left:12px;display:flex;flex-direction:column;gap:4px}.step-copy text:first-child{font-size:14px;font-weight:600}.step-copy text:last-child{font-size:14px;color:#9199a3}.more{font-size:14px;color:#285cfc}.record-row{height:70px;display:flex;align-items:center;border-bottom:1px solid #edf0f3}.avatar{width:35px;height:35px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#e7edff;color:#285cfc;font-size:14px;font-weight:700}.record-copy{margin-left:10px;display:flex;flex-direction:column;gap:4px}.record-copy text:first-child{font-size:14px;font-weight:600}.record-copy text:last-child{font-size:14px;color:#969ca5}.record-status{margin-left:auto;display:flex;flex-direction:column;gap:3px;text-align:right}.record-status text{font-size:14px}.record-status span{font-size:14px}.record-status.completed{color:#10a36b}.record-status.pending{color:#e49a36}.rules-section{display:flex;flex-direction:column;gap:17px}.rules-section .section-title{margin-bottom:3px}.rule-row{display:flex;align-items:flex-start;gap:11px}.rule-row>text:first-child{flex:0 0 22px;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#e7edff;color:#285cfc;font-size:14px;font-weight:700}.rule-row>text:last-child{padding-top:2px;font-size:14px;line-height:1.75;color:#69737e}.notice{margin:18px 20px 0;padding:17px;border-radius:13px;background:#e9edf3;display:flex;flex-direction:column;gap:5px}.notice text:first-child{font-size:14px;font-weight:600}.notice text:last-child{font-size:14px;line-height:1.6;color:#8d959f}.bottom-space{height:32px}

@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.content{bottom:0;height:auto}}
</style>
