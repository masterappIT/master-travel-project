<template>
  <view
    class="setting-switch"
    :class="{ on: modelValue, disabled }"
    role="switch"
    :aria-checked="modelValue"
    :aria-disabled="disabled"
    :aria-label="tx(label)"
    @tap="toggle"
  >
    <view class="setting-switch-knob" />
  </view>
</template>
<script setup lang="ts">
import { tx } from '../../i18n'
const props = withDefaults(defineProps<{ modelValue: boolean; label: string; disabled?: boolean }>(), { disabled: false })
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const toggle = () => { if (!props.disabled) emit('update:modelValue', !props.modelValue) }
</script>
<style scoped>
.setting-switch{position:relative;flex:none;width:46px;height:26px;border-radius:13px;background:#D9D9D9;transition:background .2s ease}
.setting-switch.on{background:#285CFC}
.setting-switch.disabled{opacity:.5}
.setting-switch-knob{position:absolute;top:2px;left:2px;width:22px;height:22px;border-radius:50%;background:#fff;transition:left .2s ease}
.setting-switch.on .setting-switch-knob{left:22px}
</style>
