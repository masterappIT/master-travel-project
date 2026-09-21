import { computed, ref } from 'vue'

const HOME_PATH = '/pages/index/index'
const ORDER_RETURN_TARGET_KEY = 'order-detail-return-target'
const EMBEDDED_LAUNCH_URL_KEY = 'embedded-launch-url'
let embeddedHostActive = false
let lastEmbeddedLaunchUrl = ''
export const pagePath = (url: string) => url.split('?')[0]

const parseQuery = (url = ''): Record<string, string> => {
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : ''
  return Object.fromEntries(query.split('&').filter(Boolean).map((pair) => {
    const [key, ...value] = pair.split('=')
    return [decodeURIComponent(key), decodeURIComponent(value.join('=') || '')]
  }))
}

export type OrderReturnTarget = 'profile' | 'orders'

export const setOrderReturnTarget = (target: OrderReturnTarget) => {
  uni.setStorageSync(ORDER_RETURN_TARGET_KEY, target)
}

export const getOrderReturnTarget = (): OrderReturnTarget | '' => {
  const target = uni.getStorageSync(ORDER_RETURN_TARGET_KEY)
  return target === 'profile' || target === 'orders' ? target : ''
}

export const cachedPageUrl = ref(HOME_PATH)
export const cachedPagePath = computed(() => pagePath(cachedPageUrl.value))
export const isCachedPageActive = (path: string) => !embeddedHostActive || cachedPagePath.value === path
export const cachedPageStack = ref<string[]>([HOME_PATH])
const cachedVisitedPages = ref<string[]>([HOME_PATH])
export const visitedPages = computed(() => new Set(cachedVisitedPages.value))

const persistEmbeddedLaunchUrl = (url: string) => {
  const targetPath = pagePath(url)
  cachedPageStack.value = targetPath === HOME_PATH ? [HOME_PATH] : [HOME_PATH, url]
  cachedPageUrl.value = url
  if (!cachedVisitedPages.value.includes(targetPath)) {
    cachedVisitedPages.value = [...cachedVisitedPages.value, targetPath]
  }
  try { uni.setStorageSync(EMBEDDED_LAUNCH_URL_KEY, url) } catch {}
}

const consumeEmbeddedLaunchUrl = () => {
  let url = cachedPageUrl.value !== HOME_PATH ? cachedPageUrl.value : ''
  try {
    url = uni.getStorageSync(EMBEDDED_LAUNCH_URL_KEY) || url
    uni.removeStorageSync(EMBEDDED_LAUNCH_URL_KEY)
  } catch {}
  return url
}

export const getCachedPageUrl = () => cachedPageUrl.value
export const getCachedPageOrderQuery = (url = cachedPageUrl.value) => parseQuery(url)
export const getCachedPageSource = (url = cachedPageUrl.value) => {
  const query = parseQuery(url)
  return query.from || query.returnTo || ''
}
export const getCachedPagePreviousPath = (targetPath: string) => {
  const index = cachedPageStack.value.findIndex((entry) => pagePath(entry) === targetPath)
  return index > 0 ? pagePath(cachedPageStack.value[index - 1]) : ''
}

export const activateEmbeddedPageHost = () => {
  if (embeddedHostActive) return

  embeddedHostActive = true
  const launchUrl = consumeEmbeddedLaunchUrl()
  cachedPageStack.value = launchUrl && pagePath(launchUrl) !== HOME_PATH
    ? [HOME_PATH, launchUrl]
    : [HOME_PATH]
  cachedPageUrl.value = cachedPageStack.value[cachedPageStack.value.length - 1] || HOME_PATH
  cachedVisitedPages.value = Array.from(new Set([
    HOME_PATH,
    ...cachedPageStack.value.map((entry) => pagePath(entry)),
  ]))
}

export const deactivateEmbeddedPageHost = () => {
  embeddedHostActive = false
}

export const replaceCachedPage = (url: string) => {
  // #ifdef MP-WEIXIN || MP-TOUTIAO
  if (embeddedHostActive) {
    if (cachedPageStack.value.length > 1) {
      cachedPageStack.value = [...cachedPageStack.value.slice(0, -1), url]
    } else {
      cachedPageStack.value = [HOME_PATH, url]
    }
    cachedPageUrl.value = url
    const targetPath = pagePath(url)
    if (!cachedVisitedPages.value.includes(targetPath)) {
      cachedVisitedPages.value = [...cachedVisitedPages.value, targetPath]
    }
    return
  }
  // #endif

  return uni.redirectTo({ url, animationType: 'none', animationDuration: 0 })
}

export const openCachedPage = (url: string) => {
  // #ifdef MP-WEIXIN || MP-TOUTIAO
  if (!embeddedHostActive) {
    persistEmbeddedLaunchUrl(url)
    return uni.reLaunch({ url: HOME_PATH, animationType: 'none', animationDuration: 0 })
  }

  if (embeddedHostActive) {
    const targetPath = pagePath(url)
    const targetIndex = cachedPageStack.value.findIndex((entry) => pagePath(entry) === targetPath)

    if (targetIndex >= 0) {
      cachedPageStack.value = [...cachedPageStack.value.slice(0, targetIndex), url]
    } else {
      cachedPageStack.value = [...cachedPageStack.value, url]
    }

    cachedPageUrl.value = url
    if (!cachedVisitedPages.value.includes(targetPath)) {
      cachedVisitedPages.value = [...cachedVisitedPages.value, targetPath]
    }
    return
  }
  // #endif

  const targetPath = pagePath(url)
  const pages = getCurrentPages()
  const targetIndex = pages.findIndex((page) => `/${page.route}` === targetPath)

  if (targetIndex >= 0) {
    const delta = pages.length - 1 - targetIndex
    if (delta > 0) return uni.navigateBack({ delta, animationType: 'none', animationDuration: 0 })
    // The same detail route can represent different independent states.
    // Replace it so a completed page cannot retain the pending query (or vice versa).
    return uni.redirectTo({ url, animationType: 'none', animationDuration: 0 })
  }

  return uni.navigateTo({ url, animationType: 'none', animationDuration: 0 })
}

export const returnToBookingSuccess = (url: string) => {
  const targetPath = pagePath(url)
  if (targetPath !== '/pages/vehicles/booking-success') return openCachedPage(url)

  // #ifdef MP-WEIXIN || MP-TOUTIAO
  if (embeddedHostActive) {
    // A completed booking is a terminal flow. Rebuild the embedded stack from
    // the host root so stale vehicle-selection pages cannot become reachable.
    cachedPageStack.value = [HOME_PATH, url]
    cachedPageUrl.value = url
    if (!cachedVisitedPages.value.includes(targetPath)) {
      cachedVisitedPages.value = [...cachedVisitedPages.value, targetPath]
    }
    return
  }
  // #endif

  return openCachedPage(url)
}

export const redirectEmbeddedLaunch = (path = '', query: Record<string, unknown> = {}) => {
  // #ifdef MP-WEIXIN || MP-TOUTIAO
  const targetPath = path.startsWith('/') ? path : `/${path}`
  if (!targetPath || targetPath === '/' || targetPath === HOME_PATH || targetPath.startsWith('/pages/login/')) return false
  const queryString = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  const launchUrl = `${targetPath}${queryString ? `?${queryString}` : ''}`
  if (launchUrl === lastEmbeddedLaunchUrl && !embeddedHostActive) return true
  lastEmbeddedLaunchUrl = launchUrl
  persistEmbeddedLaunchUrl(launchUrl)
  uni.reLaunch({ url: HOME_PATH, animationType: 'none', animationDuration: 0 })
  return true
  // #endif
  return false
}

export const goHome = () => {
  // #ifdef MP-WEIXIN || MP-TOUTIAO
  if (embeddedHostActive) {
    cachedPageStack.value = [HOME_PATH]
    cachedPageUrl.value = HOME_PATH
    return
  }
  // #endif

  return uni.reLaunch({ url: HOME_PATH, animationType: 'none', animationDuration: 0 })
}

export const closeCachedPage = (fallbackUrl: string) => {
  const fallbackPath = pagePath(fallbackUrl)

  // #ifdef MP-WEIXIN || MP-TOUTIAO
  if (embeddedHostActive) {
    const fallbackIndex = cachedPageStack.value.findIndex((entry) => pagePath(entry) === fallbackPath)

    if (fallbackIndex >= 0) {
      cachedPageStack.value = cachedPageStack.value.slice(0, fallbackIndex + 1)
      cachedPageUrl.value = cachedPageStack.value[cachedPageStack.value.length - 1]
      return
    }

    if (fallbackPath !== HOME_PATH) {
      return openCachedPage(fallbackUrl)
    }

    if (cachedPageStack.value.length > 1) {
      cachedPageStack.value = cachedPageStack.value.slice(0, -1)
      cachedPageUrl.value = cachedPageStack.value[cachedPageStack.value.length - 1]
      return
    }
  }
  // #endif

  if (fallbackPath && fallbackPath !== HOME_PATH) {
    const pages = getCurrentPages()
    const hasTargetPage = pages.some((page) => `/${page.route}` === fallbackPath)
    if (hasTargetPage || pages.length <= 1) {
      return openCachedPage(fallbackUrl)
    }
  }

  if (getCurrentPages().length > 1) {
    return uni.navigateBack({ delta: 1, animationType: 'none', animationDuration: 0 })
  }
  return openCachedPage(fallbackUrl)
}

export const swipeBack = () => {
  // #ifdef MP-WEIXIN || MP-TOUTIAO
  if (embeddedHostActive) {
    if (cachedPageStack.value.length <= 1) return
    cachedPageStack.value = cachedPageStack.value.slice(0, -1)
    cachedPageUrl.value = cachedPageStack.value[cachedPageStack.value.length - 1] || HOME_PATH
    return
  }
  // #endif

  if (getCurrentPages().length > 1) {
    return uni.navigateBack({ delta: 1, animationType: 'none', animationDuration: 0 })
  }
}
