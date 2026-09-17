export type VehiclePlateKind = 'hong-kong' | 'macau' | 'mainland'
export type VehiclePlateSlot = 'top' | 'middle' | 'bottom'

export type VehiclePlate = {
  kind: VehiclePlateKind
  value: string
  slot: VehiclePlateSlot
}

type VehiclePlateSource = {
  vehiclePlate?: string | null
  hkPlate?: string | null
  macauPlate?: string | null
  mainlandPlate?: string | null
}

export const layoutVehiclePlates = (driver?: VehiclePlateSource | null): VehiclePlate[] => {
  if (!driver) return []

  const plates = [
    { kind: 'hong-kong' as const, value: driver.hkPlate || driver.vehiclePlate || '' },
    { kind: 'macau' as const, value: driver.macauPlate || '' },
    { kind: 'mainland' as const, value: driver.mainlandPlate || '' }
  ].filter(plate => plate.value)

  const slots: VehiclePlateSlot[] = plates.length === 1
    ? ['bottom']
    : plates.length === 2
      ? ['middle', 'bottom']
      : ['top', 'middle', 'bottom']

  return plates.map((plate, index) => ({ ...plate, slot: slots[index] }))
}
