import { ref } from 'vue'

export function createAdminShellState() {
  return {
    view: ref('dashboard'),
    mobileNavOpen: ref(false),
    loading: ref(false),
    error: ref(''),
    dashboard: ref(null)
  }
}
