import { computed } from 'vue'

export function createPromotionDisplay({ promotionForm, promotionsPageState, severeWeatherEnabled, extras }) {
  const promotionDiscountHint = computed(() => {
    if (!promotionForm.value) return ''
    if (promotionForm.value.discountType === 'PERCENTAGE') return '輸入折扣百分比，例如 10 代表減免 10%。'
    if (promotionForm.value.discountType === 'TOTAL_PRICE') return '輸入折扣後應付總價，例如 500 代表原價會折到 500。'
    return '輸入固定折抵金額，例如 50 代表直接減免 50。'
  })
  const promotionStackingHint = computed(() => {
    if (!promotionForm.value) return ''
    if (promotionForm.value.stackingMode === 'PERCENTAGE_AND_VOUCHER') return '可同時套用一個百分比優惠與一張現金券。'
    if (promotionForm.value.stackingMode === 'ALL') return '符合條件的優惠都可以一起套用，系統會依序計算。'
    return '只套用這一項優惠，不會與其他優惠疊加。'
  })
  const filteredPromotions = promotionsPageState.filtered
  const toggleWeekday = day => {
    if (!promotionForm.value) return
    if (!Array.isArray(promotionForm.value.weekdays)) promotionForm.value.weekdays = []
    const index = promotionForm.value.weekdays.indexOf(day)
    if (index >= 0) promotionForm.value.weekdays.splice(index, 1)
    else { promotionForm.value.weekdays.push(day); promotionForm.value.weekdays.sort((a, b) => a - b) }
  }
  const isWeekdaySelected = day => Array.isArray(promotionForm.value?.weekdays) && promotionForm.value.weekdays.includes(day)
  const setWeekdaysPreset = preset => {
    if (!promotionForm.value) return
    if (preset === 'ALL') promotionForm.value.weekdays = [1, 2, 3, 4, 5, 6, 7]
    else if (preset === 'WORKDAYS') promotionForm.value.weekdays = [1, 2, 3, 4, 5]
    else if (preset === 'WEEKENDS') promotionForm.value.weekdays = [6, 7]
    else if (preset === 'CLEAR') promotionForm.value.weekdays = []
  }
  const formatWeekdaysText = weekdays => {
    if (!Array.isArray(weekdays) || weekdays.length === 0) return '每天適用'
    const daysMap = { 1: '週一', 2: '週二', 3: '週三', 4: '週四', 5: '週五', 6: '週六', 7: '週日' }
    const sorted = [...weekdays].sort((a, b) => a - b)
    if (sorted.length === 7) return '每天 (週一至週日)'
    if (sorted.length === 5 && sorted.every((value, index) => value === index + 1)) return '工作日 (週一至週五)'
    if (sorted.length === 2 && sorted[0] === 6 && sorted[1] === 7) return '週末 (週六至週日)'
    return sorted.map(day => daysMap[day]).join('、')
  }
  const formatRouteText = item => {
    const origin = [item.originRegion, item.originCity].filter(Boolean).join(' ') || '不限地點'
    const destination = [item.destinationRegion, item.destinationCity].filter(Boolean).join(' ') || '不限地點'
    if (origin === '不限地點' && destination === '不限地點') return '不限路線'
    return `${origin} → ${destination}`
  }
  const formatTimeRangeText = item => !item.timeStart && !item.timeEnd ? '' : `${item.timeStart || '00:00'} ~ ${item.timeEnd || '24:00'}`
  const triggerLabel = item => ({ NONE: '一般', IMMEDIATE: '即時訂單', NIGHT: '深夜加班費', WEATHER: '惡劣天氣' }[item.triggerType || (item.requiredForImmediate ? 'IMMEDIATE' : 'NONE')] || '一般')
  const triggerSummary = item => item.triggerType === 'IMMEDIATE' ? `出發前 ${item.requiredWithinMinutes || 60} 分鐘` : item.triggerType === 'NIGHT' ? `${item.nightStartTime || '22:00'}–${item.nightEndTime || '06:00'}` : item.triggerType === 'WEATHER' ? (severeWeatherEnabled.value ? '目前啟用' : '目前停用') : '手動選擇'
  const isTriggerActive = type => extras.value.some(item => (item.triggerType || (item.requiredForImmediate ? 'IMMEDIATE' : 'NONE')) === type && item.triggerEnabled !== false) && (type !== 'WEATHER' || severeWeatherEnabled.value)
  return { promotionDiscountHint, promotionStackingHint, filteredPromotions, toggleWeekday, isWeekdaySelected, setWeekdaysPreset, formatWeekdaysText, formatRouteText, formatTimeRangeText, triggerLabel, triggerSummary, isTriggerActive }
}
