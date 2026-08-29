import { describe, expect, it } from 'vitest'
import { createBlankDocument } from './lib'
import { defaultDocumentSearchFilters, filterDocuments, searchableDocumentText } from './documentSearch'
import type { CommercialDocument } from './types'

const makeDocument = (overrides: Partial<CommercialDocument> = {}): CommercialDocument => ({
  ...createBlankDocument('FACTURE', 20),
  id: crypto.randomUUID(),
  number: 'F-2026-0042',
  date: '2026-08-15',
  client: 'Hôtel Atlas',
  clientIce: '001234567890123',
  clientIfNumber: '12345678',
  object: 'Entretien chambres',
  lines: [{
    id: crypto.randomUUID(),
    designation: 'Nettoyage tapis premium',
    unit: 'forfait',
    quantity: 2,
    unitPriceHT: 500,
    vatRate: 20,
    discountPercent: 0
  }],
  status: 'FINALIZED',
  ...overrides
})

describe('document search', () => {
  it('indexes ICE, IF and line designations accent-insensitively', () => {
    const document = makeDocument()
    const text = searchableDocumentText(document)
    expect(text).toContain('001234567890123')
    expect(text).toContain('12345678')
    expect(text).toContain('nettoyage tapis premium')
    expect(text).toContain('hotel atlas')
  })

  it('finds a document by ICE', () => {
    const document = makeDocument()
    expect(filterDocuments([document], { ...defaultDocumentSearchFilters(), query: '001234567890123' })).toHaveLength(1)
  })

  it('finds a document by line designation', () => {
    const document = makeDocument()
    expect(filterDocuments([document], { ...defaultDocumentSearchFilters(), query: 'TAPIS PREMIUM' })).toHaveLength(1)
  })

  it('filters by TTC amount range', () => {
    const document = makeDocument()
    expect(filterDocuments([document], { ...defaultDocumentSearchFilters(), amountMin: '1100', amountMax: '1300' })).toHaveLength(1)
    expect(filterDocuments([document], { ...defaultDocumentSearchFilters(), amountMin: '1300' })).toHaveLength(0)
  })

  it('filters current month and current year deterministically', () => {
    const august = makeDocument({ date: '2026-08-15' })
    const july = makeDocument({ id: crypto.randomUUID(), date: '2026-07-31' })
    const previousYear = makeDocument({ id: crypto.randomUUID(), date: '2025-08-15' })
    const now = new Date('2026-08-29T12:00:00')
    expect(filterDocuments([august, july, previousYear], { ...defaultDocumentSearchFilters(), period: 'THIS_MONTH' }, now)).toEqual([august])
    expect(filterDocuments([august, july, previousYear], { ...defaultDocumentSearchFilters(), period: 'THIS_YEAR' }, now)).toEqual([august, july])
  })

  it('supports custom inclusive date bounds', () => {
    const document = makeDocument({ date: '2026-08-15' })
    expect(filterDocuments([document], { ...defaultDocumentSearchFilters(), period: 'CUSTOM', dateFrom: '2026-08-15', dateTo: '2026-08-15' })).toHaveLength(1)
    expect(filterDocuments([document], { ...defaultDocumentSearchFilters(), period: 'CUSTOM', dateFrom: '2026-08-16', dateTo: '' })).toHaveLength(0)
  })

  it('keeps hidden-price BL at amount zero for amount filters', () => {
    const bl = makeDocument({ type: 'BL', blShowPrices: false })
    expect(filterDocuments([bl], { ...defaultDocumentSearchFilters(), amountMax: '0' })).toHaveLength(1)
    expect(filterDocuments([bl], { ...defaultDocumentSearchFilters(), amountMin: '1' })).toHaveLength(0)
  })
})
