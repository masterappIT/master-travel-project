import { createTripDetailController } from './trip-detail.controller.js'

export function createTripsActions({ api, tripsApi, addressesApi, tripForm, selectedTrip, tripDetailLoading, tripDetailError, tripDetailId, tripQuote, tripVehicleCategoryId, tripBookingStep, tripPaymentMethod, tripPaymentAmount, tripUseFareBalance, tripUseCashBalance, tripLocationKeyword, tripOriginKeyword, tripDestinationKeyword, tripLocationResults, tripLocationSearching, tripLocationTarget, dispatchForm, orderUrlForm, createdOrderUrl, users, trips, error, load, loadUserOptions, loadDriverOptions, displayError, canWrite, requestConfirmation, notify, tripCatalog, dateTimeInput }) {
  const tripDetail = createTripDetailController({ tripsApi, selectedTrip, loading: tripDetailLoading, error: tripDetailError, selectedId: tripDetailId, displayError })
  let locationSearchGeneration = 0
  async function settleTrip(item, method) { if (!canWrite.value || !item?.id || !method?.trim()) return; try { await tripsApi.settle(item.id, method.trim()); await load(); selectedTrip.value = trips.value.find(trip => trip.id === item.id) || null } catch (err) { error.value = displayError(err) } }
  async function unsettleTrip(item) { if (!canWrite.value || !item?.id) return; try { await tripsApi.unsettle(item.id); await load(); selectedTrip.value = trips.value.find(trip => trip.id === item.id) || null } catch (err) { error.value = displayError(err) } }
  function clearTripLocationSearch() {
    locationSearchGeneration += 1
    tripLocationKeyword.value = ''
    tripOriginKeyword.value = ''
    tripDestinationKeyword.value = ''
    tripLocationResults.value = []
    tripLocationTarget.value = 'origin'
  }

  async function editTrip(item) {
    try {
      const detail = await tripsApi.get(item.id)
      await loadUserOptions(detail.userId)
      selectedTrip.value = null
      tripForm.value = { ...detail, originDisplay: detail.originDisplay || detail.origin, destinationDisplay: detail.destinationDisplay || detail.destination, originRegion: detail.originRegion || (detail.region === 'HK' ? '香港' : detail.region === 'MACAU' ? '澳門' : '大陸'), destinationRegion: detail.destinationRegion || (detail.region === 'HK' ? '香港' : detail.region === 'MACAU' ? '澳門' : '大陸'), scheduledAt: dateTimeInput(detail.scheduledAt) }
      clearTripLocationSearch()
    } catch (err) { error.value = displayError(err) }
  }
  async function resetTrip() {
    await loadUserOptions()
    selectedTrip.value = null
    tripForm.value = { id: '', userId: users.value[0]?.id || '', origin: '', destination: '', originDisplay: '', destinationDisplay: '', originLatitude: '', originLongitude: '', destinationLatitude: '', destinationLongitude: '', originCity: '', destinationCity: '', originRegion: '香港', destinationRegion: '大陸', distanceMeters: 0, categoryId: '', vehicleId: '', extraIds: [], region: 'GUANGDONG', scheduledAt: dateTimeInput(new Date(Date.now() + 3600000).toISOString()), status: 'PENDING' }
    tripVehicleCategoryId.value = ''
    tripQuote.value = null
    tripPaymentAmount.value = ''
    tripVehicleCategoryId.value = ''
    tripBookingStep.value = 'details'
    clearTripLocationSearch()
  }
  async function searchTripLocation(target) {
    const keyword = (target === 'destination' ? tripDestinationKeyword.value : tripOriginKeyword.value).trim()
    tripLocationTarget.value = target
    const region = target === 'origin' ? (tripForm.value.originRegion || '香港') : (tripForm.value.destinationRegion || '大陸')
    tripLocationKeyword.value = target === 'destination' ? tripDestinationKeyword.value : tripOriginKeyword.value
    if (!keyword || tripLocationSearching.value || !tripForm.value) return
    const searchGeneration = locationSearchGeneration
    tripLocationSearching.value = true; error.value = ''
    try {
      const result = await addressesApi.search(keyword, region)
      if (searchGeneration !== locationSearchGeneration) return
      tripLocationResults.value = result.data || []
      if (!tripLocationResults.value.length) error.value = `找不到${region}的地址，請確認地區後重新搜尋`
    } catch (err) { tripLocationResults.value = []; error.value = displayError(err) } finally { tripLocationSearching.value = false }
  }
  function selectTripLocation(item) {
    if (!tripForm.value) return
    const target = tripLocationTarget.value
    const region = target === 'origin' ? (tripForm.value.originRegion || '香港') : (tripForm.value.destinationRegion || '大陸')
    if (item.region && item.region !== region) { error.value = `此地址不屬於${region}，請重新搜尋${region}地址`; return }
    tripForm.value[target] = item.displayAddress || item.address || item.name
    tripForm.value[`${target}Display`] = item.name || item.displayAddress || item.address || ''
    tripForm.value[`${target}Latitude`] = item.latitude ?? item.lat ?? ''
    tripForm.value[`${target}Longitude`] = item.longitude ?? item.lng ?? ''
    tripForm.value[`${target}City`] = item.city || item.district || ''
    tripForm.value[`${target}District`] = item.district || ''
    tripForm.value[`${target}Region`] = item.region || region
    if (target === 'destination') tripDestinationKeyword.value = ''
    else tripOriginKeyword.value = ''
    tripLocationKeyword.value = ''; tripLocationResults.value = []
  }
  function handleTripRegionChange(target) {
    if (!tripForm.value) return
    if (target === 'origin') {
      tripOriginKeyword.value = ''
      tripForm.value.origin = ''
      tripForm.value.originDisplay = ''
      tripForm.value.originLatitude = ''
      tripForm.value.originLongitude = ''
      tripForm.value.originCity = ''
    } else {
      tripDestinationKeyword.value = ''
      tripForm.value.destination = ''
      tripForm.value.destinationDisplay = ''
      tripForm.value.destinationLatitude = ''
      tripForm.value.destinationLongitude = ''
      tripForm.value.destinationCity = ''
    }
    tripLocationTarget.value = target || 'origin'
    tripLocationKeyword.value = ''
    tripLocationResults.value = []
  }
  async function showTrip(item) {
    tripForm.value = null
    await tripDetail.open(item)
  }
  function closeTrip() { tripDetail.close() }
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
    const categoryId = tripVehicleCategoryId.value || tripForm.value.categoryId || vehicle?.categoryId
    if (!categoryId || !tripForm.value.distanceMeters) { error.value = '請先搜尋並選擇完整路線，再選擇車型'; return }
    try {
      tripQuote.value = await api('/quotes', { method: 'POST', body: JSON.stringify({ categoryId, vehicleId: tripForm.value.vehicleId, distanceMeters: Number(tripForm.value.distanceMeters), durationSeconds: Number(tripForm.value.durationSeconds || 0), extraIds: tripForm.value.extraIds || [], displayCurrency: 'RMB', userId: tripForm.value.userId, originRegion: tripForm.value.originRegion || '香港', destinationRegion: tripForm.value.destinationRegion || '大陸', originCity: tripForm.value.originCity || '', destinationCity: tripForm.value.destinationCity || '', scheduledAt: tripForm.value.scheduledAt }) })
      tripPaymentAmount.value = String(tripQuote.value.total ?? tripQuote.value.totalAmount ?? '')
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
  async function createPendingTrip() {
    if (!tripQuote.value || !tripForm.value) return
    try {
      const result = await api('/payments/trip-pending', { method: 'POST', body: JSON.stringify({ userId: tripForm.value.userId, quoteId: tripQuote.value.id, origin: tripForm.value.originDisplay || tripForm.value.origin, destination: tripForm.value.destinationDisplay || tripForm.value.destination, originAddress: { region: tripForm.value.originRegion, city: tripForm.value.originCity, district: tripForm.value.originDistrict || '', place: tripForm.value.originDisplay, detail: tripForm.value.origin, latitude: Number(tripForm.value.originLatitude), longitude: Number(tripForm.value.originLongitude) }, destinationAddress: { region: tripForm.value.destinationRegion, city: tripForm.value.destinationCity, district: tripForm.value.destinationDistrict || '', place: tripForm.value.destinationDisplay, detail: tripForm.value.destination, latitude: Number(tripForm.value.destinationLatitude), longitude: Number(tripForm.value.destinationLongitude) }, originLatitude: tripForm.value.originLatitude, originLongitude: tripForm.value.originLongitude, destinationLatitude: tripForm.value.destinationLatitude, destinationLongitude: tripForm.value.destinationLongitude, scheduledAt: tripForm.value.scheduledAt }) })
      tripForm.value = null; tripQuote.value = null; tripBookingStep.value = 'details'; await load(); selectedTrip.value = trips.value.find(trip => trip.id === result?.tripId) || null
    } catch (err) { error.value = displayError(err) }
  }
  async function completeTripBooking() {
    if (!tripQuote.value || !tripForm.value) return
    const quotedAmount = Number(tripQuote.value.total ?? tripQuote.value.totalAmount)
    const rawPaymentAmount = String(tripPaymentAmount.value ?? '').trim()
    const paymentAmount = Number(rawPaymentAmount)
    if (!rawPaymentAmount || !Number.isFinite(paymentAmount) || paymentAmount < 0 || paymentAmount > quotedAmount) {
      error.value = `付款金額必須介於 0 至 ${quotedAmount.toFixed(2)} 之間`
      return
    }
    try {
      const result = await api('/payments/trip-pay', { method: 'POST', body: JSON.stringify({ userId: tripForm.value.userId, quoteId: tripQuote.value.id, useFareBalance: false, useCashBalance: false, manualPaymentConfirmed: true, externalAmount: paymentAmount, externalPaymentMethod: tripPaymentMethod.value === 'sandbox' ? 'sandbox' : tripPaymentMethod.value, origin: tripForm.value.originDisplay || tripForm.value.origin, destination: tripForm.value.destinationDisplay || tripForm.value.destination, originAddress: { region: tripForm.value.originRegion, city: tripForm.value.originCity, district: tripForm.value.originDistrict || '', place: tripForm.value.originDisplay, detail: tripForm.value.origin, latitude: Number(tripForm.value.originLatitude), longitude: Number(tripForm.value.originLongitude) }, destinationAddress: { region: tripForm.value.destinationRegion, city: tripForm.value.destinationCity, district: tripForm.value.destinationDistrict || '', place: tripForm.value.destinationDisplay, detail: tripForm.value.destination, latitude: Number(tripForm.value.destinationLatitude), longitude: Number(tripForm.value.destinationLongitude) }, scheduledAt: tripForm.value.scheduledAt }) })
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
  function openOrderUrlExpiryForm(item) { orderUrlForm.value = { tripId: item.tripId, urlId: item.id, validFrom: dateTimeInput(item.validFrom), validUntil: dateTimeInput(item.validUntil) } }
  async function createOrderUrl() {
    if (!orderUrlForm.value?.tripId || !orderUrlForm.value.validUntil) return
    if (!orderUrlForm.value.urlId && (!orderUrlForm.value.validFrom || new Date(orderUrlForm.value.validUntil) <= new Date(orderUrlForm.value.validFrom))) { error.value = '失效日期必須晚於有效日期'; return }
    if (orderUrlForm.value.urlId && new Date(orderUrlForm.value.validUntil) <= new Date()) { error.value = '失效日期必須晚於目前時間'; return }
    try {
      if (orderUrlForm.value.urlId) {
        await tripsApi.updateOrderUrlExpiry(orderUrlForm.value.tripId, orderUrlForm.value.urlId, orderUrlForm.value.validUntil)
        notify('URL 失效時間已更新')
      } else {
        const result = await tripsApi.createOrderUrl(orderUrlForm.value.tripId, orderUrlForm.value)
        createdOrderUrl.value = result.url
        try { await navigator.clipboard?.writeText(result.url) } catch {}
      }
      orderUrlForm.value = null
      await load()
    } catch (err) { error.value = displayError(err) }
  }
  function closeCreatedOrderUrl() { createdOrderUrl.value = '' }
  async function copyOrderUrl() { if (!createdOrderUrl.value) return; try { await navigator.clipboard.writeText(createdOrderUrl.value) } catch { error.value = '複製 URL 失敗，請手動複製' } }
  async function copyExistingOrderUrl(item) {
    try {
      const result = await tripsApi.copyOrderUrl(item.tripId, item.id)
      await navigator.clipboard.writeText(result.url)
      notify(result.rotated ? 'URL 已重新產生並複製，舊連結已失效' : 'URL 已複製')
    } catch (err) {
      error.value = displayError(err)
      notify(error.value, 'error')
    }
  }
  async function revokeOrderUrl(item) { if (!await requestConfirmation({ title: '撤銷訂單 URL', message: '確定要撤銷此訂單 URL？', confirmLabel: '撤銷', danger: true })) return; try { await tripsApi.revokeOrderUrl(item.tripId, item.id); notify('訂單 URL 已撤銷'); await load() } catch (err) { error.value = displayError(err); notify(error.value, 'error') } }
  return { editTrip, resetTrip, clearTripLocationSearch, searchTripLocation, selectTripLocation, handleTripRegionChange, showTrip, closeTrip, retryTrip: tripDetail.retry, updateTripStatus, settleTrip, unsettleTrip, prepareTripQuote, calculateTripRoute, createPendingTrip, completeTripBooking, saveTrip, openDispatch, saveDispatch, openOrderUrlForm, openOrderUrlExpiryForm, createOrderUrl, closeCreatedOrderUrl, copyOrderUrl, copyExistingOrderUrl, revokeOrderUrl }
}
