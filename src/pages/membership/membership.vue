<template>
  <view class="page" :style="responsiveStyle">
    <view class="header"><view class="back" @tap="goBack"><image src="/static/orders/traveling-back.svg" mode="aspectFit" /></view><text class="title">會員中心</text></view>
    <scroll-view class="content" scroll-y>
      <view v-if="loading" class="state-card">會員資料載入中</view>
      <view v-else-if="errorMessage" class="state-card"><text>{{ errorMessage }}</text><button @tap="loadMembership">重新載入</button></view>
      <template v-else-if="summary">
        <view class="member-card">
          <view class="card-glow" />
          <view class="member-top"><view class="avatar">{{ memberInitial }}</view><view class="member-info"><text class="member-name">Hi, {{ summary.user.name }}</text><text class="member-level">{{ activePlan?.name || '一般會員' }}</text></view><view class="member-badge">{{ activePlan?.level || 'MEMBER' }}</view></view>
          <view class="growth-copy"><text>{{ subscriptionStatus }}</text><text v-if="summary.subscription"><strong>{{ formatDate(summary.subscription.currentPeriodEndsAt) }}</strong></text></view>
          <view class="growth-track"><view class="growth-value" :style="{ width: summary.subscription ? '100%' : '0%' }" /></view>
          <view class="growth-foot"><text>{{ summary.subscription ? (summary.subscription.cancelAtPeriodEnd ? '到期後不再續期' : '會籍權益使用中') : '選擇方案開通會員權益' }}</text><text>{{ activePlan?.currency || 'HKD' }}</text></view>
        </view>
        <view class="quick-stats"><view><strong>{{ activePlan?.voucherCount || 0 }}</strong><text>每期乘車券</text></view><view><strong>{{ activePlan?.benefits.length || 0 }}</strong><text>目前權益</text></view><view><strong>{{ (activePlan?.mileageRate || 1).toFixed(1) }}×</strong><text>里程倍率</text></view></view>
        <view v-if="summary.pendingOrder" class="pending-card"><view><text class="section-title">待確認會員訂單</text><text class="section-subtitle">{{ summary.pendingOrder.plan.name }} · {{ periodLabel(summary.pendingOrder.billingPeriod) }} · {{ summary.pendingOrder.currency }} {{ summary.pendingOrder.amount }}</text></view><button :disabled="submitting" @tap="cancelPendingOrder">取消訂單</button></view>
        <view class="upgrade-history" @tap="historyOpen=!historyOpen"><text>會員紀錄</text><text class="history-arrow">{{ historyOpen ? '⌃' : '›' }}</text></view>
        <view v-if="historyOpen" class="history-list"><view v-for="event in summary.events" :key="event.id" class="history-item"><text>{{ event.title }}</text><text>{{ formatDate(event.createdAt) }}</text></view><text v-if="!summary.events.length" class="empty-copy">暫無會員紀錄</text></view>
        <view class="section-head"><view><text class="section-title">{{ summary.subscription ? '變更會員方案' : '開通會員' }}</text><text class="section-subtitle">方案申請將由後台確認後生效</text></view><view class="period-switch"><view :class="['period',{active:period==='month'}]" @tap="period='month'">月付</view><view :class="['period',{active:period==='year'}]" @tap="period='year'">年付</view></view></view>
        <view class="plan-list">
          <view v-for="plan in summary.plans" :key="plan.id" :class="['plan-card',{selected:selectedPlan===plan.id}]" @tap="selectedPlan=plan.id">
            <view :class="['plan-mark',plan.id]">{{ plan.name.slice(0,1) }}</view>
            <view class="plan-copy"><view class="plan-title-row"><text class="plan-name">{{ plan.name }}</text><text v-if="plan.recommended" class="recommend">推薦</text></view><text class="plan-benefit">{{ plan.benefits.join(' · ') }}</text></view>
            <view class="plan-price"><view><text>{{ plan.currency }}</text><strong>{{ period==='month' ? plan.monthly : plan.yearly }}</strong></view><text>/{{ period==='month' ? '月' : '年' }}</text></view><view class="selector"><view /></view>
          </view>
        </view>
        <view v-if="activePlan" class="benefits-card"><view class="card-title-row"><text class="section-title">目前會員權益</text><text class="more">{{ activePlan.name }}</text></view><view class="benefit-lines"><text v-for="benefit in activePlan.benefits" :key="benefit">• {{ benefit }}</text></view></view>
        <view v-if="summary.subscription && !summary.subscription.cancelAtPeriodEnd" class="renewal-row"><view><text class="section-title">會籍續期</text><text class="section-subtitle">取消後仍可使用至本期結束</text></view><button :disabled="submitting" @tap="cancelRenewal">取消續期</button></view>
        <view class="agreement">提交即表示同意《會員服務協議》；方案經後台確認後生效</view><view class="bottom-space" />
      </template>
    </scroll-view>
    <view v-if="summary && !summary.pendingOrder" class="checkout"><view class="checkout-price"><text>方案金額</text><view><small>{{ selectedPlanData?.currency || 'HKD' }}</small><strong>{{ currentPrice }}</strong><small>/{{ period==='month'?'月':'年' }}</small></view></view><view :class="['upgrade-button',{disabled:submitting||!selectedPlanData}]" @tap="submitOrder"><text>{{ submitting ? '提交中' : (summary.subscription ? '申請變更' : '立即開通') }}</text><text>›</text></view></view>
  </view>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { closeCachedPage } from '../../utils/navigation'
import { cancelMembershipOrder, cancelMembershipRenewal, createMembershipOrder, getMembershipSummary, type MembershipSummary } from '../../services/api'

const { responsiveStyle } = useResponsiveCanvas()
const period = ref<'month' | 'year'>('year')
const selectedPlan = ref('')
const summary = ref<MembershipSummary | null>(null)
const loading = ref(true)
const submitting = ref(false)
const historyOpen = ref(false)
const errorMessage = ref('')

const activePlan = computed(() => summary.value?.subscription?.plan || null)
const selectedPlanData = computed(() => summary.value?.plans.find((plan) => plan.id === selectedPlan.value) || summary.value?.plans[0] || null)
const currentPrice = computed(() => selectedPlanData.value ? (period.value === 'month' ? selectedPlanData.value.monthly : selectedPlanData.value.yearly) : 0)
const memberInitial = computed(() => summary.value?.user.name.trim().slice(0, 1).toUpperCase() || 'M')
const subscriptionStatus = computed(() => summary.value?.subscription ? `有效期至 ${formatDate(summary.value.subscription.currentPeriodEndsAt)}` : '尚未開通付費會籍')

function formatDate(value: string) { return new Date(value).toLocaleDateString('zh-HK', { year: 'numeric', month: '2-digit', day: '2-digit' }) }
function periodLabel(value: 'MONTHLY' | 'YEARLY') { return value === 'MONTHLY' ? '月付' : '年付' }
function goBack() { closeCachedPage('/pages/trips/trips') }
function confirm(title: string, content: string) { return new Promise<boolean>((resolve) => uni.showModal({ title, content, success: (result) => resolve(result.confirm), fail: () => resolve(false) })) }
async function loadMembership() {
  loading.value = true
  errorMessage.value = ''
  try {
    summary.value = await getMembershipSummary()
    if (!selectedPlan.value || !summary.value.plans.some((plan) => plan.id === selectedPlan.value)) selectedPlan.value = summary.value.subscription?.plan.id || summary.value.plans.find((plan) => plan.recommended)?.id || summary.value.plans[0]?.id || ''
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : '無法載入會員資料' }
  finally { loading.value = false }
}
async function submitOrder() {
  if (submitting.value || !selectedPlanData.value || !summary.value) return
  const billingPeriod = period.value === 'month' ? 'MONTHLY' : 'YEARLY'
  const accepted = await confirm('確認會員方案', `${selectedPlanData.value.name} ${periodLabel(billingPeriod)}，金額 ${selectedPlanData.value.currency} ${currentPrice.value}。提交後由後台確認生效。`)
  if (!accepted) return
  submitting.value = true
  try {
    const key = `membership-${summary.value.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const result = await createMembershipOrder(selectedPlanData.value.id, billingPeriod, key)
    uni.showToast({ title: result.message, icon: 'none' })
    await loadMembership()
  } catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '提交失敗', icon: 'none' }) }
  finally { submitting.value = false }
}
async function cancelPendingOrder() {
  if (!summary.value?.pendingOrder || submitting.value || !await confirm('取消會員訂單', '確定取消這筆待確認訂單？')) return
  submitting.value = true
  try { await cancelMembershipOrder(summary.value.pendingOrder.id); await loadMembership(); uni.showToast({ title: '訂單已取消', icon: 'none' }) }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '取消失敗', icon: 'none' }) }
  finally { submitting.value = false }
}
async function cancelRenewal() {
  if (submitting.value || !await confirm('取消續期', '本期權益將保留至到期日，確定取消續期？')) return
  submitting.value = true
  try { await cancelMembershipRenewal(); await loadMembership(); uni.showToast({ title: '已取消續期', icon: 'none' }) }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '操作失敗', icon: 'none' }) }
  finally { submitting.value = false }
}
onMounted(loadMembership)
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left;border-radius:35px}.header{position:absolute;top:0;left:0;z-index:5;width:430px;height:110px;overflow:hidden;border-radius:25px;background:#fff;color:#38434A}.back{position:absolute;top:53px;left:25px;width:28px;height:40px;display:flex;align-items:center;justify-content:center}.back image{width:16px;height:29px}.title{position:absolute;top:58px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500;line-height:27px;white-space:nowrap}.upgrade-history{height:48px;margin:10px 15px 0;padding:0 18px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;border-radius:16px;background:#fff;color:#38434A;font-size:13px;box-shadow:0 3px 12px rgba(65,79,103,.07)}.history-arrow{color:#8995A8;font-size:20px;line-height:1}.content{position:absolute;top:110px;left:0;width:430px;height:736px}.member-card{position:relative;height:205px;margin:16px 15px 0;padding:22px;box-sizing:border-box;overflow:hidden;border-radius:25px;background:linear-gradient(135deg,#56657E,#3F4C65);color:#fff;box-shadow:0 10px 24px rgba(62,76,101,.22)}.card-glow{position:absolute;width:230px;height:230px;right:-90px;top:-115px;border-radius:50%;background:radial-gradient(circle,rgba(30,255,170,.28),rgba(30,255,170,0) 68%)}.member-top{position:relative;display:flex;align-items:center}.avatar{width:49px;height:49px;border:2px solid rgba(255,255,255,.65);border-radius:50%;display:flex;align-items:center;justify-content:center;background:#285CFC;color:#fff;font-size:20px;font-weight:700}.member-info{margin-left:13px;display:flex;flex-direction:column;gap:3px}.member-name{font-size:17px;font-weight:700}.member-level{font-size:11px;color:#DDE3ED}.member-badge{margin-left:auto;padding:6px 10px;border:1px solid rgba(30,255,170,.55);border-radius:15px;color:#1EFFAA;font-size:8px;font-weight:700;letter-spacing:1px}.growth-copy{position:relative;margin-top:25px;display:flex;justify-content:space-between;align-items:baseline;font-size:11px;color:#E4E8EE}.growth-copy strong{font-size:17px;color:#1EFFAA}.growth-track{position:relative;height:6px;margin-top:9px;border-radius:6px;background:rgba(255,255,255,.18);overflow:hidden}.growth-value{width:32%;height:100%;border-radius:6px;background:linear-gradient(90deg,#1EFFAA,#67FFD0)}.growth-foot{position:relative;margin-top:10px;display:flex;justify-content:space-between;font-size:9px;color:#CAD1DD}.quick-stats{height:77px;margin:12px 15px 0;display:flex;align-items:center;border-radius:20px;background:#fff;box-shadow:0 3px 12px rgba(65,79,103,.07)}.quick-stats view{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;gap:5px}.quick-stats view+view:before{content:'';position:absolute;left:0;top:4px;width:1px;height:30px;background:#E7EBF1}.quick-stats strong{font-size:14px;color:#285CFC}.quick-stats text{font-size:9px;color:#8993A2}.section-head{padding:25px 20px 14px;display:flex;justify-content:space-between;align-items:flex-end}.section-title{display:block;font-size:17px;font-weight:700;color:#303A49}.section-subtitle{display:block;margin-top:4px;font-size:10px;color:#8B95A4}.period-switch{width:108px;height:34px;padding:3px;box-sizing:border-box;display:flex;border-radius:18px;background:#E1E5EB}.period{flex:1;display:flex;align-items:center;justify-content:center;border-radius:15px;font-size:11px;color:#7C8797}.period.active{background:#56657E;color:#fff;box-shadow:0 3px 8px rgba(86,101,126,.25)}.plan-list{padding:0 15px;display:flex;flex-direction:column;gap:10px}.plan-card{position:relative;height:81px;padding:13px 14px;box-sizing:border-box;display:flex;align-items:center;border:1px solid #E1E6ED;border-radius:18px;background:#fff}.plan-card.selected{border:2px solid #285CFC;background:#F8FAFF;box-shadow:0 6px 16px rgba(40,92,252,.12)}.plan-mark{width:43px;height:43px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800}.plan-mark.silver{background:#EDF0F4;color:#718096}.plan-mark.black{background:#56657E;color:#1EFFAA}.plan-mark.diamond{background:#EAF0FF;color:#285CFC}.plan-copy{min-width:0;margin-left:12px;display:flex;flex:1;flex-direction:column;gap:6px}.plan-title-row{display:flex;align-items:center;gap:7px}.plan-name{font-size:14px;font-weight:700}.recommend{padding:3px 7px;border-radius:8px;background:#DFFFF3;color:#138962;font-size:8px}.plan-benefit{overflow:hidden;color:#8993A1;font-size:9px;white-space:nowrap;text-overflow:ellipsis}.plan-price{width:73px;display:flex;flex-direction:column;align-items:flex-end}.plan-price view{display:flex;align-items:baseline;color:#285CFC}.plan-price view text{font-size:8px}.plan-price strong{margin-left:2px;font-size:21px}.plan-price>text{font-size:8px;color:#969FAC}.selector{width:16px;height:16px;margin-left:9px;border:1px solid #C8D0DB;border-radius:50%;display:flex;align-items:center;justify-content:center}.selected .selector{border-color:#285CFC}.selected .selector view{width:8px;height:8px;border-radius:50%;background:#285CFC}.benefits-card,.compare-card{margin:16px 15px 0;padding:20px;border-radius:22px;background:#fff}.card-title-row{display:flex;align-items:center;justify-content:space-between}.more{font-size:10px;color:#285CFC}.benefit-grid{display:grid;grid-template-columns:1fr 1fr;gap:19px 12px;margin-top:20px}.benefit-item{display:grid;grid-template-columns:40px 1fr;grid-template-rows:20px 18px}.benefit-icon{grid-row:1/3;width:35px;height:35px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}.benefit-icon.blue{background:#E8EEFF;color:#285CFC}.benefit-icon.green{background:#DFFFF3;color:#138F67}.benefit-icon.purple{background:#F0ECFF;color:#7259C8}.benefit-icon.gold{background:#FFF2D9;color:#A77215}.benefit-title{font-size:12px;font-weight:600}.benefit-desc{font-size:9px;color:#929BA8}.compare-tag{padding:4px 8px;border-radius:9px;background:#DFFFF3;color:#148B65;font-size:8px}.compare-row{height:39px;display:grid;grid-template-columns:1.6fr .8fr .8fr;align-items:center;border-bottom:1px solid #EDF0F4;font-size:10px;text-align:center}.compare-row text:first-child{text-align:left}.compare-header{margin-top:14px;color:#969FAB}.brand-value{color:#285CFC;font-weight:700}.agreement{padding:17px 20px 0;text-align:center;font-size:8px;color:#9CA4B0}.bottom-space{height:28px}.checkout{position:absolute;left:0;bottom:0;z-index:6;width:430px;height:86px;padding:11px 18px 19px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;background:#fff;box-shadow:0 -5px 18px rgba(55,68,89,.09)}.checkout-price{display:flex;flex-direction:column}.checkout-price>text{font-size:9px;color:#8D97A6}.checkout-price view{margin-top:2px;display:flex;align-items:baseline;color:#285CFC}.checkout-price small{font-size:9px}.checkout-price strong{margin:0 3px;font-size:25px}.upgrade-button{width:190px;height:50px;padding:0 18px;box-sizing:border-box;border-radius:16px;display:flex;align-items:center;justify-content:space-between;background:#285CFC;color:#fff;font-size:15px;font-weight:700;box-shadow:0 8px 16px rgba(40,92,252,.25)}.upgrade-button text:last-child{font-size:24px;font-weight:300}.upgrade-button.disabled{opacity:.55}.state-card{margin:18px 15px;padding:28px 20px;display:flex;flex-direction:column;align-items:center;gap:16px;border-radius:18px;background:#fff;color:#687385;font-size:13px;text-align:center}.state-card button,.pending-card button,.renewal-row button{height:34px;padding:0 14px;border:0;border-radius:8px;background:#eef2ff;color:#285cfc;font-size:11px}.pending-card,.renewal-row{margin:12px 15px 0;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;border-radius:16px;background:#fff;box-shadow:0 3px 12px rgba(65,79,103,.07)}.pending-card>view,.renewal-row>view{min-width:0;max-width:255px}.history-list{margin:0 15px;padding:8px 18px 12px;border-radius:0 0 16px 16px;background:#fff}.history-item{min-height:38px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #edf0f4;font-size:11px}.history-item text:last-child{color:#929ba8;font-size:9px}.empty-copy{display:block;padding:12px 0;text-align:center;color:#929ba8;font-size:10px}.benefit-lines{margin-top:14px;display:flex;flex-direction:column;gap:10px;color:#687385;font-size:11px}.renewal-row button{color:#c34444;background:#fff0f0}.agreement{line-height:1.5}

.page{--font-caption:12px;--font-body:14px;--font-title:17px;font-size:var(--font-body);line-height:1.45}.upgrade-history{font-size:var(--font-body)}.member-level,.member-badge,.growth-copy,.growth-foot,.quick-stats text,.section-subtitle,.recommend,.plan-benefit,.plan-price view text,.plan-price>text,.more,.benefit-desc,.compare-tag,.compare-row,.agreement,.checkout-price>text,.checkout-price small,.history-item text:last-child,.empty-copy{font-size:var(--font-caption);line-height:1.4}.period,.state-card button,.pending-card button,.renewal-row button,.history-item,.benefit-lines{font-size:var(--font-body);line-height:1.4}.quick-stats strong,.plan-name{font-size:15px}.section-title{font-size:var(--font-title)}

@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.content{bottom:86px;height:auto}}
</style>
