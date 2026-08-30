import { describe, expect, it } from 'vitest'
import { clientDocumentSnapshot, normalizeManagedCatalogItem, normalizeManagedClient } from './entityManagement'
import type { CatalogItem, ClientProfile } from './types'

const client = (): ClientProfile => ({
  id: 'c1', name: ' Achraf ', company: ' SANINOVA ', address: ' Rabat ', ice: ' 001 ', ifNumber: ' 123 ', phone: ' 0600 ', email: ' test@example.com ', usageCount: 2, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
})

const item = (): CatalogItem => ({
  id: 'i1', designation: ' Gants latex ', unit: ' Boîte ', lastUnitPriceHT: 42, vatRate: 20, usageCount: 3, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
})

describe('entity management', () => {
  it('normalizes client fields without changing identity or usage', () => {
    const saved = normalizeManagedClient(client())
    expect(saved).toMatchObject({ id: 'c1', name: 'Achraf', company: 'SANINOVA', address: 'Rabat', ice: '001', ifNumber: '123', phone: '0600', usageCount: 2 })
  })

  it('requires a client name or company', () => {
    expect(() => normalizeManagedClient({ ...client(), name: ' ', company: ' ' })).toThrow(/Nom ou société requis/)
  })

  it('normalizes and validates catalog items', () => {
    expect(normalizeManagedCatalogItem(item())).toMatchObject({ designation: 'Gants latex', unit: 'Boîte', lastUnitPriceHT: 42, vatRate: 20 })
    expect(() => normalizeManagedCatalogItem({ ...item(), lastUnitPriceHT: -1 })).toThrow(/Prix HT invalide/)
    expect(() => normalizeManagedCatalogItem({ ...item(), vatRate: 101 })).toThrow(/TVA invalide/)
  })

  it('creates an immutable document snapshot independent from later client edits', () => {
    const source = client()
    const snapshot = clientDocumentSnapshot(source)
    source.company = 'NOUVEAU NOM'
    source.address = 'Casablanca'
    expect(snapshot).toEqual({ client: 'SANINOVA', clientId: 'c1', clientAddress: ' Rabat ', clientIce: ' 001 ', clientIfNumber: ' 123 ' })
  })
})
