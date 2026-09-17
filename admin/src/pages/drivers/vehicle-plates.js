export function normalizeVehiclePlates({ hkPlate, macauPlate, mainlandPlate }) {
  return {
    hkPlate: String(hkPlate || '').trim().toUpperCase(),
    macauPlate: formatMacauPlateInput(macauPlate),
    mainlandPlate: String(mainlandPlate || '').trim().replace(/[•・]/g, '·').toUpperCase(),
  }
}

export function formatHongKongPlateInput(value) {
  let nonSpaceCount = 0
  return [...String(value || '').toUpperCase()].filter(character => {
    if (character === ' ') return true
    if (!/[A-Z0-9]/.test(character) || nonSpaceCount === 8) return false
    nonSpaceCount += 1
    return true
  }).join('')
}

export function formatMacauPlateInput(value) {
  const raw = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  let filtered = ''
  for (const character of raw) {
    const valid = filtered.length < 2 ? /[A-Z]/.test(character) : /[0-9]/.test(character)
    if (valid) filtered += character
    if (filtered.length === 6) break
  }
  return [filtered.slice(0, 2), filtered.slice(2, 4), filtered.slice(4, 6)].filter(Boolean).join('-')
}

export function formatMainlandPlateInput(value) {
  return String(value || '').replace(/\s/g, '').replace(/[•・]/g, '·').toUpperCase()
}

export function mainlandPlateInput(value, vehicleOwnership) {
  const plate = String(value || '').trim().replace(/[•・]/g, '·').toUpperCase()
  if (vehicleOwnership === '香港' && /^粵Z·.*港$/.test(plate)) return plate.slice(3, -1)
  if (vehicleOwnership === '澳門' && /^粵Z·.*澳$/.test(plate)) return plate.slice(3, -1)
  if (vehicleOwnership === '中國內地' && plate.startsWith('粵')) return plate.slice(1)
  return plate
}

export function composeMainlandPlate(value, vehicleOwnership) {
  const input = mainlandPlateInput(value, vehicleOwnership).replace(/\s/g, '')
  if (!input) return ''
  if (vehicleOwnership === '香港') return `粵Z·${input}港`
  if (vehicleOwnership === '澳門') return `粵Z·${input}澳`
  return `粵${input}`
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
