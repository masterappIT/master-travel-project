import { ref } from 'vue'

export function createAdminSessionState() {
  localStorage.removeItem('admin_token')
  return {
    token: ref(import.meta.env.DEV ? 'dev-bypass' : 'cookie-session'),
    locale: ref(localStorage.getItem('admin_locale') || 'en'),
    username: ref(''),
    password: ref(''),
    currentAdministrator: ref(null)
  }
}
