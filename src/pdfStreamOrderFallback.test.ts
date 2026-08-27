import { describe, expect, it } from 'vitest'
import { pdfItemsToCandidateTables } from './pdfLayout'

const item = (str: string) => ({ str, transform: [1, 0, 0, 1, 0, 0], width: 0 })

const expected = [
  ['Désignation', 'Quantité', 'Prix unitaire HT', 'Total HT'],
  ['Boudin en toile imperméable 90/20 cm', '60', '90', '5400'],
  ['Têtière de chirurgie en simili cuir noir (30cm de diamètre)', '8', '150', '1200'],
  ['Têtière de chirurgie en simili cuir noir (25cm de diamètre)', '5', '125', '625'],
  ['Ex. Réparation de canapé de la chambre 309', '1', '400', '400']
]

const rawOrder = [
  'DESIGNATION QUANTITÉ PRIX UNITAIRE HT TOTAL HT',
  'Boudin en toile imperméable', '90/20 cm', '60 90 5400',
  'Têtière de chirurgie en simili cuir', 'noir (30cm de diamètre )', '8 150 1200',
  'Têtière de chirurgie en simili cuir', 'noir (25cm de diamètre)', '5 125 625',
  'Ex. Réparation de canapé de la', 'chambre 309', '1 400 400',
  'TOTAL HT 7625', 'TVA 1525', 'TOTAL TTC. 9150',
  'FACTURE', '#2408-2026', 'Client : CLINIQUE', 'NATIONS UNIS', '24 AOUT 2026'
]

describe('PDF stream-order fallback', () => {
  it('reconstruit PIRA sans aucune coordonnée exploitable', () => {
    expect(pdfItemsToCandidateTables(rawOrder.map(item))[0]).toEqual(expected)
  })

  it('refuse un faux tableau sans en-tête métier', () => {
    expect(pdfItemsToCandidateTables(['FACTURE', '60 90 5400', 'TOTAL HT 5400'].map(item))).toEqual([])
  })
})
