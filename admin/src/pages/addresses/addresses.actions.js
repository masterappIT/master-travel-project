export function createAddressesActions({ addressesApi, addresses, addressForm, mainlandCities, mainlandCityForm, addressSearchKeyword, addressSearchResults, addressSearching, error, load, displayError, displayMainlandCity, apiMainlandCity, displayPlaceName, requestConfirmation, notify, t }) {
  function editAddress(item) { addressForm.value = { ...item, city: displayMainlandCity(item.city || ''), address: item.displayAddress || item.address } }
  function resetAddress() {
    const nextOrder = addresses.value.reduce((max, item) => Math.max(max, Number(item.order) || 0), 0) + 1
    addressForm.value = { id: '', region: '香港', city: '', name: '', address: '', latitude: null, longitude: null, enabled: true, order: nextOrder }
  }
  async function searchAddressPlaces() {
    const keyword = addressSearchKeyword.value.trim()
    if (!keyword || addressSearching.value) return
    addressSearching.value = true; error.value = ''
    try {
      const city = addressForm.value.region === '大陸' ? apiMainlandCity(addressForm.value.city.trim()) : ''
      const result = await addressesApi.search(keyword, addressForm.value.region, city)
      addressSearchResults.value = result.data || []
    } catch (err) { addressSearchResults.value = []; error.value = displayError(err) } finally { addressSearching.value = false }
  }
  function handleAddressRegionChange() {
    if (addressForm.value.region !== '大陸') addressForm.value = { ...addressForm.value, city: '' }
    addressSearchResults.value = []; addressSearchKeyword.value = ''
  }
  function handleAddressCityChange() { addressSearchResults.value = []; addressSearchKeyword.value = '' }
  function selectAddressSearchResult(item) {
    addressForm.value = { ...addressForm.value, city: addressForm.value.region === '大陸' ? addressForm.value.city : '', name: displayPlaceName(item.name), address: item.displayAddress || item.address, latitude: null, longitude: null }
    addressSearchResults.value = []; addressSearchKeyword.value = ''
  }
  async function saveAddress() {
    try {
      const { latitude, longitude, ...form } = addressForm.value
      const payload = { ...form, city: form.region === '大陸' ? apiMainlandCity(form.city.trim()) : '' }
      await addressesApi.save(form.id, payload); resetAddress(); await load()
    } catch (err) { error.value = displayError(err) }
  }
  async function removeAddress(item) {
    if (!await requestConfirmation({ title: '刪除推薦地址', message: `${t('remove')} ${item.name}?`, confirmLabel: '刪除', danger: true })) return
    try { await addressesApi.remove(item.id); notify('推薦地址已刪除'); await load() } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }
  function resetMainlandCity() { mainlandCityForm.value = { id: '', name: '', enabled: true, order: mainlandCities.value.length + 1 } }
  function editMainlandCity(item) { mainlandCityForm.value = { ...item } }
  async function saveMainlandCity() {
    try { await addressesApi.saveCity({ ...mainlandCityForm.value, name: apiMainlandCity(mainlandCityForm.value.name.trim()) }); mainlandCityForm.value = null; await load() } catch (err) { error.value = displayError(err) }
  }
  async function removeMainlandCity(item) {
    if (!await requestConfirmation({ title: '刪除城市', message: `${t('remove')} ${item.name}? 已歸屬該市的推薦地址將轉為大陸總分類。`, confirmLabel: '刪除', danger: true })) return
    try { await addressesApi.removeCity(item.id); notify('城市已刪除'); await load() } catch (err) { error.value = displayError(err); notify(error.value, 'error') }
  }
  return { editAddress, resetAddress, searchAddressPlaces, handleAddressRegionChange, handleAddressCityChange, selectAddressSearchResult, saveAddress, removeAddress, resetMainlandCity, editMainlandCity, saveMainlandCity, removeMainlandCity }
}
