import type { DocumentType, NumberingBaseline } from './types'

const DB_NAME = 'facture-pwa'
const DB_VERSION = 3
const COUNTERS_STORE = 'counters'
const documentTypes: DocumentType[] = ['DEVIS', 'FACTURE', 'BL', 'BC']

interface CounterRecord {
  key: string
  last: number
}

export const sanitizeLastUsed = (value: number) => {
  if (!Number.isFinite(value)) return 0
  return Math.min(999999, Math.max(0, Math.trunc(value)))
}

export const normalizeNumberingBaseline = (baseline: NumberingBaseline): NumberingBaseline => ({
  year: Number.isInteger(baseline.year) && baseline.year >= 2000 && baseline.year <= 9999
    ? baseline.year
    : new Date().getFullYear(),
  lastUsed: {
    DEVIS: sanitizeLastUsed(baseline.lastUsed?.DEVIS ?? 0),
    FACTURE: sanitizeLastUsed(baseline.lastUsed?.FACTURE ?? 0),
    BL: sanitizeLastUsed(baseline.lastUsed?.BL ?? 0),
    BC: sanitizeLastUsed(baseline.lastUsed?.BC ?? 0)
  }
})

export const nextSequenceFromBaseline = (
  baseline: NumberingBaseline,
  type: DocumentType,
  year: number
) => {
  const normalized = normalizeNumberingBaseline(baseline)
  return normalized.year === year ? normalized.lastUsed[type] + 1 : 1
}

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = () => {
    const db = request.result
    if (!db.objectStoreNames.contains(COUNTERS_STORE)) db.createObjectStore(COUNTERS_STORE, { keyPath: 'key' })
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

/**
 * Seeds the local counters with document numbers that were already consumed
 * before Factea was installed. Existing higher counters always win.
 */
export const seedNumberingCounters = async (baseline: NumberingBaseline): Promise<void> => {
  const normalized = normalizeNumberingBaseline(baseline)
  const db = await openDb()

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(COUNTERS_STORE, 'readwrite')
    const store = tx.objectStore(COUNTERS_STORE)
    let settled = false

    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      try { tx.abort() } catch { /* already finished */ }
      db.close()
      reject(error ?? new Error('Initialisation de la numérotation impossible'))
    }

    for (const type of documentTypes) {
      const last = normalized.lastUsed[type]
      if (last <= 0) continue
      const key = `${type}:${normalized.year}`
      const request = store.get(key) as IDBRequest<CounterRecord | undefined>
      request.onerror = () => fail(request.error)
      request.onsuccess = () => {
        const existing = request.result?.last ?? 0
        store.put({ key, last: Math.max(existing, last) } satisfies CounterRecord)
      }
    }

    tx.onerror = () => fail(tx.error)
    tx.onabort = () => fail(tx.error)
    tx.oncomplete = () => {
      if (settled) return
      settled = true
      db.close()
      resolve()
    }
  })
}
