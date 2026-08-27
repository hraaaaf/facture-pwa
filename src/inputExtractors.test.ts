import { describe, expect, it } from 'vitest'
import { detectInputKind, extractedInputToRawQuote, matrixToObjects, pickBestQuoteTable } from './inputExtractors'

describe('F2 — détection des inputs', () => {
  it('reconnaît PDF, Excel, Word, image et texte', () => {
    expect(detectInputKind({ name: 'devis.pdf', type: 'application/pdf' })).toBe('PDF')
    expect(detectInputKind({ name: 'prix.xlsx', type: '' })).toBe('EXCEL')
    expect(detectInputKind({ name: 'client.docx', type: '' })).toBe('WORD')
    expect(detectInputKind({ name: 'screen.png', type: 'image/png' })).toBe('IMAGE')
    expect(detectInputKind({ name: 'note.txt', type: 'text/plain' })).toBe('TEXT')
    expect(detectInputKind({ name: 'archive.zip', type: 'application/zip' })).toBe('UNKNOWN')
  })
})

describe('F2 — tableaux vers RawQuotePayload', () => {
  it('transforme une matrice avec en-têtes en objets sans inventer les cellules absentes', () => {
    expect(matrixToObjects([
      ['Article', 'Qté', 'P.U', 'TVA'],
      ['Serviette', 10, '25,00', '20%'],
      ['Drap', 4, null, '20%']
    ])).toEqual([
      { Article: 'Serviette', 'Qté': 10, 'P.U': '25,00', TVA: '20%' },
      { Article: 'Drap', 'Qté': 4, 'P.U': null, TVA: '20%' }
    ])
  })

  it('choisit le tableau ressemblant le plus à des lignes de devis', () => {
    const picked = pickBestQuoteTable([
      [['Nom', 'Téléphone'], ['Client', '0600000000']],
      [['Désignation', 'Qté', 'P.U', 'TVA'], ['Drap', 10, 50, 20]]
    ])
    expect(picked).toEqual([{ 'Désignation': 'Drap', 'Qté': 10, 'P.U': 50, TVA: 20 }])
  })

  it('extrait métadonnées et lignes sans compléter les champs absents', () => {
    const raw = extractedInputToRawQuote({
      kind: 'EXCEL',
      name: 'hotel.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      text: 'Client: Hôtel Atlas\nObjet: Linge\nDate: 27/08/2026\nDevise: MAD',
      tables: [[
        ['Article', 'Qté', 'P.U', 'TVA'],
        ['Drap', 10, 50, 20],
        ['Serviette', 20, null, 20]
      ]],
      warnings: []
    })

    expect(raw).toMatchObject({
      source: { kind: 'EXCEL', name: 'hotel.xlsx' },
      client: { name: 'Hôtel Atlas' },
      object: 'Linge',
      date: '27/08/2026',
      currency: 'MAD'
    })
    expect(raw.lines?.[1]).toMatchObject({ Article: 'Serviette', 'P.U': null })
  })
})
