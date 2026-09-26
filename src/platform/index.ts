export type Platform = 'app' | 'weixin' | 'alipay' | 'toutiao' | 'xhs'

const getUniPlatform = (): string | undefined => {
  try {
    if (typeof uni === 'undefined') return undefined
    const systemInfo = typeof uni.getSystemInfoSync === 'function' ? uni.getSystemInfoSync() : undefined
    return systemInfo?.uniPlatform
  } catch {
    return undefined
  }
}

export function getPlatform(): Platform {
  // uni-app compiles this module per target; keep platform differences behind one API.
  const platform = getUniPlatform() ?? 'app'
  return platform === 'mp-weixin' ? 'weixin' : platform === 'mp-alipay' ? 'alipay' : platform === 'mp-toutiao' ? 'toutiao' : platform === 'mp-xhs' ? 'xhs' : 'app'
}

export function isIosApp(): boolean {
  try {
    if (typeof uni === 'undefined' || typeof uni.getSystemInfoSync !== 'function') return false
    const systemInfo = uni.getSystemInfoSync()
    return systemInfo?.uniPlatform === 'app' && String(systemInfo?.osName || '').toLowerCase() === 'ios'
  } catch {
    return false
  }
}
