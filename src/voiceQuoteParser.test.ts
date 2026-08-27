import { describe, expect, it } from 'vitest'
import { voiceToRawQuote } from './voiceQuoteParser'

const line=(raw:ReturnType<typeof voiceToRawQuote>)=>raw.lines?.[0] as Record<string,unknown>|undefined

describe('real Safari captures',()=>{
 it('parses the exact captured iPhone transcript',()=>{
  const raw=voiceToRawQuote('Client Pierra article draps de 2,30 m sur deux 2,20 m quantité cinq prix unitaire 150 dirhams',20)
  expect(raw.client?.name).toBe('Pierra')
  expect(raw.lines).toHaveLength(1)
  expect(line(raw)).toMatchObject({designation:'draps de 2,30 m sur deux 2,20 m',quantity:5,unitPriceHT:150,vatRate:20})
 })
 it('does not invent Pierre when Safari transcribes Pierra',()=>expect(voiceToRawQuote('Client Pierra article draps quantité cinq prix unitaire 150 dirhams',20).client?.name).toBe('Pierra'))
})

describe('article syntax',()=>{
 it.each([
  ['Client Pierre article draps 250 cm quantité 6 prix unitaire 150 dirhams','draps 250 cm',6,150],
  ['client Pierre article serviettes quantité six prix unitaire vingt-deux dirhams','serviettes',6,22],
  ['client Pierre article draps de 2,30 m sur 2,20 m prix unitaire 150 quantité cinq','draps de 2,30 m sur 2,20 m',5,150],
  ['client Pierre, article draps de 2,30 m sur deux 2,20 m, quantité cinq, prix unitaire 150 dirhams','draps de 2,30 m sur deux 2,20 m',5,150]
 ])('parses %s',(text,designation,quantity,price)=>expect(line(voiceToRawQuote(text,20))).toMatchObject({designation,quantity,unitPriceHT:price}))
})

describe('legacy and structured regressions',()=>{
 it('keeps compact spoken quantity',()=>expect(line(voiceToRawQuote('Client Pierre, six draps 250 centimètres à 150 dirhams.',20))).toMatchObject({designation:'draps 250 centimètres',quantity:6,unitPriceHT:150}))
 it('keeps explicit designation syntax',()=>expect(line(voiceToRawQuote("le client c'est Pierre, la désignation c'est des draps de 250 centimètres, le prix unitaire c'est 150 dirhams, quantité c'est 6 articles",20))).toMatchObject({designation:'des draps de 250 centimètres',quantity:6,unitPriceHT:150}))
 it('keeps multiple compact lines',()=>expect(voiceToRawQuote('Client Hôtel Atlas, 200 draps à 85 dirhams, 40 serviettes à 22,5 MAD, TVA 20 %.',0).lines).toHaveLength(2))
})

describe('safety',()=>{
 it.each([
  'Client Pierre article draps quantité cinq',
  'Client Pierre article draps prix unitaire 150',
  'Client Pierre quantité cinq prix unitaire 150',
  'Client Pierre article draps quantité beaucoup prix unitaire 150',
  ''
 ])('does not invent incomplete line: %s',text=>expect(voiceToRawQuote(text,20).lines).toHaveLength(0))
})
