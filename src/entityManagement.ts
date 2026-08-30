import type { CatalogItem, ClientProfile } from './types'

const DB_NAME = 'facture-pwa'
const DB_VERSION = 3
const CLIENTS_STORE = 'clients'
const CATALOG_STORE = 'catalog'

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

const put = async <T>(storeName: string, value: T): Promise<T> => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(value)
    tx.oncomplete = () => { db.close(); resolve(value) }
    tx.onerror = () => { const error = tx.error; db.close(); reject(error ?? new Error('Enregistrement impossible')) }
    tx.onabort = () => { const error = tx.error; db.close(); reject(error ?? new Error('Enregistrement annulé')) }
  })
}

const remove = async (storeName: string, id: string): Promise<void> => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).delete(id)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { const error = tx.error; db.close(); reject(error ?? new Error('Suppression impossible')) }
    tx.onabort = () => { const error = tx.error; db.close(); reject(error ?? new Error('Suppression annulée')) }
  })
}

export const normalizeManagedClient = (value: ClientProfile): ClientProfile => {
  const now = new Date().toISOString()
  const saved = {
    ...value,
    name: value.name.trim(),
    company: value.company.trim(),
    address: value.address.trim(),
    ice: value.ice.trim(),
    ifNumber: value.ifNumber.trim(),
    phone: value.phone.trim(),
    email: value.email.trim(),
    updatedAt: now,
    createdAt: value.createdAt || now,
    usageCount: Math.max(0, Math.trunc(value.usageCount || 0))
  }
  if (!saved.name && !saved.company) throw new Error('Nom ou société requis')
  return saved
}

export const normalizeManagedCatalogItem = (value: CatalogItem): CatalogItem => {
  const now = new Date().toISOString()
  const saved = {
    ...value,
    designation: value.designation.trim(),
    unit: value.unit.trim() || 'Pièce',
    lastUnitPriceHT: Number(value.lastUnitPriceHT),
    vatRate: Number(value.vatRate),
    updatedAt: now,
    createdAt: value.createdAt || now,
    usageCount: Math.max(0, Math.trunc(value.usageCount || 0))
  }
  if (!saved.designation) throw new Error('Désignation requise')
  if (!Number.isFinite(saved.lastUnitPriceHT) || saved.lastUnitPriceHT < 0) throw new Error('Prix HT invalide')
  if (!Number.isFinite(saved.vatRate) || saved.vatRate < 0 || saved.vatRate > 100) throw new Error('TVA invalide')
  return saved
}

export const saveManagedClient = async (value: ClientProfile) => put(CLIENTS_STORE, normalizeManagedClient(value))
export const deleteManagedClient = async (id: string) => remove(CLIENTS_STORE, id)
export const saveManagedCatalogItem = async (value: CatalogItem) => put(CATALOG_STORE, normalizeManagedCatalogItem(value))
export const deleteManagedCatalogItem = async (id: string) => remove(CATALOG_STORE, id)

export const clientDocumentSnapshot = (client: ClientProfile) => ({
  client: client.company.trim() || client.name.trim(),
  clientId: client.id,
  clientAddress: client.address,
  clientIce: client.ice,
  clientIfNumber: client.ifNumber
})
