<template>
  <scroll-view class="business-scroll" scroll-y :show-scrollbar="false" enhanced>
    <view class="business-spacer" />
    <view class="charter-card" :aria-label="tx('商務包車預約')">
      <view class="booking-card">
        <image class="orb orb-top" src="/static/home/business/orb-top.svg" mode="scaleToFill" />
        <image class="orb orb-bottom" src="/static/home/business/orb-bottom.svg" mode="scaleToFill" />

        <view class="location-field" @tap="$emit('origin')">
          <image class="pin origin-pin" src="/static/home/business/origin.svg" mode="scaleToFill" />
          <view class="region-select">
            <text>{{ tx(props.originRegion) }}</text>
            <image src="/static/home/business/dropdown.svg" mode="scaleToFill" />
          </view>
          <text :class="props.originPlace ? 'location-value' : 'location-placeholder'">{{ tx(props.originPlace || '請選擇出發地') }}</text>
        </view>

        <view class="location-field destination-field" @tap="$emit('destination')">
          <image class="pin destination-pin" src="/static/home/business/destination.svg" mode="scaleToFill" />
          <view class="region-select">
            <text>{{ tx(props.destinationRegion) }}</text>
            <image src="/static/home/business/dropdown.svg" mode="scaleToFill" />
          </view>
          <text :class="props.destinationPlace ? 'location-value' : 'location-placeholder'">{{ tx(props.destinationPlace || '請選擇最終結束目的地') }}</text>
        </view>

        <view class="detail-field date-field" @tap="$emit('date-time')">
          <text class="detail-label">{{ tx('日期時間') }}</text>
          <text class="detail-value">02-04-2024 AM 9:00</text>
        </view>
        <view class="detail-field duration-field" @tap="$emit('duration')">
          <text class="detail-label">{{ tx('用車時間') }}</text>
          <text class="detail-value">{{ tx('4小時（含50公里）') }}</text>
        </view>

        <view class="book-button" @tap="$emit('book')"><text>{{ tx('立即預約') }}</text></view>
      </view>

      <view class="promo-card">
        <image class="promo-shape" src="/static/home/business/promo-shape.svg" mode="scaleToFill" />
        <image class="promo-arrow" src="/static/home/business/promo-arrow.svg" mode="scaleToFill" />
        <text class="promo-title">{{ tx('跨境出行限時優惠') }}</text>
        <text class="promo-copy">{{ tx('單程、往返 一口價') }}</text>
        <view class="promo-button" @tap="$emit('promo')"><text>{{ tx('預約') }}</text></view>
        <view class="disclaimer">
          <text>{{ tx('EC Travel僅提供交易平台技術服務、信息發布服務，並不提供網約車/用車/包車') }}</text>
          <text>{{ tx('服務，車輛預約以及承運其他服務由第三方商戶或個人提供。') }}</text>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { tx } from '../../i18n'
const props = defineProps<{
  originRegion: string
  originPlace: string
  destinationRegion: string
  destinationPlace: string
}>()

defineEmits<{
  origin: []
  destination: []
  'date-time': []
  duration: []
  book: []
  promo: []
}>()
</script>

<style scoped>
.business-scroll{position:absolute;inset:0 0 102px;z-index:4;width:430px;height:830px;overflow:hidden;box-sizing:border-box}
.business-spacer{height:0}
.charter-card{position:relative;width:430px;height:586px;color:#fff;font-family:'Noto Sans TC',sans-serif;animation:charter-slide-down .45s cubic-bezier(.22,1,.36,1) both}
@keyframes charter-slide-down{from{transform:translateY(-932px)}to{transform:translateY(0)}}
.booking-card{position:absolute;inset:0 0 86px;overflow:hidden;box-sizing:border-box;background:#56657e;border-radius:0 0 25px 25px}
.orb{position:absolute;width:219px;height:219px;pointer-events:none}.orb-top{left:-105px;top:-109px}.orb-bottom{left:301px;top:370px}
.location-field{position:absolute;left:25px;top:149px;width:380px;height:57px;overflow:hidden;box-sizing:border-box;border:1px solid #d9d9d9;border-radius:10px}.destination-field{top:225px}.pin{position:absolute;left:9px}.origin-pin{top:20.75px;width:8px;height:14.517px}.destination-pin{top:22.5px;width:8px;height:11.978px}.region-select{position:absolute;left:32px;top:18px;width:58px;height:20px;display:flex;align-items:center;gap:10px;font-size:14px}.region-select image{display:block;width:20px;height:20px;flex:0 0 20px}.location-value,.location-placeholder{position:absolute;left:100px;top:17px;font-size:14px;line-height:21px;white-space:nowrap}.location-value{color:#1effaa}.location-placeholder{color:#fff;font-weight:300}
.detail-field{position:absolute;top:301px;width:185px;height:69px;box-sizing:border-box;border:1px solid #d9d9d9;border-radius:10px}.date-field{left:25px}.duration-field{left:220px}.detail-label{position:absolute;left:20px;top:4px;font-size:12px;font-weight:500}.detail-value{position:absolute;left:20px;top:33px;font-size:16px;font-weight:400;white-space:nowrap}
.book-button{position:absolute;left:25px;top:400px;width:380px;height:60px;display:flex;align-items:center;justify-content:center;background:#1effaa;border-radius:25px;color:#38434a;font-size:18px;font-weight:700;cursor:pointer}
.promo-card{position:absolute;left:0;top:506px;width:430px;height:80px;overflow:hidden;box-sizing:border-box;background:#f0f2f5;border-radius:25px;box-shadow:0 4px 4px rgba(217,217,217,.25);color:#38434a}.promo-shape{position:absolute;left:-13px;top:-17px;width:455.038px;height:113.254px}.promo-arrow{position:absolute;left:15px;top:40px;width:30px;height:30px;transform:scaleX(-1)}.promo-title{position:absolute;left:15px;top:10px;color:#f95c5c;font-size:14px;font-weight:700}.promo-copy{position:absolute;left:71px;top:30px;font-size:14px;font-weight:700}.promo-button{position:absolute;left:346px;top:25px;width:73px;height:30px;display:flex;align-items:center;justify-content:center;background:#285cfc;border-radius:20px;color:#fff;font-size:14px;font-weight:700}.disclaimer{position:absolute;left:56px;top:51px;display:flex;flex-direction:column;font-size:8px;font-weight:100;line-height:normal;white-space:nowrap}
</style>
