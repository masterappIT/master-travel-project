export function normalizeVehiclePlates({ hkPlate, macauPlate, mainlandPlate }) {
  return {
    hkPlate: String(hkPlate || '').trim().toUpperCase(),
    macauPlate: String(macauPlate || '').trim().toUpperCase(),
    mainlandPlate: String(mainlandPlate || '').trim().replace(/[•・]/g, '·').toUpperCase(),
  }
}

export function vehiclePlateError({ vehicleOwnership, hkPlate, macauPlate, mainlandPlate }) {
  if (hkPlate && (!/^[A-Z0-9 ]+$/.test(hkPlate) || hkPlate.replace(/ /g, '').length > 8)) {
    return '香港車牌只可包含大寫英文字母、數字及空格，並且不含空格最多 8 個字元'
  }
  if (macauPlate && !/^[A-Z]{2}-[0-9]{2}-[0-9]{2}$/.test(macauPlate)) {
    return '澳門車牌格式必須為 AA-00-00，不可包含空格'
  }
  const mainlandPattern = vehicleOwnership === '香港'
    ? /^粵Z·\S+港$/
    : vehicleOwnership === '澳門'
      ? /^粵Z·\S+澳$/
      : /^粵[A-Z]·\S+$/
  if (mainlandPlate && (!mainlandPattern.test(mainlandPlate) || /\s/.test(mainlandPlate))) {
    return vehicleOwnership === '香港'
      ? '香港跨境車牌格式必須為粵Z·內容港，不可包含空格'
      : vehicleOwnership === '澳門'
        ? '澳門跨境車牌格式必須為粵Z·內容澳，不可包含空格'
        : '內地車牌格式必須為粵A·內容，不可包含空格'
  }
  return ''
}
