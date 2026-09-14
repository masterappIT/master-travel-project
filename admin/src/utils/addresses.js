import { displayMainlandCity } from './formatters.js'

export const filterAddresses = (items, regionFilter = '', cityFilter = '') => items.filter(item => {
  const matchesRegion = !regionFilter || item.region === regionFilter
  const matchesCity = !cityFilter || regionFilter !== '大陸' || (
    cityFilter === '__mainland__'
      ? !item.city
      : displayMainlandCity(item.city) === cityFilter
  )
  return matchesRegion && matchesCity
})
