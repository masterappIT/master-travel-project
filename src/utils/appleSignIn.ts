import { getAppleWebConfig } from '../services/api'

type ApplePassengerWindow = typeof globalThis & {
  passengerAppleSignIn?: (clientId: string, redirectUri: string) => Promise<string>
}

// Apple Sign In 僅在 H5（透過 Apple JS SDK）與 APP-PLUS iOS（原生 ASAuthorizationAppleIDProvider）可用；
// 小程序運行在 WeChat 內嵌 webview，無法載入 Apple JS SDK 或呼叫原生 API，因此不支援。
export function isAppleSignInSupported(): boolean {
  // #ifdef H5
  return true
  // #endif
  // #ifdef APP-PLUS
  return uni.getSystemInfoSync().platform === 'ios'
  // #endif
  return false
}

export async function signInWithApple(): Promise<string> {
  if (!isAppleSignInSupported()) throw new Error('目前平台不支援 Apple 登入')
  // #ifdef H5
  const config = await getAppleWebConfig()
  const globalWindow = typeof globalThis !== 'undefined' ? (globalThis as ApplePassengerWindow) : undefined
  if (!globalWindow?.passengerAppleSignIn) throw new Error('Apple 登入功能尚未就緒，請稍後再試')
  const identityToken = await globalWindow.passengerAppleSignIn(config.clientId, config.redirectUri)
  if (!identityToken) throw new Error('Apple 授權未完成')
  return identityToken
  // #endif
  // #ifdef APP-PLUS
  const loginRes = await new Promise<{ authResult?: { identityToken?: string } }>((resolve, reject) => {
    uni.login({ provider: 'apple', success: resolve as (result: UniApp.LoginRes) => void, fail: reject })
  })
  const identityToken = loginRes.authResult?.identityToken
  if (!identityToken) throw new Error('Apple 授權未完成')
  return identityToken
  // #endif
  throw new Error('目前平台不支援 Apple 登入')
}
