import { ref } from 'vue'

export function createFeedbackController() {
  const toasts = ref([])
  const confirmDialog = ref({ open: false, title: '', message: '', confirmLabel: '確認', cancelLabel: '取消', danger: false, action: null })
  let toastId = 0

  function dismissToast(id) {
    toasts.value = toasts.value.filter(item => item.id !== id)
  }

  function notify(message, type = 'success') {
    const id = ++toastId
    toasts.value.push({ id, message, type })
    window.setTimeout(() => dismissToast(id), 4000)
  }

  function requestConfirmation({ title = '確認操作', message, confirmLabel = '確認', cancelLabel = '取消', danger = false }) {
    return new Promise(resolve => {
      confirmDialog.value = { open: true, title, message, confirmLabel, cancelLabel, danger, action: resolve }
    })
  }

  function resolveConfirmation(confirmed) {
    const resolve = confirmDialog.value.action
    confirmDialog.value = { open: false, title: '', message: '', confirmLabel: '確認', cancelLabel: '取消', danger: false, action: null }
    resolve?.(confirmed)
  }

  return { toasts, confirmDialog, dismissToast, notify, requestConfirmation, resolveConfirmation }
}
