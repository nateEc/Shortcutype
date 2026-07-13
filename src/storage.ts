export const STORAGE_ERROR_EVENT = 'shortcutype-storage-error'

let storageFailed = false

export function hasStorageFailure() {
  return storageFailed
}

export function clearStorageFailure() {
  storageFailed = false
}

export function readStorage(key: string) {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    reportStorageFailure()
    return null
  }
}

export function writeStorage(key: string, value: string) {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    reportStorageFailure()
    return false
  }
}

function reportStorageFailure() {
  storageFailed = true
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(STORAGE_ERROR_EVENT))
}
