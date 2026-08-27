import { describe, expect, it } from 'vitest'
import { correctImportText, prepareImportDictionary } from './importDictionary'

const rawFixture = () => ({
  source: { kind: 'EXCEL', name: 'bc.xlsx' },
  client: { name: 'Hotel Azur Marrakech' },
  object: 'Renouvelement linge hotellerie',
  date: '27/08/2026',
  currency: 'MAD',
  lines: [
    { Article: 'Drapp blanc 240x300', Unite: 'pcs', Qte: 12, 'P.U': 48.5, TVA: 20 },
    { Article: 'Serviette bainn 70x140', Unite: 'unite', Qte: 30, 'P.U': 24.9, TVA: 20 },
    { Article: 'Nappe rectangulair 180x300', Unite: 'metres', Qte: 8, 'P.U': 72, TVA: 20 }
  ]
})

describe('importDictionary', () => {
  it('corrige uniquement les fautes lexicales explicitement connues', () => {
    expect(correctImportText('Renouvelement linge hotellerie')).toBe('Renouvellement linge hôtellerie')
    expect(correctImportText('Drapp blanc 240x300')).toBe('Drap blanc 240x300')
    expect(correctImportText('Drapeau publicitaire')).toBe('Drapeau publicitaire')
  })

  it('prépare un dictionnaire exact pour les désignations et corrige l’objet', () => {
    const prepared = prepareImportDictionary(rawFixture())
    expect(prepared.raw.object).toBe('Renouvellement linge hôtellerie')
    expect(prepared.dictionary.designations).toEqual({
      'Drapp blanc 240x300': 'Drap blanc 240x300',
      'Serviette bainn 70x140': 'Serviette bain 70x140',
      'Nappe rectangulair 180x300': 'Nappe rectangulaire 180x300'
    })
    expect(prepared.raw.lines?.[0]?.Article).toBe('Drapp blanc 240x300')
  })
})
