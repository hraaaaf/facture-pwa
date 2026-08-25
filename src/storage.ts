import { formatDocumentNumber, validateDocument } from './lib'
import type { CommercialDocument, CompanySettings, DocumentLine, DocumentStatus, DocumentType } from './types'
import { companyLegalLine, defaultCompany, defaultNumberingPrefixes } from './types'

const DB_NAME = 'facture-pwa'
const DB_VERSION = 2
const DOCS_STORE = 'documents'
const SETTINGS_STORE = 'settings'
const COUNTERS_STORE = 'counters'
const BACKUP_VERSION = 1

interface CounterRecord {
  key: string
  last: number
}

export interface LocalBackup {
  version: 1
  exportedAt: string
  documents: CommercialDocument[]
  company: CompanySettings
}

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = () => {
    const db = request.result
    if (!db.objectStoreNames.contains(DOCS_STORE)) db.createObjectStore(DOCS_STORE, { keyPath: 'id' })
    if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE)
    if (!db.objectStoreNames.contains(COUNTERS_STORE)) db.createObjectStore(COUNTERS_STORE, { keyPath: 'key' })
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

const transact = async <T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
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
    request.onsuccess = () => { result = request.result }
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

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isDocumentType = (value: unknown): value is DocumentType => value === 'DEVIS' || value === 'FACTURE' || value === 'BL' || value === 'BC'
const isStatus = (value: unknown): value is DocumentStatus => value === 'DRAFT' || value === 'FINALIZED' || value === 'PAID' || value === 'CANCELLED'

const normalizeLine = (value: unknown): DocumentLine => {
  if (!isRecord(value)) throw new Error('Ligne de document invalide')
  if (
    typeof value.id !== 'string' || typeof value.designation !== 'string' || typeof value.unit !== 'string'
    || typeof value.quantity !== 'number' || !Number.isFinite(value.quantity)
    || typeof value.unitPriceHT !== 'number' || !Number.isFinite(value.unitPriceHT)
    || typeof value.vatRate !== 'number' || !Number.isFinite(value.vatRate)
  ) throw new Error('Ligne de document invalide')
  return {
    id: value.id,
    designation: value.designation,
    unit: value.unit,
    quantity: value.quantity,
    unitPriceHT: value.unitPriceHT,
    vatRate: value.vatRate,
    discountPercent: typeof value.discountPercent === 'number' && Number.isFinite(value.discountPercent) ? value.discountPercent : 0
  }
}

const normalizeDocument = (value: unknown): CommercialDocument => {
  if (!isRecord(value) || typeof value.id !== 'string' || !isDocumentType(value.type)) throw new Error('Document invalide')
  if (
    typeof value.number !== 'string' || typeof value.date !== 'string' || typeof value.client !== 'string'
    || typeof value.object !== 'string' || !Array.isArray(value.lines) || value.lines.length === 0
    || typeof value.blShowPrices !== 'boolean' || typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string'
  ) throw new Error('Document invalide')
  const legacyHadNumber = value.number.trim().length > 0
  return {
    id: value.id,
    type: value.type,
    number: value.number,
    date: value.date,
    client: value.client,
    object: value.object,
    lines: value.lines.map(normalizeLine),
    blShowPrices: value.blShowPrices,
    globalDiscountPercent: typeof value.globalDiscountPercent === 'number' && Number.isFinite(value.globalDiscountPercent) ? value.globalDiscountPercent : 0,
    status: isStatus(value.status) ? value.status : (legacyHadNumber ? 'FINALIZED' : 'DRAFT'),
    finalizedAt: typeof value.finalizedAt === 'string' ? value.finalizedAt : (legacyHadNumber ? value.updatedAt : ''),
    paidAt: typeof value.paidAt === 'string' ? value.paidAt : '',
    cancelledAt: typeof value.cancelledAt === 'string' ? value.cancelledAt : '',
    sourceDocumentId: typeof value.sourceDocumentId === 'string' ? value.sourceDocumentId : '',
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  }
}

const stringOr = (record: Record<string, unknown>, key: string, fallback = '') => typeof record[key] === 'string' ? record[key] as string : fallback

const normalizeCompany = (value: unknown, assumeConfigured = false): CompanySettings => {
  if (!isRecord(value)) throw new Error('Réglages société invalides dans la sauvegarde')
  const isLegacy = !('phone' in value) && !('ice' in value) && !('onboardingCompleted' in value)
  const rawPrefixes = isRecord(value.numberingPrefixes) ? value.numberingPrefixes : {}
  const numberingPrefixes = {
    DEVIS: stringOr(rawPrefixes, 'DEVIS', defaultNumberingPrefixes.DEVIS),
    FACTURE: stringOr(rawPrefixes, 'FACTURE', defaultNumberingPrefixes.FACTURE),
    BL: stringOr(rawPrefixes, 'BL', defaultNumberingPrefixes.BL),
    BC: stringOr(rawPrefixes, 'BC', defaultNumberingPrefixes.BC)
  }
  const merged: CompanySettings = {
    ...defaultCompany,
    ...value,
    phone: stringOr(value, 'phone', isLegacy ? '' : defaultCompany.phone),
    fax: stringOr(value, 'fax', isLegacy ? '' : defaultCompany.fax),
    email: stringOr(value, 'email', isLegacy ? '' : defaultCompany.email),
    ice: stringOr(value, 'ice', isLegacy ? '' : defaultCompany.ice),
    ifNumber: stringOr(value, 'ifNumber', isLegacy ? '' : defaultCompany.ifNumber),
    rc: stringOr(value, 'rc', isLegacy ? '' : defaultCompany.rc),
    patente: stringOr(value, 'patente', isLegacy ? '' : defaultCompany.patente),
    cnss: stringOr(value, 'cnss', isLegacy ? '' : defaultCompany.cnss),
    bankName: stringOr(value, 'bankName', isLegacy ? '' : defaultCompany.bankName),
    rib: stringOr(value, 'rib', isLegacy ? '' : defaultCompany.rib),
    legalLine: stringOr(value, 'legalLine', ''),
    onboardingCompleted: typeof value.onboardingCompleted === 'boolean' ? value.onboardingCompleted : assumeConfigured,
    numberingPrefixes
  } as CompanySettings

  const strings = [
    merged.name, merged.brand, merged.address, merged.cityLabel, merged.phone, merged.fax, merged.email,
    merged.ice, merged.ifNumber, merged.rc, merged.patente, merged.cnss, merged.bankName, merged.rib,
    merged.legalLine, merged.logoDataUrl, merged.managerSignatureDataUrl,
    merged.numberingPrefixes.DEVIS, merged.numberingPrefixes.FACTURE, merged.numberingPrefixes.BL, merged.numberingPrefixes.BC
  ]
  if (
    strings.some(item => typeof item !== 'string')
    || typeof merged.defaultVatRate !== 'number' || !Number.isFinite(merged.defaultVatRate)
    || merged.defaultVatRate < 0 || merged.defaultVatRate > 100
    || (merged.pdfTemplate !== 'original' && merged.pdfTemplate !== 'premium')
    || typeof merged.onboardingCompleted !== 'boolean'
  ) throw new Error('Réglages société invalides dans la sauvegarde')
  return merged
}

const withFooterLine = (company: CompanySettings): CompanySettings => ({ ...company, legalLine: companyLegalLine(company) })

export const getDocuments = async (): Promise<CommercialDocument[]> => {
  const raw = await transact<unknown[]>(DOCS_STORE, 'readonly', store => store.getAll())
  return raw.map(normalizeDocument).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** Draft persistence checks the currently stored record before writing, so a stale draft can never overwrite a finalized document. */
export const saveDocument = async (doc: CommercialDocument): Promise<IDBValidKey> => {
  if (doc.status !== 'DRAFT') throw new Error('Un document finalisé ne peut plus être modifié.')
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCS_STORE, 'readwrite')
    const store = tx.objectStore(DOCS_STORE)
    const request = store.get(doc.id) as IDBRequest<unknown>
    let key: IDBValidKey = doc.id
    let settled = false
    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      try { tx.abort() } catch { /* transaction already finished */ }
      db.close()
      reject(error ?? new Error('Sauvegarde impossible'))
    }
    request.onerror = () => fail(request.error)
    request.onsuccess = () => {
      try {
        if (request.result !== undefined) {
          const stored = normalizeDocument(request.result)
          if (stored.status !== 'DRAFT') throw new Error('Ce document a déjà été finalisé dans une autre vue.')
        }
        const put = store.put(doc)
        put.onsuccess = () => { key = put.result }
        put.onerror = () => fail(put.error)
      } catch (error) { fail(error) }
    }
    tx.onerror = () => fail(tx.error)
    tx.onabort = () => fail(tx.error)
    tx.oncomplete = () => {
      if (settled) return
      settled = true
      db.close()
      resolve(key)
    }
  })
}

export const removeDocument = async (id: string) => {
  const documents = await getDocuments()
  const current = documents.find(document => document.id === id)
  if (current && current.status !== 'DRAFT') throw new Error('Un document finalisé ne peut pas être supprimé. Utilisez Annuler.')
  return transact<undefined>(DOCS_STORE, 'readwrite', store => store.delete(id))
}

const sequenceFromNumber = (number: string, year: number) => {
  const match = number.match(new RegExp(`-${year}-(\\d+)$`))
  return match ? Number(match[1]) || 0 : 0
}

export const finalizeDocument = async (doc: CommercialDocument, company: CompanySettings): Promise<CommercialDocument> => {
  if (doc.status !== 'DRAFT') throw new Error('Ce document est déjà finalisé.')
  const issues = validateDocument(doc)
  if (issues.length) throw new Error(issues[0].message)
  const year = Number(doc.date.slice(0, 4))
  if (!Number.isInteger(year) || year < 2000 || year > 9999) throw new Error('Année de document invalide.')

  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([DOCS_STORE, COUNTERS_STORE], 'readwrite')
    const docsStore = tx.objectStore(DOCS_STORE)
    const countersStore = tx.objectStore(COUNTERS_STORE)
    const counterKey = `${doc.type}:${year}`
    const counterRequest = countersStore.get(counterKey) as IDBRequest<CounterRecord | undefined>
    const docsRequest = docsStore.getAll() as IDBRequest<unknown[]>
    let counterLoaded = false
    let counter: CounterRecord | undefined
    let existing: CommercialDocument[] | undefined
    let saved: CommercialDocument | undefined
    let scheduled = false
    let settled = false

    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      try { tx.abort() } catch { /* transaction already finished */ }
      db.close()
      reject(error ?? new Error('Échec de finalisation'))
    }

    const schedule = () => {
      if (scheduled || !counterLoaded || existing === undefined) return
      scheduled = true
      try {
        const storedSameDocument = existing.find(item => item.id === doc.id)
        if (storedSameDocument && storedSameDocument.status !== 'DRAFT') {
          throw new Error(`Ce document est déjà finalisé sous le numéro ${storedSameDocument.number}.`)
        }
        const maxExisting = existing
          .filter(item => item.type === doc.type && item.status !== 'DRAFT')
          .reduce((max, item) => Math.max(max, sequenceFromNumber(item.number, year)), 0)
        const next = Math.max(counter?.last ?? 0, maxExisting) + 1
        const now = new Date().toISOString()
        saved = {
          ...doc,
          number: formatDocumentNumber(doc.type, year, next, company.numberingPrefixes),
          status: 'FINALIZED',
          finalizedAt: now,
          updatedAt: now
        }
        countersStore.put({ key: counterKey, last: next } satisfies CounterRecord)
        docsStore.put(saved)
      } catch (error) { fail(error) }
    }

    counterRequest.onsuccess = () => { counter = counterRequest.result; counterLoaded = true; schedule() }
    docsRequest.onsuccess = () => {
      try { existing = docsRequest.result.map(normalizeDocument); schedule() } catch (error) { fail(error) }
    }
    counterRequest.onerror = () => fail(counterRequest.error)
    docsRequest.onerror = () => fail(docsRequest.error)
    tx.onerror = () => fail(tx.error)
    tx.onabort = () => fail(tx.error)
    tx.oncomplete = () => {
      if (settled) return
      settled = true
      db.close()
      if (!saved) reject(new Error('Finalisation incomplète'))
      else resolve(saved)
    }
  })
}

export const setDocumentStatus = async (id: string, status: 'PAID' | 'CANCELLED'): Promise<CommercialDocument> => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCS_STORE, 'readwrite')
    const store = tx.objectStore(DOCS_STORE)
    const request = store.get(id) as IDBRequest<unknown>
    let saved: CommercialDocument | undefined
    let settled = false
    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      try { tx.abort() } catch { /* transaction already finished */ }
      db.close()
      reject(error ?? new Error('Transition de statut impossible'))
    }
    request.onerror = () => fail(request.error)
    request.onsuccess = () => {
      try {
        const current = normalizeDocument(request.result)
        if (current.status === 'DRAFT') throw new Error('Finalisez le document avant de changer son statut.')
        if (current.status === 'CANCELLED') throw new Error('Un document annulé reste annulé.')
        if (status === 'PAID' && current.type !== 'FACTURE') throw new Error('Seule une facture peut être marquée payée.')
        const now = new Date().toISOString()
        saved = {
          ...current,
          status,
          paidAt: status === 'PAID' ? now : current.paidAt,
          cancelledAt: status === 'CANCELLED' ? now : current.cancelledAt,
          updatedAt: now
        }
        store.put(saved)
      } catch (error) { fail(error) }
    }
    tx.onerror = () => fail(tx.error)
    tx.onabort = () => fail(tx.error)
    tx.oncomplete = () => {
      if (settled) return
      settled = true
      db.close()
      if (!saved) reject(new Error('Transition de statut incomplète'))
      else resolve(saved)
    }
  })
}

export const getCompany = async (): Promise<CompanySettings> => {
  const saved = await transact<unknown | undefined>(SETTINGS_STORE, 'readonly', store => store.get('company'))
  return saved ? normalizeCompany(saved, true) : { ...defaultCompany }
}

export const saveCompany = (company: CompanySettings) => transact<IDBValidKey>(SETTINGS_STORE, 'readwrite', store => store.put(withFooterLine(company), 'company'))

export const createLocalBackup = async (): Promise<LocalBackup> => {
  const [documents, company] = await Promise.all([getDocuments(), getCompany()])
  return { version: BACKUP_VERSION, exportedAt: new Date().toISOString(), documents, company }
}

export const restoreLocalBackup = async (value: unknown): Promise<void> => {
  if (!isRecord(value) || value.version !== BACKUP_VERSION || !Array.isArray(value.documents)) throw new Error('Fichier de sauvegarde non reconnu')
  const documents = value.documents.map(normalizeDocument)
  const company = withFooterLine(normalizeCompany(value.company, true))
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([DOCS_STORE, SETTINGS_STORE, COUNTERS_STORE], 'readwrite')
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
    tx.objectStore(COUNTERS_STORE).clear()
  })
}
