<template>
  <view class="page" :style="responsiveStyle">
    <view class="header"><image class="back" src="/static/messages/back.svg" mode="aspectFit" @tap="goBack" /><text class="header-title">我的投訴</text></view>
    <scroll-view class="content" scroll-y>
      <view class="intro"><view class="intro-icon">訴</view><view><text class="intro-title">遇到問題？我們會跟進</text><text class="intro-copy">提交投訴後，客服團隊會於 1–2 個工作天內回覆。</text></view></view>
      <view class="section"><text class="section-title">提交新投訴</text><text class="section-note">請選擇與行程相關的問題類型</text><view class="category-grid"><view v-for="item in categories" :key="item.title" class="category" @tap="startComplaint(item.title)"><view :class="['category-icon', item.tone]">{{ item.icon }}</view><text>{{ item.title }}</text><text class="category-desc">{{ item.desc }}</text></view></view></view>
      <view v-if="selectedCategory" class="form-card">
        <view class="section-head"><view><text class="section-title">提交投訴</text><text class="section-note">{{ selectedCategory }}</text></view><text class="close" @tap="cancelComplaint">取消</text></view>
        <textarea v-model="complaintText" class="complaint-input" maxlength="500" placeholder="請描述遇到的問題（最少 10 個字）" />
        <view class="form-footer"><text>{{ complaintText.length }}/500</text><view class="submit" @tap="submitComplaint">提交投訴</view></view>
      </view>
      <view class="section records"><view class="section-head"><text class="section-title">投訴紀錄</text><text class="filter">近 90 天⌄</text></view><view v-for="record in records" :key="record.id" class="record-row"><view class="record-icon">{{ record.icon }}</view><view class="record-copy"><text class="record-title">{{ record.title }}</text><text class="record-meta">{{ record.id }} · {{ record.date }}</text></view><view :class="['status', record.statusTone]">{{ record.status }}</view></view></view>
      <view class="notice"><text class="notice-title">溫馨提示</text><text>如涉及即時安全或遺失物品，請直接聯絡客服，我們會優先處理。</text></view><view class="bottom-space" />
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { closeCachedPage } from '../../utils/navigation'
const { responsiveStyle } = useResponsiveCanvas()
const categories = [{ icon: '行', title: '行程問題', desc: '車費、路線或司機', tone: 'blue' }, { icon: '服', title: '服務體驗', desc: '服務品質或態度', tone: 'green' }, { icon: '款', title: '付款問題', desc: '扣款或退款相關', tone: 'gold' }, { icon: '其', title: '其他問題', desc: '其他需要協助事項', tone: 'purple' }]
type ComplaintRecord = { id: string; title: string; date: string; status: string; statusTone: string; icon: string }
const defaultRecords: ComplaintRecord[] = [{ id: 'C-20260901', title: '行程費用疑問', date: '2026/09/01', status: '處理中', statusTone: 'pending', icon: '！' }, { id: 'C-20260812', title: '退款申請跟進', date: '2026/08/12', status: '已完成', statusTone: 'done', icon: '✓' }]
const records = ref<ComplaintRecord[]>([])
const selectedCategory = ref('')
const complaintText = ref('')
onShow(() => { const saved = uni.getStorageSync('complaint-records'); records.value = Array.isArray(saved) ? saved : defaultRecords })
const goBack = () => closeCachedPage('/pages/trips/trips')
const startComplaint = (category: string) => { selectedCategory.value = category; complaintText.value = '' }
const cancelComplaint = () => { selectedCategory.value = ''; complaintText.value = '' }
const submitComplaint = () => {
  const detail = complaintText.value.trim()
  if (detail.length < 10) return uni.showToast({ title: '請至少輸入 10 個字', icon: 'none' })
  const now = new Date()
  const id = `C-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getTime()).slice(-4)}`
  records.value = [{ id, title: selectedCategory.value, date: `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`, status: '已提交', statusTone: 'pending', icon: '！' }, ...records.value]
  uni.setStorageSync('complaint-records', records.value)
  cancelComplaint()
  uni.showToast({ title: '投訴已提交', icon: 'success' })
}
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left;border-radius:35px}.header{position:absolute;z-index:5;top:0;left:0;width:430px;height:110px;padding:60px 20px 0;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;border-radius:25px;background:#56657e;color:#fff}.back{width:38px;height:38px;padding:7px 13px;box-sizing:border-box;flex:none}.header-title{position:absolute;top:66px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:600}.content{position:absolute;top:110px;left:0;width:430px;height:822px}.intro{margin:15px 15px 0;padding:18px 20px;display:flex;align-items:center;gap:14px;border-radius:20px;background:#56657e;color:#fff}.intro-icon{width:40px;height:40px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:#1effaa;color:#38434a;font-size:16px;font-weight:700}.intro-title{display:block;font-size:13px;font-weight:700}.intro-copy{display:block;margin-top:5px;color:#d8e0ea;font-size:9px}.section{margin:14px 15px 0;padding:19px;border-radius:20px;background:#fff}.section-head{display:flex;justify-content:space-between;align-items:center}.section-title{display:block;font-size:16px;font-weight:700}.section-note{display:block;margin-top:3px;font-size:9px;color:#9299a3}.category-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px}.category{padding:13px 11px;border:1px solid #e9edf1;border-radius:15px}.category-icon{width:31px;height:31px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}.category-icon.blue{background:#e9efff;color:#285cfc}.category-icon.green{background:#e2fbf1;color:#12a56e}.category-icon.gold{background:#fbf1df;color:#9d7130}.category-icon.purple{background:#f2eaff;color:#8754d8}.category>text:nth-of-type(1){display:block;margin-top:9px;font-size:11px;font-weight:700}.category-desc{display:block;margin-top:3px;font-size:8px;color:#969da7}.form-card{margin:14px 15px 0;padding:19px;border-radius:20px;background:#fff}.close{font-size:10px;color:#969da7}.complaint-input{width:100%;height:112px;margin-top:14px;padding:12px;box-sizing:border-box;border-radius:13px;background:#f6f8fa;font-size:11px;line-height:1.5}.form-footer{margin-top:10px;display:flex;align-items:center;justify-content:space-between;color:#999fa8;font-size:8px}.submit{width:92px;height:34px;border-radius:17px;display:flex;align-items:center;justify-content:center;background:#285cfc;color:#fff;font-size:11px;font-weight:600}.filter{font-size:9px;color:#285cfc}.records{padding-bottom:6px}.record-row{height:64px;display:flex;align-items:center;border-bottom:1px solid #edf0f3}.record-row:last-child{border-bottom:0}.record-icon{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#fff0ed;color:#eb6a58;font-size:15px;font-weight:700}.record-copy{margin-left:11px;display:flex;flex-direction:column;gap:4px}.record-title{font-size:10px;font-weight:600}.record-meta{font-size:8px;color:#999fa8}.status{margin-left:auto;padding:5px 8px;border-radius:10px;font-size:8px}.status.pending{background:#fff4df;color:#b87817}.status.done{background:#e2faf1;color:#12a56e}.notice{margin:14px 25px 0;display:flex;flex-direction:column;gap:5px;font-size:9px;line-height:1.5;color:#8f969f}.notice-title{font-weight:700;color:#56657e}.bottom-space{height:30px}@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}.content{bottom:0;height:auto}}
</style>
