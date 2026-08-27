import { describe, expect, it } from 'vitest'
import { voiceToRawQuote } from './voiceQuoteParser'

const cleanText = (value: unknown) => typeof value === 'string' ? value.replace(/[,;:]$/, '') : ''
const getLine = (raw: ReturnType<typeof voiceToRawQuote>, index = 0) => raw.lines?.[index] as Record<string, unknown> | undefined

const structuredCases = [
  {
    name: 'exact user wording with articles and c’est',
    text: "le client c'est Pierre, l'objet c'est des draps, la désignation c'est des draps de 250 centimètres, le prix unitaire c'est 150 dirhams, quantité c'est 6 articles",
    client: 'Pierre', object: 'des draps', designation: 'des draps de 250 centimètres', quantity: 6, price: 150, vat: 20
  },
  {
    name: 'same wording with spoken price and quantity',
    text: "le client c'est Pierre, l'objet c'est des draps, la désignation c'est des draps de 250 centimètres, le prix unitaire c'est cent cinquante dirhams, la quantité c'est six articles",
    client: 'Pierre', object: 'des draps', designation: 'des draps de 250 centimètres', quantity: 6, price: 150, vat: 20
  },
  {
    name: 'no punctuation',
    text: 'client Pierre objet draps désignation draps 250 cm quantité 6 prix unitaire 150 dirhams',
    client: 'Pierre', object: 'draps', designation: 'draps 250 cm', quantity: 6, price: 150, vat: 20
  },
  {
    name: 'semicolon abbreviations',
    text: 'client: Pierre; objet: draps; désignation: draps 250 cm; PU: 150 MAD; QTE: 6',
    client: 'Pierre', object: 'draps', designation: 'draps 250 cm', quantity: 6, price: 150, vat: 20
  },
  {
    name: 'accentless labels',
    text: 'client Pierre, objet draps, designation draps 250 cm, prix unitaire 150, quantite 6',
    client: 'Pierre', object: 'draps', designation: 'draps 250 cm', quantity: 6, price: 150, vat: 20
  },
  {
    name: 'qté and prix unité aliases',
    text: 'client Pierre objet draps désignation draps 250 cm qté six prix unité cent cinquante dirhams',
    client: 'Pierre', object: 'draps', designation: 'draps 250 cm', quantity: 6, price: 150, vat: 20
  },
  {
    name: 'price before quantity',
    text: 'client Pierre objet draps désignation draps 250 cm prix unitaire 150 dirhams quantité 6',
    client: 'Pierre', object: 'draps', designation: 'draps 250 cm', quantity: 6, price: 150, vat: 20
  },
  {
    name: 'quantity before price',
    text: 'client Pierre objet draps désignation draps 250 cm quantité 6 prix unitaire 150 dirhams',
    client: 'Pierre', object: 'draps', designation: 'draps 250 cm', quantity: 6, price: 150, vat: 20
  },
  {
    name: 'decimal comma quantity and price',
    text: 'client Pierre objet tissu désignation tissu technique quantité 1,5 prix unitaire 150,50 dirhams',
    client: 'Pierre', object: 'tissu', designation: 'tissu technique', quantity: 1.5, price: 150.5, vat: 20
  },
  {
    name: 'explicit numeric VAT',
    text: 'client Pierre objet draps désignation draps quantité 6 prix unitaire 150 tva 10 %',
    client: 'Pierre', object: 'draps', designation: 'draps', quantity: 6, price: 150, vat: 10
  },
  {
    name: 'explicit spoken VAT',
    text: 'client Pierre objet draps désignation draps quantité six prix unitaire cent cinquante tva vingt pour cent',
    client: 'Pierre', object: 'draps', designation: 'draps', quantity: 6, price: 150, vat: 20
  },
  {
    name: 'uppercase labels',
    text: 'CLIENT Pierre OBJET Draps DÉSIGNATION Draps 250 cm QUANTITÉ 6 PRIX UNITAIRE 150 MAD',
    client: 'Pierre', object: 'Draps', designation: 'Draps 250 cm', quantity: 6, price: 150, vat: 7
  },
  {
    name: 'extra introductory words before fields',
    text: "voilà le devis le client c'est Pierre, l'objet c'est des draps, la désignation c'est draps 250 cm, la quantité c'est six, le prix unitaire c'est 150 dirhams",
    client: 'Pierre', object: 'des draps', designation: 'draps 250 cm', quantity: 6, price: 150, vat: 20
  }
] as const

describe('voiceToRawQuote structured French dictation', () => {
  for (const testCase of structuredCases) {
    it(testCase.name, () => {
      const raw = voiceToRawQuote(testCase.text, testCase.name === 'uppercase labels' ? 7 : 20)
      expect(cleanText(raw.client?.name)).toBe(testCase.client)
      expect(cleanText(raw.object)).toBe(testCase.object)
      expect(raw.lines).toHaveLength(1)
      expect(getLine(raw)).toMatchObject({
        designation: testCase.designation,
        quantity: testCase.quantity,
        unitPriceHT: testCase.price,
        vatRate: testCase.vat,
        unit: 'Unité',
        discountPercent: 0
      })
    })
  }
})

const compactCases = [
  {
    name: 'exact real-device retest phrase with spoken quantity',
    text: 'Client Pierre, six draps 250 centimètres à 150 dirhams.',
    designation: 'draps 250 centimètres', quantity: 6, price: 150
  },
  {
    name: 'legacy numeric compact phrase',
    text: 'Client Hôtel Atlas, 200 draps à 85 dirhams, TVA 20 %.',
    designation: 'draps', quantity: 200, price: 85
  },
  {
    name: 'spoken quantity and spoken price',
    text: 'Client Pierre, six draps à cent cinquante dirhams.',
    designation: 'draps', quantity: 6, price: 150
  },
  {
    name: 'hyphenated twenty-two quantity',
    text: 'Client Pierre, vingt-deux serviettes à 20 dirhams.',
    designation: 'serviettes', quantity: 22, price: 20
  },
  {
    name: 'eighty-one quantity',
    text: 'Client Pierre, quatre-vingt-un draps à 100 dirhams.',
    designation: 'draps', quantity: 81, price: 100
  },
  {
    name: 'ninety spoken price',
    text: 'Client Pierre, six draps à quatre-vingt-dix dirhams.',
    designation: 'draps', quantity: 6, price: 90
  },
  {
    name: 'hundreds in spoken quantity',
    text: 'Client Pierre, deux cent cinquante serviettes à 12 dirhams.',
    designation: 'serviettes', quantity: 250, price: 12
  },
  {
    name: 'decimal comma compact price',
    text: 'Client Pierre, 6 draps à 150,50 MAD.',
    designation: 'draps', quantity: 6, price: 150.5
  },
  {
    name: 'ASCII a and DH currency',
    text: 'Client Pierre, 6 draps a 150 DH.',
    designation: 'draps', quantity: 6, price: 150
  }
] as const

describe('voiceToRawQuote compact dictation', () => {
  for (const testCase of compactCases) {
    it(testCase.name, () => {
      const raw = voiceToRawQuote(testCase.text, 20)
      expect(raw.lines).toHaveLength(1)
      expect(getLine(raw)).toMatchObject({ designation: testCase.designation, quantity: testCase.quantity, unitPriceHT: testCase.price, vatRate: 20 })
    })
  }

  it('extracts multiple compact quote lines', () => {
    const raw = voiceToRawQuote('Client Hôtel Atlas, 200 draps à 85 dirhams, 40 serviettes à 22,5 MAD, TVA 20 %.', 0)
    expect(cleanText(raw.client?.name)).toBe('Hôtel Atlas')
    expect(raw.lines).toHaveLength(2)
    expect(getLine(raw, 0)).toMatchObject({ designation: 'draps', quantity: 200, unitPriceHT: 85, vatRate: 20 })
    expect(getLine(raw, 1)).toMatchObject({ designation: 'serviettes', quantity: 40, unitPriceHT: 22.5, vatRate: 20 })
  })
})

describe('voiceToRawQuote safety and defaults', () => {
  it.each([
    ['client Pierre objet draps désignation draps quantité 6', 'missing price'],
    ['client Pierre objet draps désignation draps prix unitaire 150', 'missing quantity'],
    ['client Pierre objet draps quantité 6 prix unitaire 150', 'missing designation'],
    ['client Pierre objet draps désignation draps quantité beaucoup prix unitaire 150', 'invalid quantity'],
    ['client Pierre objet draps désignation draps quantité 6 prix unitaire environ cent cinquante', 'ambiguous price'],
    ['six draps à 150', 'compact missing currency'],
    ['', 'empty transcript'],
    ['bonjour je voudrais préparer un devis', 'unrelated sentence']
  ])('does not invent a line: %s (%s)', (text) => {
    expect(voiceToRawQuote(text, 20).lines).toHaveLength(0)
  })

  it('uses the configured default VAT when none is dictated', () => {
    const raw = voiceToRawQuote('Client Pierre, 6 draps à 150 dirhams.', 7)
    expect(getLine(raw)).toMatchObject({ vatRate: 7 })
  })

  it('keeps missing client explicit instead of inventing one', () => {
    const raw = voiceToRawQuote('6 draps à 150 dirhams.', 20)
    expect(raw.client?.name ?? null).toBeNull()
    expect(raw.lines).toHaveLength(1)
  })

  it('keeps the voice source canonical', () => {
    const raw = voiceToRawQuote('Client Pierre, 6 draps à 150 dirhams.', 20)
    expect(raw.source).toEqual({ kind: 'TEXT', name: 'Message vocal' })
    expect(raw.currency).toBe('MAD')
  })
})
