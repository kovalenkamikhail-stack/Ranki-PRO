export type StoragePersistenceStatus =
  | 'granted'
  | 'best-effort'
  | 'unsupported'

let storagePersistencePromise: Promise<StoragePersistenceStatus> | null = null

async function resolveStoragePersistenceStatus(): Promise<StoragePersistenceStatus> {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) {
    return 'unsupported'
  }

  const storageManager = navigator.storage
  if (!storageManager) {
    return 'unsupported'
  }

  try {
    if (typeof storageManager.persisted === 'function') {
      const alreadyPersisted = await storageManager.persisted()
      if (alreadyPersisted) {
        return 'granted'
      }
    }

    if (typeof storageManager.persist === 'function') {
      const granted = await storageManager.persist()
      return granted ? 'granted' : 'best-effort'
    }
  } catch (error) {
    console.error('Failed to resolve storage persistence state.', error)
    return 'best-effort'
  }

  return 'unsupported'
}

export function ensureStoragePersistence() {
  if (!storagePersistencePromise) {
    storagePersistencePromise = resolveStoragePersistenceStatus()
  }

  return storagePersistencePromise
}

export function resetStoragePersistenceForTests() {
  storagePersistencePromise = null
}
