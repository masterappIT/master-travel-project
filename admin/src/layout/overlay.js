import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'

export function createOverlayController({ confirmDialog, createdOrderUrl, orderUrlForm, dispatchForm, tripForm, selectedTrip, selectedUser, closeCreatedOrderUrl, closeTrip }) {
  let lastOverlayFocus = null

  const getFormOverlay = () => document.querySelector('.modal-backdrop [role="dialog"]')
  const focusFormOverlay = () => {
    const overlay = getFormOverlay()
    if (!overlay) return
    if (!lastOverlayFocus) lastOverlayFocus = document.activeElement
    const firstFocusable = overlay.querySelector('input, select, textarea, button, [tabindex]:not([tabindex="-1"])')
    nextTick(() => (firstFocusable || overlay).focus())
  }
  const restoreFormOverlayFocus = () => {
    const element = lastOverlayFocus
    lastOverlayFocus = null
    if (element && typeof element.focus === 'function') nextTick(() => element.focus())
  }
  const handleKeydown = event => {
    if (confirmDialog.value.open) return
    const overlay = getFormOverlay()
    if (!overlay) return
    if (event.key === 'Escape') {
      if (createdOrderUrl.value) { closeCreatedOrderUrl(); return }
      if (orderUrlForm.value) { orderUrlForm.value = null; return }
      if (dispatchForm.value) { dispatchForm.value = null; return }
      if (tripForm.value) { tripForm.value = null; return }
      if (selectedTrip.value) { closeTrip(); return }
      if (selectedUser.value) { selectedUser.value = null; return }
    }
    if (event.key !== 'Tab') return
    const focusable = [...overlay.querySelectorAll('input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.disabled && element.offsetParent !== null)
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  const syncScrollLock = () => {
    const hasOverlay = Boolean(confirmDialog.value.open || createdOrderUrl.value || orderUrlForm.value || dispatchForm.value || tripForm.value || selectedTrip.value || selectedUser.value)
    document.body.classList.toggle('overlay-open', hasOverlay)
    if (hasOverlay && !confirmDialog.value.open && getFormOverlay()) focusFormOverlay()
    if (!hasOverlay) restoreFormOverlayFocus()
  }

  onMounted(() => document.addEventListener('keydown', handleKeydown))
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown)
    document.body.classList.remove('overlay-open')
  })
  watch([() => confirmDialog.value.open, createdOrderUrl, orderUrlForm, dispatchForm, tripForm, selectedTrip, selectedUser], syncScrollLock)
}
