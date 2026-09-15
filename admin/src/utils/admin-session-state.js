import { ref } from 'vue'

export function createAdminSessionState() {
  return {
    token: ref(import.meta.env.DEV ? 'dev-bypass' : (localStorage.getItem('admin_token') || '')),
    locale: ref(localStorage.getItem('admin_locale') || 'en'),
    username: ref(''),
    password: ref(''),
    currentAdministrator: ref(null)
  }
}
