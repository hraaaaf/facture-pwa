import { describe, expect, it } from 'vitest'
import { amountToFrenchDirhams, documentTotals, numberToFrench } from './lib'
import type { CommercialDocument } from './types'

describe('documentTotals', () => {
  it('calcule HT, TVA et TTC ligne par ligne', () => {
    const document: CommercialDocument = {
      id: '1',
      type: 'FACTURE',
      number: 'F-2026-001',
      date: '2026-07-06',
      client: 'Client',
      object: 'Test',
      blShowPrices: false,
      createdAt: '',
      updatedAt: '',
      lines: [
        { id: 'a', designation: 'Article', unit: 'Pièce', quantity: 10, unitPriceHT: 800, vatRate: 20 }
      ]
    }

    expect(documentTotals(document)).toEqual({ totalHT: 8000, totalVAT: 1600, totalTTC: 9600 })
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
