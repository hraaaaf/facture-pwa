import { describe, expect, it } from 'vitest'
import type { CanonicalQuoteJSON } from './quoteImport'
import {
  defaultQuoteImportSelection,
  isImportableQuoteLine,
  selectedQuoteImportCount,
  selectedQuoteToDraftFields
} from './quoteImportSelection'

const quote: CanonicalQuoteJSON = {
  schemaVersion: 1,
  source: { kind: 'PDF', name: 'devis.pdf' },
  client: {
    name: 'Institut Atlas',
    address: 'Rabat',
    ice: '001122334455667',
    ifNumber: '12345678'
  },
  quote: {
    object: 'Changement toile',
    date: '2026-09-18',
    currency: 'MAD',
    globalDiscountPercent: 5
  },
  lines: [
    {
      designation: 'Réparation toile',
      unit: 'Unité',
      quantity: 1,
      unitPriceHT: 1500,
      vatRate: 20,
      discountPercent: 0,
      origins: {
        designation: 'SOURCE',
        unit: 'DEFAULT',
        quantity: 'SOURCE',
        unitPriceHT: 'SOURCE',
        vatRate: 'SOURCE',
        discountPercent: 'DEFAULT'
      }
    },
    {
      designation: 'Ligne incomplète',
      unit: 'Unité',
      quantity: null,
      unitPriceHT: 300,
      vatRate: 20,
      discountPercent: 0,
      origins: {
        designation: 'SOURCE',
        unit: 'DEFAULT',
        quantity: null,
        unitPriceHT: 'SOURCE',
        vatRate: 'SOURCE',
        discountPercent: 'DEFAULT'
      }
    }
  ],
  status: 'REVIEW_REQUIRED',
  issues: [{ code: 'QUANTITY_REQUIRED', field: 'lines.1.quantity', severity: 'ERROR', message: 'Article 2 : quantité à vérifier.' }]
}

describe('selective quote import', () => {
  it('preselects detected metadata and only complete lines', () => {
    const selection = defaultQuoteImportSelection(quote)
    expect(selection.fields).toEqual({
      client: true,
      object: true,
      date: true,
      clientAddress: true,
      clientIce: true,
      clientIfNumber: true,
      globalDiscountPercent: true
    })
    expect(selection.lines).toEqual([true, false])
    expect(selectedQuoteImportCount(selection)).toBe(8)
  })

  it('keeps unchecked detected fields deliberately empty', () => {
    const selection = defaultQuoteImportSelection(quote)
    selection.fields.object = false
    selection.fields.clientAddress = false
    selection.fields.clientIce = false
    selection.fields.clientIfNumber = false
    selection.fields.globalDiscountPercent = false

    const fields = selectedQuoteToDraftFields(quote, selection, () => 'line-1')
    expect(fields.client).toBe('Institut Atlas')
    expect(fields.object).toBe('')
    expect(fields.clientAddress).toBe('')
    expect(fields.clientIce).toBe('')
    expect(fields.clientIfNumber).toBe('')
    expect(fields.globalDiscountPercent).toBe(0)
    expect(fields.lines).toHaveLength(1)
    expect(fields.lines[0].designation).toBe('Réparation toile')
  })

  it('never invents a missing line value just to make it importable', () => {
    expect(isImportableQuoteLine(quote.lines[1])).toBe(false)
    const selection = defaultQuoteImportSelection(quote)
    selection.lines[1] = true
    expect(selectedQuoteToDraftFields(quote, selection).lines).toHaveLength(1)
  })
})
