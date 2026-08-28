import { describe, expect, it } from 'vitest'
import { pdfItemsToCandidateTables } from './pdfLayout'

const item = (str: string, x: number, y: number, width = 0) => ({ str, transform: [1, 0, 0, 1, x, y], width })

const expectedPira = [[
  'Désignation', 'Quantité', 'Prix unitaire HT', 'Total HT'
], [
  'Boudin en toile imperméable 90/20 cm', '60', '90', '5400'
], [
  'Têtière de chirurgie en simili cuir noir (30cm de diamètre)', '8', '150', '1200'
], [
  'Têtière de chirurgie en simili cuir noir (25cm de diamètre)', '5', '125', '625'
], [
  'Ex. Réparation de canapé de la chambre 309', '1', '400', '400'
]]

const piraBody = () => [
  item('Boudin en toile imperméable', 72, 640), item('90/20 cm', 117, 625),
  item('60', 264, 633), item('90', 371, 633), item('5400', 478, 633),
  item('Têtière de chirurgie en simili cuir', 63, 572), item('noir (30cm de diamètre )', 82, 557),
  item('8', 267, 565), item('150', 368, 565), item('1200', 478, 565),
  item('Têtière de chirurgie en simili cuir', 63, 505), item('noir (25cm de diamètre)', 83, 490),
  item('5', 267, 498), item('125', 368, 498), item('625', 481, 498),
  item('Ex. Réparation de canapé de la', 67, 440), item('chambre 309', 109, 425),
  item('1', 267, 433), item('400', 368, 433), item('400', 481, 433),
  item('TOTAL HT 7625', 245, 380), item('FACTURE', 36, 820), item('Client : CLINIQUE', 38, 760)
]

describe('PDF layout — tableaux robustes', () => {
  it('reconstruit les 4 lignes PIRA quand les cellules d’en-tête sont séparées', () => {
    expect(pdfItemsToCandidateTables([
      item('DESIGNATION', 100, 700, 70), item('QUANTITÉ', 242, 700, 54),
      item('PRIX UNITAIRE HT', 332, 700, 92), item('TOTAL HT', 465, 700, 52),
      ...piraBody()
    ])[0]).toEqual(expectedPira)
  })

  it('reconstruit les 4 lignes PIRA quand PDF.js fusionne tout l’en-tête', () => {
    expect(pdfItemsToCandidateTables([
      item('DESIGNATION QUANTITÉ PRIX UNITAIRE HT TOTAL HT', 100, 700, 420),
      ...piraBody()
    ])[0]).toEqual(expectedPira)
  })

  it('préserve un tableau avec TVA comme quatrième colonne', () => {
    const table = pdfItemsToCandidateTables([
      item('Désignation Quantité Prix unitaire HT TVA', 70, 700, 400),
      item('Drap blanc', 70, 650, 80), item('10', 260, 650), item('50', 360, 650), item('20', 460, 650)
    ])[0]
    expect(table).toEqual([
      ['Désignation', 'Quantité', 'Prix unitaire HT', 'TVA'],
      ['Drap blanc', '10', '50', '20']
    ])
  })

  it('ne crée aucune ligne si aucun en-tête de devis n’est présent', () => {
    expect(pdfItemsToCandidateTables([
      item('FACTURE', 50, 700), item('TOTAL HT', 300, 500), item('7625', 450, 500)
    ])).toEqual([])
  })
})
