export function normalizeTripDetail(detail) {
  if (!detail || typeof detail !== 'object') return detail
  return {
    ...detail,
    quote: detail.quote && typeof detail.quote === 'object'
      ? { ...detail.quote, lines: Array.isArray(detail.quote.lines) ? detail.quote.lines : [] }
      : detail.quote
  }
}

export function createTripsActions({ api, tripsApi, addressesApi, tripForm, selectedTrip, tripQuote, tripBookingStep, tripPaymentMethod, tripUseFareBalance, tripUseCashBalance, tripLocationKeyword, tripLocationResults, tripLocationSearching, tripLocationTarget, dispatchForm, orderUrlForm, createdOrderUrl, users, trips, error, load, loadUserOptions, loadDriverOptions, displayError, canWrite, requestConfirmation, notify, tripCatalog, dateTimeInput }) {
  async function settleTrip(item, method) { if (!canWrite.value || !item?.id || !method?.trim()) return; try { await tripsApi.settle(item.id, method.trim()); await load(); selectedTrip.value = trips.value.find(trip => trip.id === item.id) || null } catch (err) { error.value = displayError(err) } }
  async function unsettleTrip(item) { if (!canWrite.value || !item?.id) return; try { await tripsApi.unsettle(item.id); await load(); selectedTrip.value = trips.value.find(trip => trip.id === item.id) || null } catch (err) { error.value = displayError(err) } }
  function clearTripLocationSearch() {
    tripLocationKeyword.value = ''
    tripLocationResults.value = []
    tripLocationTarget.value = 'origin'
  }

  async function editTrip(item) {
    try {
      const detail = await tripsApi.get(item.id)
      await loadUserOptions(detail.userId)
      selectedTrip.value = null
      tripForm.value = { ...detail, scheduledAt: dateTimeInput(detail.scheduledAt) }
      clearTripLocationSearch()
    } catch (err) { error.value = displayError(err) }
  }
  async function resetTrip() {
    await loadUserOptions()
    selectedTrip.value = null
    tripForm.value = { id: '', userId: users.value[0]?.id || '', origin: '', destination: '', originLatitude: '', originLongitude: '', destinationLatitude: '', destinationLongitude: '', originCity: '', destinationCity: '', distanceMeters: 0, categoryId: '', vehicleId: '', extraIds: [], region: 'GUANGDONG', scheduledAt: dateTimeInput(new Date(Date.now() + 3600000).toISOString()), status: 'PENDING' }
    tripQuote.value = null
    tripBookingStep.value = 'details'
    clearTripLocationSearch()
  }
  async function searchTripLocation(target) {
    const keyword = tripLocationKeyword.value.trim()
    if (!keyword || tripLocationSearching.value || !tripForm.value) return
    tripLocationTarget.value = target; tripLocationSearching.value = true; error.value = ''
    try {
      const region = tripForm.value.region === 'HK' ? '香港' : tripForm.value.region === 'MACAU' ? '澳門' : '大陸'
      const result = await addressesApi.search(keyword, region)
      tripLocationResults.value = result.data || []
    } catch (err) { tripLocationResults.value = []; error.value = displayError(err) } finally { tripLocationSearching.value = false }
  }
  function selectTripLocation(item) {
    if (!tripForm.value) return
    const target = tripLocationTarget.value
    tripForm.value[target] = item.displayAddress || item.address || item.name
    tripForm.value[`${target}Latitude`] = item.latitude ?? item.lat ?? ''
    tripForm.value[`${target}Longitude`] = item.longitude ?? item.lng ?? ''
    tripForm.value[`${target}City`] = item.city || item.district || ''
    tripLocationKeyword.value = ''; tripLocationResults.value = []
  }
  function handleTripRegionChange() { clearTripLocationSearch() }
  async function showTrip(item) {
    try {
      tripForm.value = null
      selectedTrip.value = normalizeTripDetail(await tripsApi.get(item.id))
    } catch (err) { error.value = displayError(err) }
  }
  function closeTrip() { selectedTrip.value = null }
  async function updateTripStatus(item, status) {
    const currentStatus = item.executionPhase === 'IN_PROGRESS' ? 'IN_PROGRESS' : item.status
    if (!canWrite.value || currentStatus === status) return
    const payload = status === 'IN_PROGRESS'
      ? { ...item, status: 'CONFIRMED', executionPhase: 'IN_PROGRESS' }
      : { ...item, status, executionPhase: status === 'CONFIRMED' ? (item.executionPhase === 'IN_PROGRESS' ? 'WAITING_DRIVER' : item.executionPhase) : null }
    try { await tripsApi.update(item.id, payload); await load(); selectedTrip.value = trips.value.find(trip => trip.id === item.id) || null } catch (err) { error.value = displayError(err) }
  }
  async function prepareTripQuote() {
    if (!tripForm.value || tripForm.value.id) return
    const vehicle = tripCatalog.value.data.find(item => item.id === tripForm.value.vehicleId)
    const categoryId = tripForm.value.categoryId || vehicle?.categoryId
    if (!categoryId || !tripForm.value.distanceMeters) { error.value = '請先搜尋並選擇完整路線，再選擇車型'; return }
    try {
      tripQuote.value = await api('/quotes', { method: 'POST', body: JSON.stringify({ categoryId, vehicleId: tripForm.value.vehicleId, distanceMeters: Number(tripForm.value.distanceMeters), durationSeconds: Number(tripForm.value.durationSeconds || 0), extraIds: tripForm.value.extraIds || [], displayCurrency: 'RMB', userId: tripForm.value.userId, originRegion: tripForm.value.region === 'HK' ? '香港' : tripForm.value.region === 'MACAU' ? '澳門' : '大陸', destinationRegion: tripForm.value.region === 'HK' ? '香港' : tripForm.value.region === 'MACAU' ? '澳門' : '大陸', originCity: tripForm.value.originCity || '', destinationCity: tripForm.value.destinationCity || '', scheduledAt: tripForm.value.scheduledAt }) })
      tripBookingStep.value = 'payment'; error.value = ''
    } catch (err) { error.value = displayError(err) }
  }
  async function calculateTripRoute() {
    if (!tripForm.value?.originLatitude || !tripForm.value?.destinationLatitude) { error.value = '請先從搜尋結果選擇出發地及目的地'; return }
    try {
      const route = await api(`/location/driving-route?origin=${tripForm.value.originLongitude},${tripForm.value.originLatitude}&destination=${tripForm.value.destinationLongitude},${tripForm.value.destinationLatitude}`)
      tripForm.value.distanceMeters = Number(route.distance) || 0; error.value = ''
    } catch (err) { error.value = displayError(err) }
  }
  async function completeTripBooking() {
    if (!tripQuote.value || !tripForm.value) return
    try {
      const result = await api('/payments/trip-pay', { method: 'POST', body: JSON.stringify({ userId: tripForm.value.userId, quoteId: tripQuote.value.id, useFareBalance: tripUseFareBalance.value, useCashBalance: tripUseCashBalance.value, externalPaymentMethod: tripPaymentMethod.value === 'sandbox' ? 'sandbox' : tripPaymentMethod.value, origin: tripForm.value.origin, destination: tripForm.value.destination, scheduledAt: tripForm.value.scheduledAt }) })
      tripForm.value = null; tripQuote.value = null; tripBookingStep.value = 'details'; await load(); selectedTrip.value = trips.value.find(trip => trip.id === result?.tripId) || null
    } catch (err) { error.value = displayError(err) }
  }
  async function saveTrip() { if (!tripForm.value) return; if (!tripForm.value.id) return prepareTripQuote(); try { await tripsApi.update(tripForm.value.id, tripForm.value); tripForm.value = null; await load() } catch (err) { error.value = displayError(err) } }
  async function openDispatch(item) {
    const tripId = item?.id
    if (!tripId) return
    try {
      const latest = await tripsApi.get(tripId)
      await loadDriverOptions(latest.driverId)
      const index = trips.value.findIndex(trip => trip.id === tripId)
      if (index >= 0) trips.value[index] = latest
      dispatchForm.value = { tripId, driverId: latest.driverId || '', driverPayoutAmount: latest.driverPayoutAmount ?? latest.driverPayoutCalculatedAmount ?? '', driverPayoutCurrency: latest.driverPayoutCurrency || latest.payment?.currency || '' }
    } catch (err) { error.value = displayError(err) }
  }
  async function saveDispatch() { if (!dispatchForm.value?.tripId || !dispatchForm.value.driverId || dispatchForm.value.driverPayoutAmount === '') return; try { await tripsApi.dispatch(dispatchForm.value.tripId, { driverId: dispatchForm.value.driverId, driverPayoutAmount: Number(dispatchForm.value.driverPayoutAmount) }); dispatchForm.value = null; await load() } catch (err) { error.value = displayError(err) } }
  async function openOrderUrlForm(item) { await loadDriverOptions(item.driverId); const now = new Date(); const later = new Date(now.getTime() + 24 * 60 * 60 * 1000); orderUrlForm.value = { tripId: item.id, driverId: item.driverId || '', validFrom: dateTimeInput(now.toISOString()), validUntil: dateTimeInput(later.toISOString()) } }
  async function createOrderUrl() {
    if (!orderUrlForm.value?.tripId || !orderUrlForm.value.validFrom || !orderUrlForm.value.validUntil) return
    if (new Date(orderUrlForm.value.validUntil) <= new Date(orderUrlForm.value.validFrom)) { error.value = '失效日期必須晚於有效日期'; return }
    try { const result = await tripsApi.createOrderUrl(orderUrlForm.value.tripId, orderUrlForm.value); createdOrderUrl.value = result.url; try { await navigator.clipboard?.writeText(result.url) } catch {}; orderUrlForm.value = null; await load() } catch (err) { error.value = displayError(err) }
  }
  function closeCreatedOrderUrl() { createdOrderUrl.value = '' }
  async function copyOrderUrl() { if (!createdOrderUrl.value) return; try { await navigator.clipboard.writeText(createdOrderUrl.value) } catch { error.value = '複製 URL 失敗，請手動複製' } }
  async function revokeOrderUrl(item) { if (!await requestConfirmation({ title: '撤銷訂單 URL', message: '確定要撤銷此訂單 URL？', confirmLabel: '撤銷', danger: true })) return; try { await tripsApi.revokeOrderUrl(item.tripId, item.id); notify('訂單 URL 已撤銷'); await load() } catch (err) { error.value = displayError(err); notify(error.value, 'error') } }
  return { editTrip, resetTrip, clearTripLocationSearch, searchTripLocation, selectTripLocation, handleTripRegionChange, showTrip, closeTrip, updateTripStatus, settleTrip, unsettleTrip, prepareTripQuote, calculateTripRoute, completeTripBooking, saveTrip, openDispatch, saveDispatch, openOrderUrlForm, createOrderUrl, closeCreatedOrderUrl, copyOrderUrl, revokeOrderUrl }
}
