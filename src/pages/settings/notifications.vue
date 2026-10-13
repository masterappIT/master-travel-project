<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <PageNavBar :title="tx('消息通知')" @back="goBack" />
    </view>
    <view class="rows">
      <view v-if="!preferences" class="row" @tap="loadError && loadPreferences()"><text>{{ tx(loadError ? '載入失敗，點擊重試' : '載入中') }}</text></view>
      <template v-else>
        <view class="row">
          <text>{{ tx('接收消息通知') }}</text>
          <SettingSwitch :model-value="preferences.notificationsOn" label="接收消息通知" :disabled="saving" @update:model-value="setPreference('notificationsOn', $event)" />
        </view>
        <!-- With the master switch off the per-type switches have no effect, so they are hidden. -->
        <view v-if="preferences.notificationsOn" class="type-rows">
          <view v-for="row in typeRows" :key="row.key" class="row">
            <text>{{ tx(row.label) }}</text>
            <SettingSwitch :model-value="preferences[row.key]" :label="row.label" :disabled="saving" @update:model-value="setPreference(row.key, $event)" />
          </view>
        </view>
        <text class="hint">{{ tx('重要消息不受以上設定影響，仍會送達。') }}</text>
      </template>
    </view>
  </view>
</template>
<script setup lang="ts">
import PageNavBar from '../../components/common/PageNavBar.vue'
import { tx } from '../../i18n'
import { onMounted, ref } from 'vue'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { getNotificationPreferences, updateNotificationPreferences, type NotificationPreferences } from '../../services/api'
import { closeCachedPage } from '../../utils/navigation'
import SettingSwitch from '../../components/settings/SettingSwitch.vue'

const { responsiveStyle } = useResponsiveCanvas()
const preferences = ref<NotificationPreferences | null>(null)
const loadError = ref(false)
const saving = ref(false)
const typeRows: Array<{ key: keyof NotificationPreferences; label: string }> = [
  { key: 'orderOn', label: '訂單消息' },
  { key: 'paymentOn', label: '帳務消息' },
  { key: 'promotionOn', label: '優惠活動' },
  { key: 'systemOn', label: '系統消息' },
]
const loadPreferences = async () => {
  loadError.value = false
  try {
    preferences.value = await getNotificationPreferences()
  } catch {
    loadError.value = true
  }
}
const setPreference = async (key: keyof NotificationPreferences, value: boolean) => {
  if (!preferences.value || saving.value) return
  const previous = preferences.value
  preferences.value = { ...previous, [key]: value }
  saving.value = true
  try {
    preferences.value = await updateNotificationPreferences({ [key]: value })
  } catch {
    preferences.value = previous
    uni.showToast({ title: '保存失敗，請稍後再試', icon: 'none' })
  } finally {
    saving.value = false
  }
}
onMounted(() => { void loadPreferences() })
const goBack = () => closeCachedPage('/pages/settings/settings')
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}
.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}
.header{position:absolute;top:0;left:0;width:430px;height:110px;overflow:hidden;border-radius:25px;background:#fff}
.rows{position:absolute;top:120px;left:0;width:430px;display:flex;flex-direction:column}
.type-rows{margin-top:10px;display:flex;flex-direction:column;gap:1px}
.row{width:430px;height:50px;padding:0 24px 0 30px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;background:#fff;font-size:16px;font-weight:350}
.hint{margin:12px 30px 0;color:#666;font-size:12px;line-height:18px}
@media (max-width:599px){.page{top:0;left:var(--mobile-offset,0px);height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}}
</style>
