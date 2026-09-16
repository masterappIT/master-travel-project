<template>
  <view class="page" :style="responsiveStyle">
    <view class="header"><view class="back" @tap="goBack"><image class="back-icon" src="/static/common-data/back.svg" mode="aspectFit" /></view><text class="title">常用資料</text></view>
    <scroll-view class="content" scroll-y>
      <view class="content-head"><text class="content-title">常用乘客</text><text class="add" @tap="addPassenger">＋ 新增</text></view>
      <view v-if="passengers.length === 0" class="empty">尚未建立常用乘客資料</view>
      <view v-for="(passenger,index) in passengers" :key="passenger.id" class="passenger-card" @tap="setDefaultPassenger(index)"><view class="card-head"><text class="name">{{ passenger.name }}<template v-if="passenger.isDefault">（預設）</template></text><text class="edit" @tap.stop="editPassenger(index)">編輯</text></view><text class="detail">{{ passenger.gender }} · {{ phoneRegionCode(passenger.phoneRegion) }} {{ passenger.phone }}</text><text class="detail">{{ passenger.documentType }}<template v-if="passenger.documentType === '護照'"> · {{ passenger.passportCountry }}</template></text><text class="remove" @tap.stop="removePassenger(index)">刪除</text></view>
    </scroll-view>
    <view v-if="editing" class="form-mask" @tap.self="editing=false"><view class="form-sheet"><view class="form-head"><text class="form-title">{{ editingIndex === -1 ? '新增常用乘客' : '編輯常用乘客' }}</text><text class="cancel" @tap="editing=false">取消</text></view><input v-model="form.name" placeholder="姓名" /><view class="phone-row"><picker class="region-picker" mode="selector" :range="phoneRegions" range-key="label" :value="phoneRegionIndex" @change="changePhoneRegion"><view class="region-select">{{ phoneRegionCode(form.phoneRegion) }}</view></picker><input v-model="form.phone" class="phone-input" type="number" placeholder="電話" /></view><picker mode="selector" :range="genders" :value="genders.indexOf(form.gender)" @change="form.gender=genders[Number($event.detail.value)]"><view class="select">性別：{{ form.gender }}</view></picker><picker mode="selector" :range="documentTypes" :value="documentTypes.indexOf(form.documentType)" @change="changeDocument"><view class="select">證件類型：{{ form.documentType }}</view></picker><picker v-if="form.documentType === '護照'" mode="selector" :range="passportCountries" :value="passportCountries.indexOf(form.passportCountry)" @change="form.passportCountry=passportCountries[Number($event.detail.value)]"><view class="select">護照國家：{{ form.passportCountry || '請選擇' }}</view></picker><button @tap="savePassenger">保存</button></view></view>
  </view>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { closeCachedPage } from '../../utils/navigation'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { createCommonPassenger, deleteCommonPassenger, listCommonPassengers, updateCommonPassenger, type CommonPassenger } from '../../services/api'

const { responsiveStyle } = useResponsiveCanvas()

type Passenger = CommonPassenger

const genders = ['先生', '女士']
const phoneRegions = [
  { label: '香港 (+852)', code: '+852' },
  { label: '澳門 (+853)', code: '+853' },
  { label: '中國內地 (+86)', code: '+86' },
]
const documentTypes = ['港澳通行證', '香港身分證', '澳門身分證', '護照']
const passportCountries = ['中國', '香港', '澳門', '台灣', '日本', '韓國', '美國', '英國', '其他']

const phoneRegionCode = (region: string) =>
  phoneRegions.find((item) => item.label === region || item.code === region)?.code || '+852'

const passengers = ref<Passenger[]>([])
const loadPassengers = async () => {
  const storedPassengers = uni.getStorageSync('common-passengers') || []
  try {
    passengers.value = await listCommonPassengers()
    uni.setStorageSync('common-passengers', passengers.value)
  } catch {
    passengers.value = storedPassengers.map((passenger: Partial<Passenger>) => ({
      id: passenger.id || `local-${Date.now()}-${Math.random()}`,
      name: passenger.name || '', phone: passenger.phone || '',
      phoneRegion: passenger.phoneRegion || phoneRegions[0].label,
      gender: passenger.gender || '先生', documentType: passenger.documentType || '港澳通行證',
      passportCountry: passenger.passportCountry || null, isDefault: passenger.isDefault || false, sortOrder: passenger.sortOrder || 0,
    }))
  }
}
const editing = ref(false)
const editingIndex = ref(-1)
const phoneRegionIndex = computed(() =>
  Math.max(0, phoneRegions.findIndex((item) => item.label === form.phoneRegion)),
)
const form = reactive<Passenger>({
  name: '',
  phone: '',
  phoneRegion: phoneRegions[0].label,
  gender: '先生',
  documentType: '港澳通行證',
  passportCountry: '',
})

const resetForm = () => {
  Object.assign(form, {
    name: '',
    phone: '',
    phoneRegion: phoneRegions[0].label,
    gender: '先生',
    documentType: '港澳通行證',
    passportCountry: '',
  })
}

const addPassenger = () => {
  editingIndex.value = -1
  resetForm()
  editing.value = true
}

const editPassenger = (index: number) => {
  editingIndex.value = index
  Object.assign(form, passengers.value[index])
  const region = phoneRegions.find((item) => item.label === form.phoneRegion || item.code === form.phoneRegion)
  form.phoneRegion = region?.label || phoneRegions[0].label
  editing.value = true
}

const changePhoneRegion = (event: { detail: { value: number | string } }) => {
  form.phoneRegion = phoneRegions[Number(event.detail.value)].label
}

const changeDocument = (event: { detail: { value: number | string } }) => {
  form.documentType = documentTypes[Number(event.detail.value)]
  if (form.documentType !== '護照') form.passportCountry = ''
}

const savePassenger = async () => {
  if (!form.name.trim() || !form.phone.trim() || (form.documentType === '護照' && !form.passportCountry)) {
    uni.showToast({ title: '請完善乘客資料', icon: 'none' })
    return
  }
  const value = { ...form, name: form.name.trim(), phone: form.phone.trim(), phoneRegion: phoneRegionCode(form.phoneRegion), passportCountry: form.passportCountry || null }
  try {
    const saved = editingIndex.value === -1
      ? await createCommonPassenger(value)
      : await updateCommonPassenger(passengers.value[editingIndex.value].id, value)
    if (editingIndex.value === -1) passengers.value.push(saved)
    else passengers.value[editingIndex.value] = saved
    uni.setStorageSync('common-passengers', passengers.value)
    editing.value = false
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '常用資料保存失敗', icon: 'none' })
  }
}

const removePassenger = (index: number) => {
  const passenger = passengers.value[index]
  uni.showModal({ title: '刪除常用資料', content: `確定刪除 ${passenger.name}？`, success: async ({ confirm }) => {
    if (!confirm) return
    try {
      if (!passenger.id.startsWith('local-')) await deleteCommonPassenger(passenger.id)
      passengers.value.splice(index, 1)
      uni.setStorageSync('common-passengers', passengers.value)
    } catch (error) {
      uni.showToast({ title: error instanceof Error ? error.message : '刪除失敗', icon: 'none' })
    }
  } })
}

const setDefaultPassenger = async (index: number) => {
  const passenger = passengers.value[index]
  if (passenger.isDefault) return
  try {
    const updated = passenger.id.startsWith('local-')
      ? { ...passenger, isDefault: true }
      : await updateCommonPassenger(passenger.id, { isDefault: true })
    passengers.value = passengers.value.map((item) => item.id === updated.id ? updated : { ...item, isDefault: false })
    uni.setStorageSync('common-passengers', passengers.value)
    uni.showToast({ title: '已設為預設乘客', icon: 'none' })
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '設定預設失敗', icon: 'none' })
  }
}

onMounted(() => { void loadPassengers() })

const goBack = () => closeCachedPage('/pages/trips/trips')
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;height:100%;margin:0;overflow:hidden}.page{position:fixed;inset:0;margin:auto;width:430px;height:932px;overflow:hidden;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif}.header{position:absolute;inset:0 0 auto;height:110px;background:#fff;border-radius:25px}.back{position:absolute;top:60px;left:33px;width:12px;height:25px}.back-icon{position:absolute;top:-1.7325px;left:-1.728px;width:15.531px;height:28.4627px}.title{position:absolute;top:58px;left:calc(50% - 36px);font-size:18px;font-weight:500;line-height:normal}.content{position:absolute;top:125px;bottom:0;width:430px;padding:0 15px;box-sizing:border-box}.content-head{height:44px;margin-bottom:12px;padding:0 5px;display:flex;align-items:center;justify-content:space-between}.content-title{font-size:17px;font-weight:600}.add{padding:8px 14px;border-radius:16px;background:#285cfc;color:#fff;font-size:13px;line-height:1}.empty{text-align:center;margin-top:80px;color:#8995a8}.passenger-card{position:relative;margin-bottom:12px;padding:17px 20px;height:115px;box-sizing:border-box;border-radius:16px;background:#fff}.card-head{display:flex;justify-content:space-between}.name{font-size:17px;font-weight:600}.edit,.remove{color:#285cfc;font-size:13px}.detail{display:block;margin-top:8px;font-size:13px;color:#667386}.remove{position:absolute;right:20px;bottom:13px;color:#d9534f}.form-mask{position:absolute;inset:0;z-index:20;display:flex;align-items:flex-end;background:rgba(20,28,42,.42)}.form-sheet{width:430px;padding:24px 20px 30px;border-radius:25px 25px 0 0;background:#fff}.form-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:15px}.form-title{font-size:20px;font-weight:600}.cancel{padding:6px;color:#667386;font-size:14px}.form-sheet input,.select{height:46px;margin-top:10px;padding:0 14px;box-sizing:border-box;border:1px solid #d9dfe8;border-radius:10px;background:#f7f8fa;line-height:46px;font-size:15px}.phone-row{display:flex;gap:8px}.region-picker{width:104px;flex:none}.region-select{height:46px;margin-top:10px;padding:0 10px;border:1px solid #d9dfe8;border-radius:10px;background:#f7f8fa;line-height:46px;font-size:14px}.phone-input{flex:1;min-width:0}.form-sheet button{height:46px;margin-top:18px;border:0;border-radius:10px;background:#285cfc;color:#fff;line-height:46px}.form-sheet button::after{border:0}
@media (max-width:599px){.page{top:0;right:auto;bottom:auto;left:0;margin:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}.content{height:auto}}
</style>
