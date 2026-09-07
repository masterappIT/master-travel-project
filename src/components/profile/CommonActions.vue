<template><view class="common card"><view v-for="item in items" :key="item.label" class="common-item" @tap="$emit('select', item.label)"><image :src="item.icon" mode="aspectFit" /><text>{{ item.label }}</text></view></view></template>
<script setup lang="ts">
defineEmits<{ select: [label: string] }>()

const items = [
  { label: '常用資料', icon: '/static/profile/common-data.svg' },
  // #ifndef MP-WEIXIN || MP-TOUTIAO
  { label: '我的銀行卡', icon: '/static/profile/common-card.svg' },
  // #endif
  { label: '聯繫客服', icon: '/static/customer-service.svg' },
  { label: '邀請好友', icon: '/static/profile/common-invite.svg' },
  { label: '我的投訴', icon: '/static/profile/common-complaint.svg' }
]
</script>
<style scoped>.card{position:relative;background:#fff;border-radius:25px;box-sizing:border-box}.common{height:265px}.common-item{position:absolute;width:60px;height:49px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;font-size:12px;white-space:nowrap}.common-item image{width:30px;height:30px}.common-item:nth-child(1){left:23px;top:23px}.common-item:nth-child(2){left:117px;top:23px}.common-item:nth-child(3){left:215px;top:23px}.common-item:nth-child(4){left:317px;top:23px}.common-item:nth-child(5){left:23px;top:92px}</style>
