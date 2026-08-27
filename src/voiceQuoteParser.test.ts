import { describe, expect, it } from 'vitest'
import { voiceToRawQuote } from './voiceQuoteParser'

const cases = [
  ["le client c'est Pierre, l'objet c'est des draps, la désignation c'est des draps de 250 centimètres, le prix unitaire c'est 150 dirhams, quantité c'est 6 articles", 'Pierre', 'des draps', 'des draps de 250 centimètres', 6, 150],
  ['client Pierre objet draps désignation draps 250 cm quantité 6 prix unitaire 150 dirhams', 'Pierre', 'draps', 'draps 250 cm', 6, 150],
  ['client: Pierre; objet: draps; désignation: draps 250 cm; PU: 150 MAD; QTE: 6', 'Pierre', 'draps', 'draps 250 cm', 6, 150],
  ['client Pierre, objet draps, designation draps 250 cm, prix unitaire 150, quantite 6', 'Pierre', 'draps', 'draps 250 cm', 6, 150],
  ['client Pierre objet draps désignation draps 250 cm prix unitaire 150,50 dirhams quantité 6', 'Pierre', 'draps', 'draps 250 cm', 6, 150.5]
] as const

describe('voiceToRawQuote structured dictation', () => {
  for (const [text, client, object, designation, quantity, price] of cases) {
    it(text, () => {
      const raw = voiceToRawQuote(text, 20)
      expect(raw.client?.name).toBe(client)
      expect(raw.object).toBe(object)
      expect(raw.lines).toHaveLength(1)
      expect(raw.lines?.[0]).toMatchObject({ designation, quantity, unitPriceHT: price, vatRate: 20 })
    })
  }

  it('keeps the compact legacy format', () => {
    const raw = voiceToRawQuote('Client Hôtel Atlas, 200 draps à 85 dirhams, TVA 20 %.', 0)
    expect(raw.client?.name).toBe('Hôtel Atlas')
    expect(raw.lines?.[0]).toMatchObject({ designation: 'draps', quantity: 200, unitPriceHT: 85, vatRate: 20 })
  })

  it.each([
    ['client Pierre objet draps désignation draps quantité 6', 'missing price'],
    ['client Pierre objet draps désignation draps prix unitaire 150', 'missing quantity'],
    ['client Pierre objet draps quantité 6 prix unitaire 150', 'missing designation']
  ])('does not invent a line: %s (%s)', (text) => {
    expect(voiceToRawQuote(text, 20).lines).toHaveLength(0)
  })
})
