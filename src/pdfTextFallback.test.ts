import { describe, expect, it } from 'vitest'
import { pdfItemsToCandidateTables, pdfTextToCandidateTables } from './pdfLayout'

const item = (str: string, x: number, y: number, width = 0) => ({ str, transform: [1, 0, 0, 1, x, y], width })

const expectedPira = [
  ['Désignation', 'Quantité', 'Prix unitaire HT', 'Total HT'],
  ['Boudin en toile imperméable 90/20 cm', '60', '90', '5400'],
  ['Têtière de chirurgie en simili cuir noir (30cm de diamètre)', '8', '150', '1200'],
  ['Têtière de chirurgie en simili cuir noir (25cm de diamètre)', '5', '125', '625'],
  ['Ex. Réparation de canapé de la chambre 309', '1', '400', '400']
]

const piraText = `FACTURE
# 2408 -2026
Client : CLINIQUE
NATIONS UNIS
24 AOUT 2026
DESIGNATION\tQUANTITÉ\tPRIX UNITAIRE HT\tTOTAL HT
Boudin en toile imperméable
60\t90\t5400
90/20 cm
Têtière de chirurgie en simili cuir
8\t150\t1200
noir (30cm de diamètre )
Têtière de chirurgie en simili cuir
5\t125\t625
noir (25cm de diamètre)
Ex. Réparation de canapé de la
1\t400\t400
chambre 309
TOTAL HT 7625
TVA 1525
TOTAL TTC 9150`

describe('PDF text fallback — PIRA', () => {
  it('reconstruit 4/4 lignes depuis le texte seul', () => {
    expect(pdfTextToCandidateTables(piraText)[0]).toEqual(expectedPira)
  })

  it('reste fonctionnel quand les baselines numériques sont désalignées', () => {
    const unstable = [
      item('DESIGNATION QUANTITÉ PRIX UNITAIRE HT TOTAL HT', 100, 700, 420),
      item('Boudin en toile imperméable', 72, 640),
      item('60', 264, 633), item('90', 371, 630), item('5400', 478, 627), item('90/20 cm', 117, 624),
      item('Têtière de chirurgie en simili cuir', 63, 572),
      item('8', 267, 565), item('150', 368, 562), item('1200', 478, 559), item('noir (30cm de diamètre )', 82, 556),
      item('Têtière de chirurgie en simili cuir', 63, 505),
      item('5', 267, 498), item('125', 368, 495), item('625', 481, 492), item('noir (25cm de diamètre)', 83, 489),
      item('Ex. Réparation de canapé de la', 67, 440),
      item('1', 267, 433), item('400', 368, 430), item('400', 481, 427), item('chambre 309', 109, 424),
      item('TOTAL HT 7625', 245, 380)
    ]
    expect(pdfItemsToCandidateTables(unstable)[0]).toEqual(expectedPira)
  })

  it('préserve un tableau TVA', () => {
    const text = `Désignation\tQuantité\tPrix unitaire HT\tTVA
Drap blanc\t10\t50\t20
TOTAL HT 500`
    expect(pdfTextToCandidateTables(text)[0]).toEqual([
      ['Désignation', 'Quantité', 'Prix unitaire HT', 'TVA'],
      ['Drap blanc', '10', '50', '20']
    ])
  })

  it('ne crée pas de lignes sans en-tête métier', () => {
    expect(pdfTextToCandidateTables('FACTURE\nTOTAL HT 7625')).toEqual([])
  })
})
