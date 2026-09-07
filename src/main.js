import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const safeSystemInfo = () => ({
  windowWidth: 375,
  windowHeight: 667,
  pixelRatio: 2,
  platform: 'ios',
  screenWidth: 375,
  screenHeight: 667,
  statusBarHeight: 20,
  safeArea: {
    left: 0,
    right: 375,
    top: 20,
    bottom: 667,
    width: 375,
    height: 647
  },
  model: '',
  system: 'iOS 17.0',
  version: '8.0.0'
})

const installSafeWxSystemInfo = () => {
  if (typeof wx === 'undefined') return

  const fallback = safeSystemInfo()

  const patch = (name, getter) => {
    const original = wx[name]
    if (typeof original === 'function') {
      wx[name] = function safeWrappedSystemInfo(...args) {
        try {
          return original.apply(this, args)
        } catch {
          return getter()
        }
      }
      return
    }
    wx[name] = getter
  }

  patch('getSystemInfoSync', () => fallback)
  patch('getWindowInfo', () => ({
    windowWidth: fallback.windowWidth,
    windowHeight: fallback.windowHeight,
    pixelRatio: fallback.pixelRatio
  }))
  patch('getDeviceInfo', () => ({
    platform: fallback.platform,
    system: fallback.system,
    model: fallback.model
  }))
}

installSafeWxSystemInfo()

export function createApp() {
  const app = createSSRApp(App)
  app.use(createPinia())
  return { app }
}
