<template>
  <view class="orders-back-button" @tap="emit('tap')">
    <image :src="iconSrc" mode="aspectFit" />
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ iconSrc?: string }>(), {
  iconSrc: '/static/orders/header-decoration.svg'
})

const emit = defineEmits<{ tap: [] }>()
</script>

<style scoped>
/* Same geometry as components/common/PageNavBar: a 44 px tap area centred on --nav-center, with a 12×25 arrow. */
.orders-back-button {
  position: absolute;
  z-index: 2;
  top: calc(var(--nav-center, 79px) - 22px);
  left: 17px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orders-back-button image {
  width: 12px;
  height: 25px;
}
</style>
