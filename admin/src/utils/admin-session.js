export function createAdminSessionActions({ api, token, username, password, currentAdministrator, error, exchangeRate, adminLogo, view, load, displayError }) {
  async function apiLogin() {
    try {
      error.value = ''
      localStorage.removeItem('admin_token')
      token.value = ''
      const result = await api('/admin/auth/login', { method: 'POST', body: JSON.stringify({ username: username.value, password: password.value }) })
      token.value = result.token
      currentAdministrator.value = result.administrator
      localStorage.setItem('admin_token', token.value)
      password.value = ''
      load()
    } catch (e) {
      error.value = displayError(e)
    }
  }

  async function logout() {
    try {
      if (token.value) await api('/admin/auth/logout', { method: 'POST' })
    } catch {} finally {
      token.value = ''
      currentAdministrator.value = null
      localStorage.removeItem('admin_token')
      view.value = 'dashboard'
    }
  }

  async function saveExchangeRate() {
    const value = Number(exchangeRate.value)
    if (!Number.isFinite(value) || value <= 0) {
      error.value = 'Valid exchange rate required'
      return
    }
    try {
      await api('/settings', { method: 'POST', body: JSON.stringify({ exchangeRate: value }) })
      exchangeRate.value = value
    } catch (e) {
      error.value = displayError(e)
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

  return { apiLogin, logout, saveExchangeRate, uploadAdminLogo, removeAdminLogo }
}
