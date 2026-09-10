<template>
  <view class="address-page" @tap="regionMenuOpen = false">
    <view class="address-header">
      <image class="back" src="/static/messages/back.svg" mode="aspectFit" @tap.stop="$emit('close')" />
      <text class="title">地址選擇</text>
      <view class="city-search">
        <view class="region-trigger" @tap.stop="handleRegionTriggerTap"><text class="city">{{ selectedRegion || currentCity }}</text><image class="city-location" :class="{ 'city-location--open': !selectedRegion && regionMenuOpen }" :src="selectedRegion ? '/static/home/address/region-clear.svg' : '/static/home/address/city-location.svg'" mode="aspectFit" /></view>
        <view class="search-box"><image class="search-icon" src="/static/home/address/search.svg" mode="aspectFit" /><input v-model="keyword" class="search-input" placeholder="搜尋地點" confirm-type="search" @confirm="runSearch" /></view><text class="search-action" @tap="runSearch">{{ searching ? '搜尋中' : '搜索' }}</text>
      </view>
    </view>
    <view class="current-card"><text class="current-title">當前定位城市：{{ regionData.currentCity }}</text><view class="current-place" @tap="$emit('use-current')"><image src="/static/home/address/current.svg" mode="aspectFit" /><view><text class="place-name">{{ regionData.currentName }}</text><text class="place-address">{{ regionData.currentAddress }}</text></view></view></view>
    <view class="recommend-list"><view class="recommend-content"><view class="recommend-title"><image src="/static/home/address/recommend.svg" mode="aspectFit" /><text>{{ searchResults === null ? '推薦地點' : '搜尋結果' }}</text></view><view v-for="place in filteredPlaces" :key="place.id || place.name" class="place-row" @tap="selectPlace(place)"><image src="/static/home/address/place.svg" mode="aspectFit" /><view><text class="place-name">{{ place.name }}</text><text class="place-address">{{ place.address }}</text></view></view><text v-if="searchResults?.length === 0" class="empty-result">找不到相關地點</text></view></view>
    <view v-if="regionMenuOpen" class="region-menu" @tap.stop>
      <view class="region-menu-panel">
        <view v-for="region in regions" :key="region" class="region-option" @tap="selectRegion(region)">{{ region }}</view>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listRecommendedAddresses, searchPlaces, type PlaceSearchResult } from '../../services/api'
const props = defineProps<{ selecting: 'origin' | 'destination'; locationLabel: string; detailedAddress: string }>()
type Region = '大陸' | '香港' | '澳門'
interface Place { id?: string; name: string; address: string; latitude?: number; longitude?: number; city?: string; district?: string; landmark?: string }
interface AddressSelection extends Place { region: Region | null }
const emit = defineEmits<{ close: []; select: [value: string, selection: AddressSelection]; locate: []; 'use-current': [] }>()
interface RegionData { currentCity: string; currentName: string; currentAddress: string; places: Place[] }
const regions: Region[] = ['大陸', '香港', '澳門']
const selectedRegion = ref<Region | null>(null)
const regionMenuOpen = ref(false)
const keyword = ref('')
const searching = ref(false)
const searchResults = ref<PlaceSearchResult[] | null>(null)
const hongKongPlaces = ref<Place[]>([
  { name: '香港國際機場', address: '香港特別行政區-離島區-香港赤臘角天路1號' },
  { name: '香港迪士尼樂園', address: '香港特別行政區-荃灣區-大嶼山竹篙灣' },
  { name: '香港海洋公園', address: '香港特別行政區-南區-香港香港仔黃竹坑180號' },
  { name: '香港銅鑼灣時代廣場', address: '香港特別行政區-灣仔區-香港銅鑼灣勿地臣街1號' },
  { name: '尖沙咀海港城', address: '香港特別行政區-灣仔區-香港銅鑼灣勿地臣街1號' },
  { name: '香港會展中心', address: '香港特別行政區-灣仔區-香港銅鑼灣勿地臣街1號' },
  { name: '亞洲國際博覽館', address: '香港特別行政區-灣仔區-香港銅鑼灣勿地臣街1號' },
  { name: '蘭桂坊', address: '香港特別行政區-灣仔區-香港銅鑼灣勿地臣街1號' },
])
const mainlandPlaces = ref<Place[]>([
  { name: '深圳寶安國際機場', address: '深圳市-寶安區-寶安大道' },
  { name: '深圳灣口岸', address: '深圳市-寶安區-寶安大道' },
  { name: '廣州白雲國際機場', address: '廣州市-花都區-花東鎮機場大道東888號' },
  { name: '廣州融創樂園', address: '廣州市-花都區-花東鎮機場大道東888號' },
  { name: '珠海長隆國際海洋度假區', address: '廣東省-珠海市' },
  { name: '珠海市', address: '廣東省-珠海市' },
  { name: '中山市', address: '廣東省-中山市' },
  { name: '佛山市', address: '廣東省-佛山市' },
  { name: '東莞市', address: '廣東省-東莞市' },
])
const macauPlaces = ref<Place[]>([
  { name: '澳門國際機場', address: '澳門特別行政區-嘉模堂區-偉龍馬路' },
  { name: '澳門半島', address: '澳門特別行政區-澳門半島' },
  { name: '澳門大三巴牌坊', address: '澳門特別行政區-花王堂區-炮台山下' },
  { name: '澳門葡京酒店', address: '澳門特別行政區-大堂區-葡京路2-4號' },
  { name: '銀河酒店鑽石大廳', address: '澳門特別行政區-路氹城-望德聖母灣大馬路' },
  { name: '永利皇宮', address: '澳門特別行政區-路氹城-體育館大馬路' },
])
const currentCity = computed(() => {
  const city = props.locationLabel.split(' · ')[0] || '目前位置'
  return city.replace(/特別行政區$|特别行政区$|市$/, '') || city
})
const defaultData = computed<RegionData>(() => ({
  currentCity: currentCity.value,
  currentName: props.locationLabel || '目前位置',
  currentAddress: props.detailedAddress || props.locationLabel || '目前位置',
  places: props.selecting === 'origin' ? hongKongPlaces.value : mainlandPlaces.value,
}))
const regionData = computed<RegionData>(() => ({
  ...defaultData.value,
  places: selectedRegion.value === '大陸'
    ? mainlandPlaces.value
    : selectedRegion.value === '澳門'
      ? macauPlaces.value
      : hongKongPlaces.value,
}))
const filteredPlaces = computed(() => searchResults.value ?? regionData.value.places.filter(place => !keyword.value || `${place.name}${place.address}`.includes(keyword.value)))
const runSearch = async () => {
  const value = keyword.value.trim()
  if (!value || searching.value) return
  searching.value = true
  try {
    searchResults.value = await searchPlaces(value, selectedRegion.value || undefined)
  } catch {
    uni.showToast({ title: '位置搜索失敗，請稍後再試', icon: 'none' })
  } finally {
    searching.value = false
  }
}
onMounted(async () => {
  try {
    const addresses = await listRecommendedAddresses()
    const grouped = (region: Region) => addresses.filter(item => item.region === region).map(({ name, address }) => ({ name, address }))
    const hongKong = grouped('香港')
    const mainland = grouped('大陸')
    const macau = grouped('澳門')
    if (hongKong.length) hongKongPlaces.value = hongKong
    if (mainland.length) mainlandPlaces.value = mainland
    if (macau.length) macauPlaces.value = macau
  } catch {
    // Keep bundled recommendations when the API is unavailable.
  }
})
const inferRegion = (place: Place): Region | null => {
  const text = `${place.name}${place.address}`
  if (/香港/.test(text)) return '香港'
  if (/澳(?:門|门)/.test(text)) return '澳門'
  return selectedRegion.value || '大陸'
}
const selectPlace = async (place: Place) => {
  let resolvedPlace = place
  const region = inferRegion(place)
  if (place.latitude === undefined || place.longitude === undefined) {
    searching.value = true
    try {
      const matches = await searchPlaces(place.name, region || undefined)
      const match = matches.find(item => item.name === place.name) || matches[0]
      if (!match) {
        uni.showToast({ title: '未能取得地點座標', icon: 'none' })
        return
      }
      resolvedPlace = { ...place, ...match }
    } catch {
      uni.showToast({ title: '未能取得地點座標', icon: 'none' })
      return
    } finally {
      searching.value = false
    }
  }
  emit(
    'select',
    region ? `${region} · ${resolvedPlace.name}` : resolvedPlace.name,
    { ...resolvedPlace, region },
  )
}
const handleRegionTriggerTap = () => {
  if (selectedRegion.value) {
    selectedRegion.value = null
    keyword.value = ''
    searchResults.value = null
    regionMenuOpen.value = false
    return
  }
  regionMenuOpen.value = !regionMenuOpen.value
}
const selectRegion = (region: Region) => { selectedRegion.value = region; keyword.value = ''; searchResults.value = null; regionMenuOpen.value = false }
</script>
<style scoped>
.address-page{position:fixed;top:0;left:0;width:430px;height:932px;z-index:50;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;overflow:hidden}.address-header{position:absolute;top:0;left:0;width:430px;height:155px;border-radius:25px;background:#fff}.back{position:absolute;top:60px;left:33px;width:12px;height:25px}.title{position:absolute;top:58px;left:calc(50% - 36px);font-size:18px;font-weight:500}.city-search{position:absolute;top:110px;left:21px;width:388px;height:35px}.region-trigger{position:absolute;left:0;top:0;width:58px;height:35px}.city{position:absolute;left:0;top:7px;font-size:14px;white-space:nowrap}.city-location{position:absolute;left:38px;top:7px;width:20px;height:20px;transition:transform .2s ease}.city-location--open{transform:rotate(180deg)}.search-box{position:absolute;left:63px;top:0;width:287px;height:35px;border-radius:20px;background:#f0f2f5}.search-icon{position:absolute;left:11px;top:7px;width:20px;height:20px}.search-input{width:100%;height:35px;padding:0 10px 0 38px;border:0;border-radius:20px;background:transparent;color:#38434a;font-size:14px;box-sizing:border-box}.search-action{position:absolute;left:360px;top:7px;color:#38434a;font-size:14px;white-space:nowrap}.current-card{position:absolute;top:165px;left:5px;width:420px;height:93px;padding:14px 15px;box-sizing:border-box;border-radius:10px;background:#fff}.current-title{display:block;font-size:16px}.current-place{display:flex;align-items:center;margin-top:5px}.current-place image{width:8px;height:14.517px;margin-right:8px;flex:none}.place-name,.place-address{display:block}.place-name{font-size:14px;font-weight:700}.place-address{font-size:12px;font-weight:350;white-space:nowrap}.recommend-list{position:absolute;top:278px;left:5px;width:420px;height:auto;overflow:visible}.recommend-content{display:flex;flex-direction:column;width:420px}.recommend-title{height:60px;min-height:60px;flex:none;border-radius:10px;background:#285cfc;color:#fff;display:flex;align-items:center;padding-left:20px;box-sizing:border-box;font-size:18px;font-weight:500}.recommend-title image{width:15px;height:22.458px;margin-right:10px;flex:none}.place-row{height:57px;min-height:57px;flex:none;margin-top:5px;border-radius:10px;background:#fff;display:flex;align-items:flex-start;padding:10px 15px;box-sizing:border-box}.place-row image{width:10px;height:14.972px;margin:5px 6px 0 0;flex:none}.place-row .place-address{overflow:hidden;text-overflow:ellipsis;max-width:370px}.region-menu{position:absolute;z-index:2;top:155px;left:3px;width:86px;height:117.21px;padding-top:7px;box-sizing:border-box;color:#38434a}.region-menu-panel{position:relative;width:86px;height:110px;padding:0 10px;box-sizing:border-box;border-radius:5px;background:#fff;box-shadow:0 4px 4px rgba(217,217,217,.25)}.region-menu-panel::before{position:absolute;top:-7px;left:18px;width:0;height:0;border-right:7px solid transparent;border-bottom:7px solid #fff;border-left:7px solid transparent;content:''}.region-option{position:relative;height:35px;font-size:14px;font-weight:500;line-height:35px}
</style>
