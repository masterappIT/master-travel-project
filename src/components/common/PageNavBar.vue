<template>
  <view class="page-nav-back" role="button" :aria-label="tx('返回')" @tap.stop="emit('back')">
    <image class="page-nav-back-icon" src="/static/messages/back.svg" mode="aspectFit" />
  </view>
  <text v-if="title" class="page-nav-title">{{ tx(title) }}</text>
</template>
<script setup lang="ts">
import { tx } from '../../i18n'

// The one back button and title used by page headers. Placed inside the page's own header, it positions itself
// against `--nav-center` (see composables/useNavBar), so every page lines up the same way on every device.
// Keep it free of per-page options: a page whose header needs to look different should not use this component
// but style its own back button to the same specification (scripts/check-passenger-nav.mjs keeps those in line).
withDefaults(defineProps<{ title?: string }>(), { title: '' })
const emit = defineEmits<{ back: [] }>()
</script>
<style scoped>
.page-nav-back{position:absolute;z-index:2;top:calc(var(--nav-center, 79px) - 22px);left:17px;width:44px;height:44px;display:flex;align-items:center;justify-content:center}
.page-nav-back-icon{width:12px;height:25px}
.page-nav-title{position:absolute;top:calc(var(--nav-center, 79px) - 13px);left:50%;max-width:230px;overflow:hidden;transform:translateX(-50%);font-size:18px;font-weight:500;line-height:26px;white-space:nowrap;text-overflow:ellipsis}
</style>
