// A cold-started API takes several seconds to answer the first sign-in.
const slowSignInDelayMs = 1500

export function createAdminSessionActions({ api, token, username, password, signingIn, signInSlow, currentAdministrator, error, adminLogo, dashboard, dashboardUpdatedAt, dashboardRefreshFailed, view, load, displayError, t }) {
  async function apiLogin() {
    if (signingIn.value) return
    signingIn.value = true
    signInSlow.value = false
    const slowTimer = setTimeout(() => { signInSlow.value = true }, slowSignInDelayMs)
    try {
      error.value = ''
      token.value = ''
      dashboard.value = null
      dashboardUpdatedAt.value = null
      dashboardRefreshFailed.value = false
      const result = await api('/admin/auth/login', { method: 'POST', body: JSON.stringify({ username: username.value, password: password.value }) })
      token.value = 'cookie-session'
      currentAdministrator.value = result.administrator
      password.value = ''
      load()
    } catch (e) {
      // The login endpoint answers 401 for wrong credentials and locked accounts alike; there is no session to expire yet.
      error.value = e?.status === 401 ? t('invalidCredentials') : displayError(e)
    } finally {
      clearTimeout(slowTimer)
      signingIn.value = false
      signInSlow.value = false
    }
  }

  async function logout() {
    try {
      if (token.value) await api('/admin/auth/logout', { method: 'POST' })
    } catch {} finally {
      token.value = ''
      currentAdministrator.value = null
      dashboard.value = null
      dashboardUpdatedAt.value = null
      dashboardRefreshFailed.value = false
      view.value = 'dashboard'
    }
  }

  async function uploadAdminLogo(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      error.value = 'Logo 只支援 PNG、JPEG 或 WebP'
      return
    }
    if (file.size > 1024 * 1024) {
      error.value = 'Logo 檔案不可超過 1 MB'
      return
    }
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const settings = await api('/settings', { method: 'POST', body: JSON.stringify({ adminLogo: dataUrl }) })
      adminLogo.value = settings.adminLogo || ''
      error.value = ''
    } catch (e) {
      error.value = displayError(e.message || 'Logo 上傳失敗')
    }
  }

  async function removeAdminLogo() {
    try {
      const settings = await api('/settings', { method: 'POST', body: JSON.stringify({ adminLogo: null }) })
      adminLogo.value = settings.adminLogo || ''
    } catch (e) {
      error.value = displayError(e)
    }
  }

  return { apiLogin, logout, uploadAdminLogo, removeAdminLogo }
}
