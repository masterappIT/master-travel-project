<template>
  <view class="address-page" @tap="regionMenuOpen = false">
    <view class="address-header">
      <image class="back" src="/static/messages/back.svg" mode="aspectFit" @tap.stop="$emit('close')" />
      <text class="title">地址選擇</text>
      <view class="city-search">
        <view class="region-trigger" @tap.stop="handleRegionTriggerTap"><text class="city">{{ selectedCityLabel || selectedRegion || '城市' }}</text><image class="city-location" :class="{ 'city-location--open': !selectedRegion && regionMenuOpen }" :src="selectedRegion || selectedCity ? '/static/home/address/region-clear.svg' : '/static/home/address/city-location.svg'" mode="aspectFit" /></view>
        <view class="search-box"><image class="search-icon" src="/static/home/address/search.svg" mode="aspectFit" /><input v-model="keyword" class="search-input" placeholder="搜尋地點" confirm-type="search" @confirm="runSearch" /></view><text class="search-action" @tap="runSearch">{{ searching ? '搜尋中' : '搜索' }}</text>
      </view>
    </view>
    <scroll-view class="address-scroll" scroll-y :show-scrollbar="false">
      <view class="current-card"><text class="current-title">當前定位城市：{{ regionData.currentCity }}</text><view class="current-place" @tap="$emit('use-current')"><image src="/static/home/address/current.svg" mode="aspectFit" /><view><text class="place-name">{{ formatVisibleAddress(regionData.currentName) }}</text><text class="place-address">{{ formatVisibleAddress(regionData.currentAddress) }}</text></view></view></view>
      <view class="recommend-list"><view class="recommend-content"><view class="recommend-title"><image src="/static/home/address/recommend.svg" mode="aspectFit" /><text>{{ searchResults === null ? '推薦地點' : '搜尋結果' }}</text></view><view v-for="place in filteredPlaces" :key="place.id || place.name" class="place-row" @tap="selectPlace(place)"><image src="/static/home/address/place.svg" mode="aspectFit" /><view><text class="place-name">{{ formatVisibleAddress(place.name) }}</text><text class="place-address">{{ formatVisibleAddress(place.displayAddress || place.address) }}</text></view></view><text v-if="searchResults?.length === 0" class="empty-result">找不到相關地點</text></view></view>
    </scroll-view>
    <view v-if="regionMenuOpen" class="region-menu" @tap.stop>
      <view class="region-menu-panel">
        <view v-for="option in regionOptions" :key="option.value" class="region-option" @tap="selectRegion(option.value)">{{ option.label }}</view>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listMainlandCities, listRecommendedAddresses, searchPlaces, type PlaceSearchResult } from '../../services/api'
const props = defineProps<{ selecting: 'origin' | 'destination'; locationLabel: string; detailedAddress: string; initialSelection?: AddressSelection | null; canUseCurrent?: boolean }>()
type Region = '大陸' | '香港' | '澳門'
interface Place { id?: string; name: string; address: string; displayAddress?: string; latitude?: number; longitude?: number; city?: string; district?: string; landmark?: string }
export interface AddressSelection extends Place { region: Region | null }
const emit = defineEmits<{ close: []; select: [value: string, selection: AddressSelection]; locate: []; 'use-current': [] }>()
const formatVisibleAddress = (value: string) => value
  .replace(/香港(?:特別行政區|特别行政区)/g, '香港')
  .replace(/澳門(?:特別行政區|特别行政区)/g, '澳門')
  .replace(/澳门(?:特别行政区)/g, '澳門')
interface RegionData { currentCity: string; currentName: string; currentAddress: string; places: Place[] }
const regions: Region[] = ['大陸', '香港', '澳門']
const fallbackRecommendedPlaces: Array<Place & { region: Region }> = [
  { id: 'hk-airport', region: '香港', name: '香港國際機場', address: '離島區-香港赤臘角天路1號', latitude: 22.308046, longitude: 113.91848 },
  { id: 'hk-disney', region: '香港', name: '香港迪士尼樂園', address: '荃灣區-大嶼山竹篙灣', latitude: 22.312966, longitude: 114.04195 },
  { id: 'sz-airport', region: '大陸', name: '深圳寶安國際機場', address: '深圳市-寶安區-寶安大道', city: '深圳市', latitude: 22.639258, longitude: 113.810664 },
  { id: 'sz-bay', region: '大陸', name: '深圳灣口岸', address: '深圳市-南山區-東濱路', city: '深圳市', latitude: 22.50739, longitude: 113.93652 },
  { id: 'macau-airport', region: '澳門', name: '澳門國際機場', address: '嘉模堂區-偉龍馬路', latitude: 22.149556, longitude: 113.591558 },
  { id: 'macau-ruins', region: '澳門', name: '澳門大三巴牌坊', address: '花王堂區-炮台山下', latitude: 22.197745, longitude: 113.54083 },
]
const recommendedCoordinates: Record<string, { latitude: number; longitude: number }> = Object.fromEntries(
  fallbackRecommendedPlaces.map(place => [place.id, { latitude: place.latitude!, longitude: place.longitude! }]),
)
const selectedRegion = ref<Region | null>(null)
const selectedCity = ref<string | null>(null)
const regionMenuOpen = ref(false)
const keyword = ref('')
const searching = ref(false)
const searchResults = ref<PlaceSearchResult[] | null>(null)
const recommendedPlaces = ref<Array<Place & { region: Region }>>(fallbackRecommendedPlaces)
const mainlandCities = ref<string[]>([])
const displayCityName = (city: string) => city.replace(/市$/, '') || city
const regionOptions = computed(() => [
  ...regions.map(region => ({ value: region, label: region })),
  ...mainlandCities.value.map(city => ({ value: city, label: displayCityName(city) })),
])
const selectedCityLabel = computed(() => selectedCity.value ? displayCityName(selectedCity.value) : '')
const currentCity = computed(() => {
  const city = props.locationLabel.split(' · ')[0] || '目前位置'
  return city.replace(/特別行政區$|特别行政区$|市$/, '') || city
})
const defaultData = computed<RegionData>(() => ({
  currentCity: currentCity.value,
  currentName: props.locationLabel || '目前位置',
  currentAddress: props.detailedAddress || props.locationLabel || '目前位置',
  places: recommendedPlaces.value.filter(place => place.region === (props.selecting === 'origin' ? '香港' : '大陸')),
}))
const regionData = computed<RegionData>(() => ({
  ...defaultData.value,
  places: selectedCity.value
    ? recommendedPlaces.value.filter(place => place.region === '大陸' && place.city === selectedCity.value)
    : selectedRegion.value
      ? recommendedPlaces.value.filter(place => place.region === selectedRegion.value)
    : defaultData.value.places,
}))
const initialPlace = computed<Place | null>(() => props.initialSelection ? {
  ...props.initialSelection,
  displayAddress: props.initialSelection.displayAddress || props.initialSelection.address,
} : null)
const filteredPlaces = computed(() => {
  if (searchResults.value) return searchResults.value
  const places = regionData.value.places.filter(place => !keyword.value || `${place.name}${place.address}`.includes(keyword.value))
  if (keyword.value && initialPlace.value && `${initialPlace.value.name}${initialPlace.value.address}`.includes(keyword.value)
    && !places.some(place => place.id === initialPlace.value?.id)) {
    return [initialPlace.value, ...places]
  }
  return places
})
const validCoordinate = (latitude?: number, longitude?: number) => Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude as number) <= 90 && Math.abs(longitude as number) <= 180
const runSearch = async () => {
  const value = keyword.value.trim()
  if (!value || searching.value) return
  searching.value = true
  searchResults.value = null
  try {
    const results = await searchPlaces(value, selectedRegion.value || undefined, selectedCity.value || undefined)
    searchResults.value = results.filter(place => validCoordinate(place.latitude, place.longitude))
  } catch (error) {
    searchResults.value = []
    const message = error instanceof Error ? error.message : '位置搜索失敗，請稍後再試'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    searching.value = false
  }
}
onMounted(async () => {
  const [addressesResult, citiesResult] = await Promise.allSettled([listRecommendedAddresses(), listMainlandCities()])
  if (addressesResult.status === 'fulfilled') {
    recommendedPlaces.value = addressesResult.value.length > 0
      ? addressesResult.value.map(({ id, region, city, name, address, displayAddress, latitude, longitude }) => ({
          id, region, city: city || undefined, name, address, displayAddress,
          latitude: latitude ?? recommendedCoordinates[id]?.latitude,
          longitude: longitude ?? recommendedCoordinates[id]?.longitude,
        }))
      : fallbackRecommendedPlaces
  } else {
    recommendedPlaces.value = fallbackRecommendedPlaces
    uni.showToast({ title: '推薦地點暫時無法載入，已使用預設地點', icon: 'none' })
  }
  if (citiesResult.status === 'fulfilled') {
    mainlandCities.value = citiesResult.value.map(city => city.name)
  } else {
    mainlandCities.value = []
    uni.showToast({ title: '大陸城市暫時無法載入', icon: 'none' })
  }
  if (props.initialSelection?.name) void runSearch()
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
  if (!validCoordinate(place.latitude, place.longitude)) {
    searching.value = true
    try {
      const matches = await searchPlaces(place.name, region || undefined, place.city || undefined)
      const match = matches.find(item => item.name === place.name && validCoordinate(item.latitude, item.longitude)) || matches.find(item => validCoordinate(item.latitude, item.longitude))
      if (!match) {
        uni.showToast({ title: '未能取得地點座標', icon: 'none' })
        return
      }
      resolvedPlace = { ...place, ...match }
    } catch (error) {
      uni.showToast({ title: error instanceof Error ? error.message : '未能取得地點座標', icon: 'none' })
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
    selectedCity.value = null
    keyword.value = ''
    searchResults.value = null
    regionMenuOpen.value = false
    return
  }
  regionMenuOpen.value = !regionMenuOpen.value
}
const selectRegion = (value: string) => {
  if (regions.includes(value as Region)) {
    selectedRegion.value = value as Region
    selectedCity.value = null
  } else {
    selectedRegion.value = '大陸'
    selectedCity.value = value
  }
  keyword.value = ''
  searchResults.value = null
  regionMenuOpen.value = false
}
if (props.initialSelection) {
  const selection = props.initialSelection
  selectedRegion.value = selection.region === '香港' || selection.region === '澳門' ? selection.region : '大陸'
  selectedCity.value = selection.city || null
  keyword.value = selection.name
}
</script>
<style scoped>
.address-page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);min-height:100%;z-index:50;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;overflow:hidden}.address-header{position:absolute;top:0;left:0;width:430px;height:155px;border-radius:25px;background:#fff}.back{position:absolute;top:60px;left:33px;width:12px;height:25px}.title{position:absolute;top:58px;left:calc(50% - 36px);font-size:18px;font-weight:500}.city-search{position:absolute;top:110px;left:21px;width:388px;height:35px}.region-trigger{position:absolute;left:0;top:0;width:58px;height:35px}.city{position:absolute;left:0;top:7px;font-size:14px;white-space:nowrap}.city-location{position:absolute;left:38px;top:7px;width:20px;height:20px;transition:transform .2s ease}.city-location--open{transform:rotate(180deg)}.search-box{position:absolute;left:63px;top:0;width:287px;height:35px;border-radius:20px;background:#f0f2f5}.search-icon{position:absolute;left:11px;top:7px;width:20px;height:20px}.search-input{width:100%;height:35px;padding:0 10px 0 38px;border:0;border-radius:20px;background:transparent;color:#38434a;font-size:14px;box-sizing:border-box}.search-action{position:absolute;left:360px;top:7px;color:#38434a;font-size:14px;white-space:nowrap}.address-scroll{position:absolute;top:155px;left:0;width:430px;height:calc(var(--mobile-height, 932px) - 155px);overflow:hidden}.current-card{position:relative;top:auto;left:5px;width:420px;height:93px;margin:10px 0 20px;padding:14px 15px;box-sizing:border-box;border-radius:10px;background:#fff}.current-title{display:block;font-size:16px}.current-place{display:flex;align-items:center;margin-top:5px}.current-place image{width:8px;height:14.517px;margin-right:8px;flex:none}.place-name,.place-address{display:block}.place-name{font-size:14px;font-weight:700}.place-address{font-size:12px;font-weight:350;white-space:nowrap}.recommend-list{position:relative;top:auto;left:5px;width:420px;height:auto;overflow:visible}.recommend-content{display:flex;flex-direction:column;width:420px}.recommend-title{height:60px;min-height:60px;flex:none;border-radius:10px;background:#285cfc;color:#fff;display:flex;align-items:center;padding-left:20px;box-sizing:border-box;font-size:18px;font-weight:500}.recommend-title image{width:15px;height:22.458px;margin-right:10px;flex:none}.place-row{height:57px;min-height:57px;flex:none;margin-top:5px;border-radius:10px;background:#fff;display:flex;align-items:flex-start;padding:10px 15px;box-sizing:border-box}.place-row image{width:10px;height:14.972px;margin:5px 6px 0 0;flex:none}.place-row .place-address{overflow:hidden;text-overflow:ellipsis;max-width:370px}.region-menu{position:absolute;z-index:2;top:155px;left:3px;width:86px;max-height:420px;padding-top:7px;box-sizing:border-box;color:#38434a}.region-menu-panel{position:relative;width:86px;max-height:413px;overflow-y:auto;padding:0 10px;box-sizing:border-box;border-radius:5px;background:#fff;box-shadow:0 4px 4px rgba(217,217,217,.25)}.region-menu-panel::before{position:absolute;top:-7px;left:18px;width:0;height:0;border-right:7px solid transparent;border-bottom:7px solid #fff;border-left:7px solid transparent;content:''}.region-option{position:relative;height:35px;font-size:14px;font-weight:500;line-height:35px;white-space:nowrap}
</style>
