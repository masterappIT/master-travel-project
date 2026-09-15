export function readStoredList(key, storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}
