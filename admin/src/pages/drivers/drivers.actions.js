import { normalizeVehiclePlates, vehiclePlateError } from './vehicle-plates.js'

export function createDriversActions({ driversApi, driverForm, selectedDriver, settlementForm, drivers, error, load, displayError, requestConfirmation, notify }) {
  let vehiclePhotoUrl = null
  const reviewStatusLabel = status => ({ PENDING: '待審核', APPROVED: '已通過', REVISION_REQUIRED: '退回修改', REJECTED: '已拒絕' }[status] || status || '待審核')

  function resetDriver() {
    driverForm.value = { id: '', driverType: '內部司機', name: '', affiliation: '香港', vehicleOwnership: '香港', plateType: '單牌', hkPlate: '', macauPlate: '', mainlandPlate: '', phoneCountryCode: '+852', phone: '', vehicleCategory: '', vehicleColor: '', vehiclePhotos: [] }
  }

  function editDriver(item) {
    driverForm.value = { driverType: '內部司機', affiliation: '香港', vehicleOwnership: '香港', plateType: '單牌', hkPlate: '', macauPlate: '', mainlandPlate: '', phoneCountryCode: '+852', vehiclePhotos: [], ...item, vehiclePhotos: [] }
  }

  async function uploadDriverPhotos(event) {
    const files = [...(event.target.files || [])]
    event.target.value = ''
    if (!files.length) return
    const images = files.filter(file => file.type.startsWith('image/'))
    if (images.length !== files.length) { error.value = '車輛相片只支援圖片格式'; return }
    try {
      const uploaded = await Promise.all(images.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })))
      driverForm.value.vehiclePhotos = [...(driverForm.value.vehiclePhotos || []), ...uploaded]
      error.value = ''
    } catch { error.value = '車輛相片上傳失敗' }
  }

  function removeDriverPhoto(index) {
    driverForm.value.vehiclePhotos = (driverForm.value.vehiclePhotos || []).filter((_, photoIndex) => photoIndex !== index)
  }

  async function saveDriver() {
    const plates = normalizeVehiclePlates(driverForm.value)
    const form = { ...driverForm.value, ...plates, driverType: driverForm.value.driverType || '內部司機', name: String(driverForm.value.name || '').trim(), phone: String(driverForm.value.phone || '').trim(), vehicleCategory: String(driverForm.value.vehicleCategory || '').trim(), vehicleColor: String(driverForm.value.vehicleColor || '').trim(), id: driverForm.value.id || undefined }
    const plateError = vehiclePlateError({ ...plates, vehicleOwnership: form.vehicleOwnership })
    if (plateError) { error.value = plateError; return }
    if (!form.name || !form.affiliation || !form.plateType || !form.phone || !form.vehicleCategory || !form.vehicleColor) { error.value = '請填寫註冊所需資料'; return }
    if (form.vehicleOwnership === '中國內地' && form.plateType !== '兩地牌') { error.value = '中國內地車輛只可選擇兩地牌'; return }
    if ((form.vehicleOwnership === '香港' || form.vehicleOwnership === '中國內地' || form.plateType === '三地牌') && !form.hkPlate) { error.value = '請填寫香港車牌'; return }
    if (form.vehicleOwnership === '澳門' && !form.macauPlate) { error.value = '請填寫澳門車牌'; return }
    if (form.plateType !== '單牌' && !form.mainlandPlate) { error.value = '請填寫內地車牌'; return }
    try {
      await driversApi.save(form)
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

  return { reviewStatusLabel, resetDriver, editDriver, uploadDriverPhotos, removeDriverPhoto, saveDriver, removeDriver, openDriverDetail, previewDriver, closeDriverDetail, approveDriver, requestDriverRevision, rejectDriver, resetSettlement, saveSettlement }
}
