export function createDriversActions({ driversApi, driverForm, selectedDriver, settlementForm, drivers, error, load, displayError, requestConfirmation, notify }) {
  function resetDriver() {
    driverForm.value = { id: '', driverType: '內部司機', name: '', affiliation: '香港', plateType: '單牌', hkPlate: '', mainlandPlate: '', phoneCountryCode: '+852', phone: '', vehicleCategory: '', vehicleColor: '', vehiclePhotos: [], reviewStatus: '待審核' }
  }

  function editDriver(item) {
    driverForm.value = { driverType: '內部司機', affiliation: '香港', plateType: '單牌', phoneCountryCode: '+852', vehiclePhotos: [], reviewStatus: '待審核', ...item, vehiclePhotos: Array.isArray(item.vehiclePhotos) ? item.vehiclePhotos : item.vehiclePhotos ? [item.vehiclePhotos] : [] }
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
    const form = { ...driverForm.value, driverType: driverForm.value.driverType || '內部司機', name: String(driverForm.value.name || '').trim(), hkPlate: String(driverForm.value.hkPlate || '').trim(), mainlandPlate: String(driverForm.value.mainlandPlate || '').trim(), phone: String(driverForm.value.phone || '').trim(), vehicleCategory: String(driverForm.value.vehicleCategory || '').trim(), vehicleColor: String(driverForm.value.vehicleColor || '').trim(), id: driverForm.value.id || undefined }
    if (!form.name || !form.affiliation || !form.plateType || !form.phone || !form.vehicleCategory || !form.vehicleColor) { error.value = '請填寫註冊所需資料'; return }
    if (!form.hkPlate) { error.value = '請填寫香港車牌'; return }
    if ((form.plateType === '兩地牌' || form.plateType === '三地牌') && !form.mainlandPlate) { error.value = '請填寫內地車牌'; return }
    try {
      await driversApi.save(form)
      driverForm.value = null; error.value = ''; await load()
    } catch (err) { error.value = displayError(err) }
  }

  async function removeDriver(item) {
    if (!await requestConfirmation({ title: '刪除司機', message: `刪除司機「${item.name}」？`, confirmLabel: '刪除', danger: true })) return
    try { await driversApi.remove(item.id); notify('司機已刪除'); await load() } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }

  function openDriverDetail(item) { selectedDriver.value = item }
  function previewDriver(item) { openDriverDetail(item) }
  function closeDriverDetail() { selectedDriver.value = null; settlementForm.value = null }
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

  return { resetDriver, editDriver, uploadDriverPhotos, removeDriverPhoto, saveDriver, removeDriver, openDriverDetail, previewDriver, closeDriverDetail, resetSettlement, saveSettlement }
}
