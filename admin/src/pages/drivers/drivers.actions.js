import { composeMainlandPlate, formatHongKongPlateInput, formatMacauPlateInput, formatMainlandPlateInput, mainlandPlateInput, normalizeVehiclePlates, vehiclePlateError } from './vehicle-plates.js'

export function createDriversActions({ driversApi, driverForm, selectedDriver, settlementForm, drivers, error, load, displayError, requestConfirmation, notify }) {
  let vehiclePhotoUrl = null
  let driverFormPhotoUrl = null
  const reviewStatusLabel = status => ({ PENDING: '待審核', APPROVED: '已通過', REVISION_REQUIRED: '退回修改', REJECTED: '已拒絕' }[status] || status || '待審核')

  function clearDriverFormPhotoUrl() {
    if (driverFormPhotoUrl) URL.revokeObjectURL(driverFormPhotoUrl)
    driverFormPhotoUrl = null
  }

  function resetDriver() {
    clearDriverFormPhotoUrl()
    driverForm.value = { id: '', driverType: '內部司機', name: '', affiliation: '香港', vehicleOwnership: '香港', plateType: '單牌', hkPlate: '', macauPlate: '', mainlandPlate: '', phoneCountryCode: '+852', phone: '', vehicleCategory: '', vehicleColor: '', vehiclePhotos: [], vehiclePhotoFile: null, vehiclePhotoPersisted: false, removeVehiclePhoto: false }
  }

  function editDriver(item) {
    clearDriverFormPhotoUrl()
    const vehicleOwnership = item.vehicleOwnership || '香港'
    driverForm.value = { driverType: '內部司機', affiliation: '香港', plateType: '單牌', hkPlate: '', macauPlate: '', mainlandPlate: '', phoneCountryCode: '+852', ...item, vehicleOwnership, macauPlate: formatMacauPlateInput(item.macauPlate), mainlandPlate: mainlandPlateInput(item.mainlandPlate, vehicleOwnership), vehiclePhotos: [], vehiclePhotoFile: null, vehiclePhotoPersisted: Boolean(item.vehiclePhotos?.length), removeVehiclePhoto: false }
  }

  function formatDriverHongKongPlate() {
    if (!driverForm.value) return
    driverForm.value.hkPlate = formatHongKongPlateInput(driverForm.value.hkPlate)
  }

  function formatDriverMacauPlate() {
    if (!driverForm.value) return
    driverForm.value.macauPlate = formatMacauPlateInput(driverForm.value.macauPlate)
  }

  function formatDriverMainlandPlate() {
    if (!driverForm.value) return
    driverForm.value.mainlandPlate = formatMainlandPlateInput(driverForm.value.mainlandPlate)
  }

  function changeDriverOwnership() {
    if (!driverForm.value) return
    if (driverForm.value.vehicleOwnership === '中國內地') driverForm.value.plateType = '兩地牌'
    driverForm.value.hkPlate = ''
    driverForm.value.macauPlate = ''
    driverForm.value.mainlandPlate = ''
  }

  async function uploadDriverPhotos(event) {
    const files = [...(event.target.files || [])]
    event.target.value = ''
    if (!files.length) return
    const file = files[0]
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { error.value = '車輛相片只支援 JPEG、PNG 或 WebP'; return }
    if (file.size > 2 * 1024 * 1024) { error.value = '車輛相片不可超過 2 MB'; return }
    clearDriverFormPhotoUrl()
    driverFormPhotoUrl = URL.createObjectURL(file)
    driverForm.value.vehiclePhotoFile = file
    driverForm.value.vehiclePhotos = [driverFormPhotoUrl]
    driverForm.value.vehiclePhotoPersisted = false
    driverForm.value.removeVehiclePhoto = false
    error.value = ''
  }

  function removeDriverPhoto() {
    clearDriverFormPhotoUrl()
    driverForm.value.vehiclePhotoFile = null
    driverForm.value.vehiclePhotos = []
    driverForm.value.vehiclePhotoPersisted = false
    driverForm.value.removeVehiclePhoto = true
  }

  async function saveDriver() {
    const vehicleOwnership = driverForm.value.vehicleOwnership || '香港'
    const plates = normalizeVehiclePlates({ ...driverForm.value, mainlandPlate: composeMainlandPlate(driverForm.value.mainlandPlate, vehicleOwnership) })
    const { vehiclePhotoFile, vehiclePhotoPersisted, removeVehiclePhoto, vehiclePhotos, ...driverFields } = driverForm.value
    const form = { ...driverFields, ...plates, vehicleOwnership, driverType: driverForm.value.driverType || '內部司機', name: String(driverForm.value.name || '').trim(), phone: String(driverForm.value.phone || '').trim(), vehicleCategory: String(driverForm.value.vehicleCategory || '').trim(), vehicleColor: String(driverForm.value.vehicleColor || '').trim(), id: driverForm.value.id || undefined }
    const plateError = vehiclePlateError({ ...plates, vehicleOwnership: form.vehicleOwnership })
    if (plateError) { error.value = plateError; return }
    if (!form.name || !form.affiliation || !form.plateType || !form.phone || !form.vehicleCategory || !form.vehicleColor) { error.value = '請填寫註冊所需資料'; return }
    if (form.vehicleOwnership === '中國內地' && form.plateType !== '兩地牌') { error.value = '中國內地車輛只可選擇兩地牌'; return }
    if ((form.vehicleOwnership === '香港' || form.vehicleOwnership === '中國內地' || form.plateType === '三地牌') && !form.hkPlate) { error.value = '請填寫香港車牌'; return }
    if (form.vehicleOwnership === '澳門' && !form.macauPlate) { error.value = '請填寫澳門車牌'; return }
    if (form.plateType !== '單牌' && !form.mainlandPlate) { error.value = '請填寫內地車牌'; return }
    try {
      await driversApi.save(form, vehiclePhotoFile, removeVehiclePhoto)
      clearDriverFormPhotoUrl()
      driverForm.value = null; error.value = ''; await load()
    } catch (err) { error.value = displayError(err) }
  }

  async function removeDriver(item) {
    if (!await requestConfirmation({ title: '刪除司機', message: `刪除司機「${item.name}」？`, confirmLabel: '刪除', danger: true })) return
    try { await driversApi.remove(item.id); notify('司機已刪除'); await load() } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }

  async function openDriverDetail(item) {
    if (vehiclePhotoUrl) URL.revokeObjectURL(vehiclePhotoUrl)
    vehiclePhotoUrl = null
    selectedDriver.value = { ...item, vehiclePhotoUrl: null }
    if (item.vehiclePhotos?.length) {
      try {
        vehiclePhotoUrl = URL.createObjectURL(await driversApi.vehiclePhoto(item.id))
        if (selectedDriver.value?.id === item.id) selectedDriver.value = { ...selectedDriver.value, vehiclePhotoUrl }
      } catch (err) { error.value = displayError(err) }
    }
  }
  function previewDriver(item) { openDriverDetail(item) }
  function closeDriverDetail() {
    if (vehiclePhotoUrl) URL.revokeObjectURL(vehiclePhotoUrl)
    vehiclePhotoUrl = null
    selectedDriver.value = null
    settlementForm.value = null
  }

  async function reviewDriver(action, reason = '') {
    const item = selectedDriver.value
    if (!item) return
    try {
      const updated = action === 'approve'
        ? await driversApi.approve(item.id)
        : action === 'revision'
          ? await driversApi.requestRevision(item.id, reason)
          : await driversApi.reject(item.id, reason)
      selectedDriver.value = { ...updated, vehiclePhotoUrl }
      notify(action === 'approve' ? '司機審核已通過' : action === 'revision' ? '已退回司機修改資料' : '已拒絕司機註冊')
      await load()
    } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }

  async function approveDriver() {
    if (!await requestConfirmation({ title: '通過司機審核', message: `確認通過「${selectedDriver.value?.name || ''}」的註冊資料？`, confirmLabel: '通過' })) return
    await reviewDriver('approve')
  }

  async function requestDriverRevision() {
    const reason = window.prompt('請輸入退回修改原因')?.trim()
    if (!reason) return
    await reviewDriver('revision', reason)
  }

  async function rejectDriver() {
    const reason = window.prompt('請輸入直接拒絕原因')?.trim()
    if (!reason) return
    if (!await requestConfirmation({ title: '直接拒絕註冊', message: '拒絕後本次註冊將終止，司機無法重新提交。', confirmLabel: '拒絕', danger: true })) return
    await reviewDriver('reject', reason)
  }
  function resetSettlement(item = selectedDriver.value) {
    if (item) settlementForm.value = { driverId: item.id, settlementMethod: item.settlementMethod || '月結', settlementAccount: item.settlementAccount || '' }
  }
  async function saveSettlement() {
    if (!settlementForm.value) return
    try {
      const driver = drivers.value.find(item => item.id === settlementForm.value.driverId)
      if (!driver) return
      await driversApi.save({ ...driver, ...settlementForm.value })
      settlementForm.value = null
      await load()
    } catch (err) { error.value = displayError(err) }
  }

  return { reviewStatusLabel, resetDriver, editDriver, formatDriverHongKongPlate, formatDriverMacauPlate, formatDriverMainlandPlate, changeDriverOwnership, uploadDriverPhotos, removeDriverPhoto, saveDriver, removeDriver, openDriverDetail, previewDriver, closeDriverDetail, approveDriver, requestDriverRevision, rejectDriver, resetSettlement, saveSettlement }
}
