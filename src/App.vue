<template>
  <view class="app-shell" @touchstart="handleTouchStart" @touchend="handleTouchEnd">
    <slot />
    <view class="currency-switch" @tap.stop><text class="currency-label">{{ label }}</text><view class="currency-options"><view class="currency-option" :class="{ active: currency === 'HKD' }" @tap.stop="switchCurrency('HKD')">HKD</view><view class="currency-option" :class="{ active: currency === 'RMB' }" @tap.stop="switchCurrency('RMB')">RMB</view></view></view>
    <view v-if="showSplash" class="splash-screen" :class="{ 'splash-leaving': splashLeaving }" aria-label="Master Travel Project 啟動畫面">
      <image class="splash-circle splash-circle-left" src="/static/splash/ellipse-left.svg" mode="aspectFit" />
      <image class="splash-circle splash-circle-right" src="/static/splash/ellipse-right.svg" mode="aspectFit" />
      <image class="splash-wave" src="/static/splash/wave.svg" mode="scaleToFill" />
      <image class="splash-wave-bottom" src="/static/splash/wave-bottom.svg" mode="scaleToFill" />
      <image class="splash-logo" src="/static/splash/launch.png" mode="widthFix" />
    </view>
  </view>
</template>

<script>
import { swipeBack } from './utils/navigation'

import { useCurrency } from './composables/useCurrency'

export default {
  data() {
    const { currency, label, loadSettings, setCurrency } = useCurrency()
    loadSettings()
    // The mini-program page host can remain mounted while App.vue lifecycle
    // hooks are deferred, so the splash must not cover native pages there.
    const initialShowSplash = typeof window !== 'undefined' || typeof uni !== 'undefined' && uni.getSystemInfoSync?.().uniPlatform === 'app'
    return { showSplash: initialShowSplash, splashLeaving: false, swipeStartX: 0, swipeStartY: 0, currency, label, switchCurrency: setCurrency }
  },
  methods: {
    handleTouchStart(event) {
      const touch = event.touches?.[0]
      if (touch) {
        this.swipeStartX = touch.clientX
        this.swipeStartY = touch.clientY
      }
    },
    handleTouchEnd(event) {
      const touch = event.changedTouches?.[0]
      if (!touch || this.swipeStartX > 32 || touch.clientX - this.swipeStartX < 80 || Math.abs(touch.clientY - this.swipeStartY) > 60) return
      this.swipeStartX = 999
      swipeBack()
    },
  },
  onLaunch() {
    console.log('App Launch')
  },
  mounted() {
    // H5 routed pages may be mounted outside the App.vue shell.
    // Keep the shell listeners for native targets and mirror them at document level on H5.
    // #ifdef H5
    document.addEventListener('touchstart', this.handleTouchStart, { passive: true })
    document.addEventListener('touchend', this.handleTouchEnd, { passive: true })
    // #endif
    setTimeout(() => {
      this.splashLeaving = true
      setTimeout(() => {
        this.showSplash = false
      }, 280)
    }, 1900)
  },
  beforeUnmount() {
    // #ifdef H5
    document.removeEventListener('touchstart', this.handleTouchStart)
    document.removeEventListener('touchend', this.handleTouchEnd)
    // #endif
  },
  onShow() {
    console.log('App Show')
  },
  onHide() {
    console.log('App Hide')
  },
}
</script>

<style>
page,
body,
#app {
  width: 100%;
  min-width: 0;
  max-width: none;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.currency-switch { position: fixed; z-index: 10000; top: 18px; right: 18px; display: flex; align-items: center; gap: 8px; padding: 5px 7px 5px 10px; border-radius: 18px; background: rgba(37,41,47,.82); color: #fff; font-size: 11px; }
.currency-options { display: flex; gap: 2px; padding: 2px; border-radius: 14px; background: rgba(255,255,255,.16); }
.currency-option { display: block; padding: 3px 6px; border-radius: 10px; color: #d9d9d9; }
.currency-option.active { background: #1effaa; color: #25292f; font-weight: 700; }

.app-shell {
 position: fixed;
  inset: 0;
 width: 100%;
  max-width: none;
  height: 100vh;
  height: 100vh;
  min-height: 100vh;
  box-sizing: border-box;
  background: #56657e;
  overflow: hidden;
  overscroll-behavior: none;
  touch-action: pan-y;
}
.splash-screen {
  width: 100%;
  min-height: 100vh;
}
.splash-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  overflow: hidden;
  background: #56657e;
  animation: splash-enter 300ms ease-out both;
  transition: opacity 280ms ease-in-out, transform 280ms ease-in-out;
}
.splash-screen.splash-leaving {
  opacity: 0;
  transform: scale(1.015);
  pointer-events: none;
}
.splash-screen::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.04);
  animation: splash-shimmer 1.8s ease-in-out infinite alternate;
}
.splash-circle {
  animation: splash-float 2.4s ease-in-out infinite alternate;
}
.splash-wave {
  animation: splash-wave 2.8s ease-in-out infinite alternate;
}
.splash-wave-bottom {
  animation: splash-wave-bottom 2.2s ease-in-out infinite alternate;
}
.splash-logo {
  animation: splash-logo 900ms ease-out both;
}
@keyframes splash-enter {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes splash-shimmer {
  from { opacity: 0.35; }
  to { opacity: 1; }
}
@keyframes splash-float {
  from { transform: translateY(0); }
  to { transform: translateY(-8px); }
}
@keyframes splash-wave {
  from { transform: translateX(-50%) translateY(0); }
  to { transform: translateX(-50%) translateY(-10px); }
}
@keyframes splash-wave-bottom {
  from { transform: translateX(-50%) translateY(0); }
  to { transform: translateX(-50%) translateY(-5px); }
}
@keyframes splash-logo {
  from { opacity: 0; transform: translate(-50%, -46%) scale(0.92); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
.splash-circle,
.splash-wave,
.splash-wave-bottom,
.splash-logo {
  position: absolute;
  display: block;
}
.splash-circle {
  width: 211px;
  height: 211px;
}
.splash-circle-left {
  left: -76px;
  top: 255px;
}
.splash-circle-right {
  right: -67px;
  top: 466px;
}
.splash-wave {
  left: 50%;
  bottom: 0;
  width: 430px;
  height: 204px;
  transform: translateX(-50%);
}
.splash-wave-bottom {
  left: 50%;
  bottom: 0;
  width: 430px;
  height: 74px;
  transform: translateX(-50%);
}
.splash-logo {
  left: 50%;
  top: 50%;
  width: 250px;
  height: auto;
  transform: translate(-50%, -50%);
}
</style>
