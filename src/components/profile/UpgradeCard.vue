<template><view class="upgrade card" @tap="$emit('tap')"><image src="/static/profile/upgrade.svg" mode="aspectFit" /><text>{{ tx('升級會員') }}</text></view></template>
<script setup lang="ts">
import { tx } from '../../i18n'
defineEmits<{ tap: [] }>()</script>
<style scoped>.card{position:relative;background:#fff;border-radius:25px;box-sizing:border-box}.upgrade{height:65px;display:flex;align-items:center;padding-left:35px;gap:19px;box-shadow:0 4px 4px rgba(0,0,0,.25)}.upgrade image{width:34px;height:30px}.upgrade text{font-size:14px}</style>
