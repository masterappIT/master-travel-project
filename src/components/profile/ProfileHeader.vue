<template>
  <view class="profile-header">
    <image class="avatar" :class="{ 'avatar-guest': !authenticated }" :src="avatarUrl || '/static/profile/avatar-empty.svg'" mode="aspectFit" @tap="$emit(authenticated ? 'avatar' : 'login')" />
    <text class="profile-title">Profile</text>
    <image class="notification" src="/static/profile/notification.svg" mode="aspectFit" @tap="$emit('settings')" />
    <text class="greeting" :class="{ 'guest-login': !authenticated }" @tap="!authenticated && $emit('login')">{{ authenticated ? greeting : '請登入/註冊' }}</text>
    <view class="bell" aria-label="我的消息" @tap="$emit('notifications')">
      <image class="bell-icon" src="/static/profile/notification-bell.svg" mode="aspectFit" />
      <image class="bell-tail" src="/static/profile/notification-bell-tail.svg" mode="aspectFit" />
      <image v-if="unreadCount > 0" class="badge" :class="{ 'guest-badge': !authenticated }" src="/static/profile/notification-badge.svg" mode="aspectFit" />
      <text v-if="authenticated && unreadCount > 0" class="badge-count">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
    </view>
  </view>
</template>
<script setup lang="ts">
import { computed } from 'vue'

const { avatarUrl, displayName, authenticated } = withDefaults(defineProps<{ avatarUrl?: string; displayName?: string; unreadCount?: number; authenticated?: boolean }>(), { avatarUrl: '', displayName: '', unreadCount: 0, authenticated: true })
const greeting = computed(() => displayName.trim() ? `Hi, ${displayName.trim()}` : 'Hi,')
defineEmits<{ notifications: []; avatar: []; settings: []; login: [] }>()
</script>
<style scoped>
.profile-header{position:absolute;top:0;left:0;width:430px;height:260px;background:#56657E;border-radius:35px;overflow:hidden;color:#fff}.avatar{position:absolute;top:92px;left:calc(50% - 40px);width:80px;height:80px;border-radius:50%}.avatar-guest{top:107px;left:calc(50% - 25px);width:50px;height:50px}.profile-title{position:absolute;top:60px;left:calc(50% - 33px);font-size:20px;font-weight:700}.greeting{position:absolute;top:168px;left:0;width:100%;font-size:18px;font-weight:700;text-align:center}.guest-login{left:0}.notification{position:absolute;top:168px;left:376px;width:25px;height:26px}.bell{position:absolute;top:168px;left:30px;width:25px;height:25px}.bell-icon{position:absolute;top:0;left:0;width:20.7749px;height:19.7343px}.bell-tail{position:absolute;top:19.7343px;left:6.23px;width:8.31101px;height:5.26634px}.badge{position:absolute;top:-5px;right:-4px;width:18px;height:18px}.guest-badge{top:-1px;right:-1px;width:12px;height:12px}.badge-count{position:absolute;top:-5px;right:-3px;width:16px;color:#fff;font-family:'Noto Sans TC',sans-serif;font-size:11px;font-weight:900;line-height:18px;text-align:center}
</style>
