import { describe, expect, it } from 'vitest'
import {
  amountToFrenchDirhams,
  documentTotals,
  formatDocumentNumber,
  numberToFrench,
  validateDocument
} from './lib'
import type { CommercialDocument } from './types'

const baseDocument = (): CommercialDocument => ({
  id: '1',
  type: 'FACTURE',
  number: '',
  date: '2026-07-06',
  client: 'Client',
  object: 'Test',
  blShowPrices: false,
  globalDiscountPercent: 0,
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
  it('reproduit le calcul de la facture de référence', () => {
    expect(documentTotals(baseDocument())).toEqual({
      linesHT: 8000,
      globalDiscount: 0,
      totalHT: 8000,
      totalVAT: 1600,
      totalTTC: 9600
    })
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
      totalVAT: 42.12,
      totalTTC: 294.12
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
