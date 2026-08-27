import { describe, expect, it } from 'vitest'
import {
  detectInputKind,
  extractedInputToRawQuote,
  matrixToObjects,
  pdfItemsToText,
  pickBestQuoteTable,
  textToCandidateTables
} from './inputExtractors'

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

  it('reconstruit un tableau depuis du texte OCR espacé', () => {
    const tables = textToCandidateTables([
      'Client: Hotel Atlas',
      'Article                         Qte     P.U     TVA',
      'Drap blanc 240x300              10      50      20',
      'Serviette bain 70x140           20      25      20'
    ].join('\n'))
    expect(pickBestQuoteTable(tables)).toEqual([
      { Article: 'Drap blanc 240x300', Qte: '10', 'P.U': '50', TVA: '20' },
      { Article: 'Serviette bain 70x140', Qte: '20', 'P.U': '25', TVA: '20' }
    ])
  })

  it('reconstruit des lignes PDF positionnées en colonnes', () => {
    const text = pdfItemsToText([
      { str: 'Article', transform: [1, 0, 0, 1, 50, 700] },
      { str: 'Qté', transform: [1, 0, 0, 1, 250, 700] },
      { str: 'P.U', transform: [1, 0, 0, 1, 350, 700] },
      { str: 'TVA', transform: [1, 0, 0, 1, 430, 700] },
      { str: 'Drap', transform: [1, 0, 0, 1, 50, 680] },
      { str: '10', transform: [1, 0, 0, 1, 250, 680] },
      { str: '50', transform: [1, 0, 0, 1, 350, 680] },
      { str: '20', transform: [1, 0, 0, 1, 430, 680] }
    ])
    expect(text).toBe('Article\tQté\tP.U\tTVA\nDrap\t10\t50\t20')
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

  it('utilise le tableau inféré pour un screenshot OCR', () => {
    const raw = extractedInputToRawQuote({
      kind: 'IMAGE',
      name: 'screen.png',
      mimeType: 'image/png',
      text: [
        'Client: Hotel Atlas',
        'Objet: Fourniture textile',
        'Date: 27/08/2026',
        'Devise: MAD',
        'Article                         Qte     P.U     TVA',
        'Drap blanc 240x300              10      50      20'
      ].join('\n'),
      tables: [],
      warnings: []
    })
    expect(raw.client?.name).toBe('Hotel Atlas')
    expect(raw.lines).toEqual([{ Article: 'Drap blanc 240x300', Qte: '10', 'P.U': '50', TVA: '20' }])
  })
})
