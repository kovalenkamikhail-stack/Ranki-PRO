import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ensureStoragePersistence,
  resetStoragePersistenceForTests,
} from '@/lib/storage-persistence'

describe('ensureStoragePersistence', () => {
  afterEach(() => {
    resetStoragePersistenceForTests()
  })

  it('requests persistent storage when the API is available', async () => {
    const persisted = vi.fn().mockResolvedValue(false)
    const persist = vi.fn().mockResolvedValue(true)

    Object.defineProperty(window.navigator, 'storage', {
      configurable: true,
      value: {
        persisted,
        persist,
      },
    })

    await expect(ensureStoragePersistence()).resolves.toBe('granted')
    expect(persisted).toHaveBeenCalledOnce()
    expect(persist).toHaveBeenCalledOnce()
  })

  it('returns unsupported when the API is missing', async () => {
    Object.defineProperty(window.navigator, 'storage', {
      configurable: true,
      value: undefined,
    })

    await expect(ensureStoragePersistence()).resolves.toBe('unsupported')
  })
})
