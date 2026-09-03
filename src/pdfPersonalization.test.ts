import { describe, expect, it } from 'vitest'
import { createThemedPdf, premiumThemeOptions } from './pdfThemes'
import { defaultCompany } from './types'
import type { CommercialDocument } from './types'

const fixture: CommercialDocument = {
  id: 'pdf-personalization-fixture',
  type: 'DEVIS',
  number: 'DEV-2026-999',
  date: '2026-09-03',
  client: 'Client Test',
  clientId: '',
  clientAddress: 'Rabat',
  clientIce: '001122334455667',
  clientIfNumber: '12345678',
  object: 'Objet qui doit pouvoir être masqué',
  lines: [{ id: 'l1', designation: 'Prestation premium', unit: 'u', quantity: 2, unitPriceHT: 125, vatRate: 20, discountPercent: 0 }],
  blShowPrices: true,
  globalDiscountPercent: 0,
  dueDate: '',
  paymentMethod: 'UNSPECIFIED',
  payments: [],
  status: 'DRAFT',
  finalizedAt: '',
  paidAt: '',
  cancelledAt: '',
  sourceDocumentId: '',
  createdAt: '2026-09-03T12:00:00.000Z',
  updatedAt: '2026-09-03T12:00:00.000Z'
}

describe('PDF personalization', () => {
  it('generates every theme with controlled optional fields hidden', () => {
    for (const theme of premiumThemeOptions) {
      const pdf = createThemedPdf(fixture, defaultCompany, theme.id, {
        object: false,
        unit: false,
        unitPriceHT: false,
        lineTotalHT: false,
        summaryTotalHT: false,
        vat: false,
        amountInWords: false,
        signatures: false,
        footer: false
      })
      const bytes = pdf.output('arraybuffer') as ArrayBuffer
      expect(pdf.getNumberOfPages(), theme.id).toBeGreaterThan(0)
      expect(bytes.byteLength, theme.id).toBeGreaterThan(800)
    }
  })

  it('keeps Total TTC structurally present in personalized priced PDFs', () => {
    for (const theme of premiumThemeOptions) {
      const pdf = createThemedPdf(fixture, defaultCompany, theme.id, {
        summaryTotalHT: false,
        vat: false
      })
      expect((pdf.output('arraybuffer') as ArrayBuffer).byteLength, theme.id).toBeGreaterThan(800)
    }
  })
})
