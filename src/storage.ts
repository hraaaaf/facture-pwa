import type { CommercialDocument, CompanySettings } from './types'
import { defaultCompany } from './types'

const DB_NAME = 'facture-pwa'
const DB_VERSION = 1
const DOCS_STORE = 'documents'
const SETTINGS_STORE = 'settings'

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DOCS_STORE)) {
        db.createObjectStore(DOCS_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const transact = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const request = run(tx.objectStore(storeName))
    let result: T
    let settled = false

    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      db.close()
      reject(error ?? new Error('Erreur IndexedDB'))
    }

    request.onsuccess = () => {
      result = request.result
    }
    request.onerror = () => fail(request.error)
    tx.onerror = () => fail(tx.error)
    tx.onabort = () => fail(tx.error)
    tx.oncomplete = () => {
      if (settled) return
      settled = true
      db.close()
      resolve(result)
    }
  })
}

export const getDocuments = async (): Promise<CommercialDocument[]> => {
  const docs = await transact<CommercialDocument[]>(DOCS_STORE, 'readonly', store => store.getAll())
  return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export const saveDocument = (doc: CommercialDocument) =>
  transact<IDBValidKey>(DOCS_STORE, 'readwrite', store => store.put(doc))

export const removeDocument = (id: string) =>
  transact<undefined>(DOCS_STORE, 'readwrite', store => store.delete(id))

export const getCompany = async (): Promise<CompanySettings> => {
  const saved = await transact<CompanySettings | undefined>(SETTINGS_STORE, 'readonly', store => store.get('company'))
  return saved ?? defaultCompany
}

export const saveCompany = (company: CompanySettings) =>
  transact<IDBValidKey>(SETTINGS_STORE, 'readwrite', store => store.put(company, 'company'))
