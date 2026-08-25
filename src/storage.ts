import type { CommercialDocument, CompanySettings, DocumentLine, DocumentType } from './types'
import { defaultCompany } from './types'

const DB_NAME = 'facture-pwa'
const DB_VERSION = 1
const DOCS_STORE = 'documents'
const SETTINGS_STORE = 'settings'
const BACKUP_VERSION = 1

export interface LocalBackup {
  version: 1
  exportedAt: string
  documents: CommercialDocument[]
  company: CompanySettings
}

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isDocumentType = (value: unknown): value is DocumentType =>
  value === 'DEVIS' || value === 'FACTURE' || value === 'BL' || value === 'BC'

const isDocumentLine = (value: unknown): value is DocumentLine => {
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && typeof value.designation === 'string'
    && typeof value.unit === 'string'
    && typeof value.quantity === 'number'
    && Number.isFinite(value.quantity)
    && typeof value.unitPriceHT === 'number'
    && Number.isFinite(value.unitPriceHT)
    && typeof value.vatRate === 'number'
    && Number.isFinite(value.vatRate)
}

const isCommercialDocument = (value: unknown): value is CommercialDocument => {
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && isDocumentType(value.type)
    && typeof value.number === 'string'
    && typeof value.date === 'string'
    && typeof value.client === 'string'
    && typeof value.object === 'string'
    && Array.isArray(value.lines)
    && value.lines.length > 0
    && value.lines.every(isDocumentLine)
    && typeof value.blShowPrices === 'boolean'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
}

const normalizeCompany = (value: unknown): CompanySettings => {
  if (!isRecord(value)) throw new Error('Réglages société invalides dans la sauvegarde')
  const merged = { ...defaultCompany, ...value }
  if (
    typeof merged.name !== 'string'
    || typeof merged.brand !== 'string'
    || typeof merged.address !== 'string'
    || typeof merged.legalLine !== 'string'
    || typeof merged.cityLabel !== 'string'
    || typeof merged.defaultVatRate !== 'number'
    || !Number.isFinite(merged.defaultVatRate)
    || typeof merged.logoDataUrl !== 'string'
    || typeof merged.managerSignatureDataUrl !== 'string'
    || (merged.pdfTemplate !== 'original' && merged.pdfTemplate !== 'premium')
  ) {
    throw new Error('Réglages société invalides dans la sauvegarde')
  }
  return merged
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
  const saved = await transact<Partial<CompanySettings> | undefined>(SETTINGS_STORE, 'readonly', store => store.get('company'))
  return saved ? { ...defaultCompany, ...saved } : defaultCompany
}

export const saveCompany = (company: CompanySettings) =>
  transact<IDBValidKey>(SETTINGS_STORE, 'readwrite', store => store.put(company, 'company'))

export const createLocalBackup = async (): Promise<LocalBackup> => {
  const [documents, company] = await Promise.all([getDocuments(), getCompany()])
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    documents,
    company
  }
}

export const restoreLocalBackup = async (value: unknown): Promise<void> => {
  if (!isRecord(value) || value.version !== BACKUP_VERSION || !Array.isArray(value.documents)) {
    throw new Error('Fichier de sauvegarde non reconnu')
  }
  if (!value.documents.every(isCommercialDocument)) {
    throw new Error('Les documents de la sauvegarde sont invalides')
  }
  const company = normalizeCompany(value.company)
  const documents = value.documents as CommercialDocument[]
  const db = await openDb()

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([DOCS_STORE, SETTINGS_STORE], 'readwrite')
    let settled = false

    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      db.close()
      reject(error ?? new Error('Échec de restauration IndexedDB'))
    }

    tx.onerror = () => fail(tx.error)
    tx.onabort = () => fail(tx.error)
    tx.oncomplete = () => {
      if (settled) return
      settled = true
      db.close()
      resolve()
    }

    const docsStore = tx.objectStore(DOCS_STORE)
    docsStore.clear()
    for (const document of documents) docsStore.put(document)
    tx.objectStore(SETTINGS_STORE).put(company, 'company')
  })
}
