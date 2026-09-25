export function normalizeTripDetail(detail) {
  if (!detail || typeof detail !== 'object') return detail
  return {
    ...detail,
    quote: detail.quote && typeof detail.quote === 'object'
      ? { ...detail.quote, lines: Array.isArray(detail.quote.lines) ? detail.quote.lines : [] }
      : detail.quote
  }
}

export function createTripDetailController({ tripsApi, selectedTrip, loading, error, selectedId, displayError }) {
  let requestSequence = 0

  async function open(item) {
    const tripId = item?.id
    if (!tripId) return

    const request = ++requestSequence
    selectedId.value = tripId
    selectedTrip.value = null
    error.value = ''
    loading.value = true

    try {
      const detail = normalizeTripDetail(await tripsApi.get(tripId))
      if (request !== requestSequence) return
      selectedTrip.value = detail
    } catch (cause) {
      if (request !== requestSequence) return
      error.value = displayError(cause)
    } finally {
      if (request === requestSequence) loading.value = false
    }
  }

  function close() {
    requestSequence += 1
    selectedTrip.value = null
    loading.value = false
    error.value = ''
    selectedId.value = ''
  }

  function retry() {
    return open({ id: selectedId.value })
  }

  return { open, close, retry }
}
