<template><view class="bottom-bar"><view class="nav-link" @tap="$emit('home')"><image src="/static/profile/nav-home.svg" mode="aspectFit" /></view><view class="nav-link active"><image src="/static/profile/nav-trips.svg" mode="aspectFit" /></view><view class="nav-link" @tap="$emit('service')"><image src="/static/profile/nav-service.svg" mode="aspectFit" /></view></view></template>
<script setup lang="ts">defineEmits<{ home: []; service: [] }>()</script>
<style scoped>.bottom-bar{position:absolute;bottom:0;left:0;width:430px;height:102px;padding:10px;box-sizing:border-box;background:#fff;border-radius:0 0 22px 22px;display:flex;align-items:center;justify-content:center;gap:60px}
/* #ifdef H5 */
.bottom-bar{border-radius:0}
/* #endif */
.nav-link{width:28px;height:28px}.nav-link image{width:28px;height:28px}.active{opacity:1}</style>
