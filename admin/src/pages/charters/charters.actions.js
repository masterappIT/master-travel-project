export function createCharterActions({ api, charterForm, load, error, displayError, dateTimeInput }) {
  async function updateCharterStatus(order, status) {
    try {
      await api(`/admin/charter-orders/${order.id}/status`, { method: 'POST', body: JSON.stringify({ status }) })
      await load()
    } catch (err) {
      error.value = displayError(err)
    }
  }

  function editCharter(item) {
    charterForm.value = { ...item, scheduledAt: dateTimeInput(item.scheduledAt) }
  }

  async function saveCharter() {
    try {
      await api(`/admin/charter-orders/${charterForm.value.id}`, { method: 'POST', body: JSON.stringify(charterForm.value) })
      charterForm.value = null
      await load()
    } catch (err) {
      error.value = displayError(err)
    }
  }

  return { updateCharterStatus, editCharter, saveCharter }
}
