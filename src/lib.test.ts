import { describe, expect, it } from 'vitest'
import {
  amountToFrenchDirhams,
  documentTotals,
  formatDocumentNumber,
  numberToFrench,
  validateDocument,
  validateNumberingPrefixes
} from './lib'
import { sourceReferenceInvoice, sourceReferenceSimpleDeliveryNote } from './referenceFixture'
import type { CommercialDocument } from './types'

const baseDocument = (): CommercialDocument => ({
  id: '1',
  type: 'FACTURE',
  number: '',
  date: '2026-07-06',
  client: 'Client',
  clientId: '',
  clientAddress: '',
  clientIce: '',
  clientIfNumber: '',
  object: 'Test',
  blShowPrices: false,
  globalDiscountPercent: 0,
  dueDate: '',
  paymentMethod: 'UNSPECIFIED',
  payments: [],
  status: 'DRAFT',
  finalizedAt: '',
  paidAt: '',
  cancelledAt: '',
  sourceDocumentId: '',
  createdAt: '',
  updatedAt: '',
  lines: [
    { id: 'a', designation: 'Article', unit: 'Pièce', quantity: 10, unitPriceHT: 800, vatRate: 20, discountPercent: 0 }
  ]
})

describe('documentTotals', () => {
  it('reproduit exactement le calcul de la facture source de juillet 2026', () => {
    expect(documentTotals(sourceReferenceInvoice())).toEqual({
      linesHT: 8000,
      globalDiscount: 0,
      totalHT: 8000,
      totalVAT: 1600,
      totalTTC: 9600
    })
  })

  it('conserve le BL simple sans prix comme fixture indépendante', () => {
    const bl = sourceReferenceSimpleDeliveryNote()
    expect(bl.blShowPrices).toBe(false)
    expect(bl.number).toBe('06-07-2026')
    expect(bl.lines[0]).toMatchObject({ quantity: 10, unit: 'Pièce', unitPriceHT: 800, vatRate: 20 })
  })

  it('applique remise ligne puis remise globale avant TVA', () => {
    const document = baseDocument()
    document.lines = [
      { id: 'a', designation: 'A', unit: 'Pièce', quantity: 2, unitPriceHT: 100, vatRate: 20, discountPercent: 10 },
      { id: 'b', designation: 'B', unit: 'Pièce', quantity: 1, unitPriceHT: 100, vatRate: 10, discountPercent: 0 }
    ]
    document.globalDiscountPercent = 10
    expect(documentTotals(document)).toEqual({
      linesHT: 280,
      globalDiscount: 28,
      totalHT: 252,
      totalVAT: 41.4,
      totalTTC: 293.4
    })
  })
})

describe('validation métier', () => {
  it('refuse quantité nulle, TVA hors plage et client vide', () => {
    const document = baseDocument()
    document.client = ''
    document.lines[0].quantity = 0
    document.lines[0].vatRate = 120
    const messages = validateDocument(document).map(issue => issue.message)
    expect(messages.some(message => message.includes('client'))).toBe(true)
    expect(messages.some(message => message.includes('quantité'))).toBe(true)
    expect(messages.some(message => message.includes('TVA'))).toBe(true)
  })
})

describe('numérotation', () => {
  it('formate une séquence indépendante par type', () => {
    expect(formatDocumentNumber('FACTURE', 2026, 1)).toBe('F-2026-001')
    expect(formatDocumentNumber('DEVIS', 2026, 12)).toBe('DEV-2026-012')
    expect(formatDocumentNumber('BL', 2027, 3)).toBe('BL-2027-003')
  })

  it('supporte des préfixes configurables', () => {
    expect(formatDocumentNumber('FACTURE', 2026, 7, { DEVIS: 'D', FACTURE: 'FAC', BL: 'LIV', BC: 'CMD' }))
      .toBe('FAC-2026-007')
  })

  it('refuse les préfixes vides ou dupliqués', () => {
    expect(validateNumberingPrefixes({ DEVIS: 'DEV', FACTURE: 'F', BL: 'BL', BC: '' })).toContain('préfixe')
    expect(validateNumberingPrefixes({ DEVIS: 'F', FACTURE: 'F', BL: 'BL', BC: 'BC' })).toContain('distinct')
    expect(() => formatDocumentNumber('FACTURE', 2026, 1, { DEVIS: 'F', FACTURE: 'F', BL: 'BL', BC: 'BC' }))
      .toThrow('distinct')
  })
})

describe('montants en lettres', () => {
  it('reproduit le montant du modèle fourni', () => {
    expect(amountToFrenchDirhams(9600)).toBe('NEUF MILLE SIX CENTS DIRHAMS')
  })

  it('gère les formes françaises usuelles', () => {
    expect(numberToFrench(71)).toBe('soixante et onze')
    expect(numberToFrench(80)).toBe('quatre-vingts')
    expect(numberToFrench(2026)).toBe('deux mille vingt-six')
  })
})
