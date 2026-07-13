import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearStorageFailure, hasStorageFailure, readStorage, STORAGE_ERROR_EVENT, writeStorage } from './storage'

describe('safe local storage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    clearStorageFailure()
  })

  it('keeps the app usable and reports denied writes', () => {
    const listener = vi.fn()
    window.addEventListener(STORAGE_ERROR_EVENT, listener)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('denied') })

    expect(writeStorage('key', 'value')).toBe(false)
    expect(hasStorageFailure()).toBe(true)
    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener(STORAGE_ERROR_EVENT, listener)
  })

  it('returns null instead of throwing when reads are denied', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('denied') })
    expect(readStorage('key')).toBeNull()
    expect(hasStorageFailure()).toBe(true)
  })
})
