import { describe, expect, it } from 'vitest'
import { pdfTextToCandidateTables } from './pdfLayout'

const expectedPira = [
  ['Désignation', 'Quantité', 'Prix unitaire HT', 'Total HT'],
  ['Boudin en toile imperméable 90/20 cm', '60', '90', '5400'],
  ['Têtière de chirurgie en simili cuir noir (30cm de diamètre)', '8', '150', '1200'],
  ['Têtière de chirurgie en simili cuir noir (25cm de diamètre)', '5', '125', '625'],
  ['Ex. Réparation de canapé de la chambre 309', '1', '400', '400']
]

describe('PDF header boundary — PIRA real split header', () => {
  it('absorbe TOTAL HT dans l’en-tête avant de chercher le corps', () => {
    const text = `FACTURE
DESIGNATION
QUANTITÉ
PRIX UNITAIRE HT
TOTAL HT
Boudin en toile imperméable 90/20 cm
60
90
5400
Têtière de chirurgie en simili cuir noir (30cm de diamètre)
8
150
1200
Têtière de chirurgie en simili cuir noir (25cm de diamètre)
5
125
625
Ex. Réparation de canapé de la chambre 309
1
400
400
TOTAL HT 7625
TVA 1525
TOTAL TTC 9150`
    expect(pdfTextToCandidateTables(text)[0]).toEqual(expectedPira)
  })
})
