import type { RawQuotePayload } from './quoteImport'
import { importDebug } from './importDebug'

const decimal = (value: string) => Number(value.replace(',', '.'))
const esc = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const FIELD_LABELS = [
  'client', 'objet', 'article', 'désignation', 'designation',
  'prix unitaire', 'prix unité', 'prix unite', 'pu',
  'quantité', 'quantite', 'qte', 'qté',
  'tva', 'taxe'
]
const boundary = FIELD_LABELS.map(esc).join('|')
const article = String.raw`(?:l['’]\s*|le\s+|la\s+|les\s+)?`
const connector = String.raw`\s*(?:,|;|\.|:|-)?\s*(?:(?:c['’]?est|est(?:\s+de)?|de|à|a)\s+)?`

const FRENCH_UNITS: Record<string, number> = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9,
  dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16
}
const FRENCH_TENS: Record<string, number> = { vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 }
const NUMBER_WORD = String.raw`zero|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|vingts|trente|quarante|cinquante|soixante|cent|cents|mille|milles|million|millions|et`
const SPOKEN_NUMBER_PATTERN = String.raw`(?:${NUMBER_WORD})(?:[-\s]+(?:${NUMBER_WORD})){0,8}`
const NUMBER_VALUE_PATTERN = String.raw`(?:\d+(?:[.,]\d+)?|${SPOKEN_NUMBER_PATTERN})`

const restoreFieldBoundaries = (value: string) => value
  .replace(new RegExp(String.raw`([A-Za-zÀ-ÿ0-9])(?=(?:${article})(?:${boundary})(?=\s|[,.;:]|$))`, 'gi'), '$1 ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeWordNumber = (value: string) => value
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\bpour\s+cent\b/g, ' ')
  .replace(/-/g, ' ')
  .replace(/\b(et|articles?|unites?|pieces?|mad|dhs?|dirhams?)\b/g, ' ')
  .replace(/%/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const parseFrenchNumberWords = (value: string): number | null => {
  const normalized = normalizeWordNumber(value)
  if (!normalized) return null
  const tokens = normalized.split(' ')
  let total = 0
  let current = 0
  let used = false

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token === 'quatre' && /^vingts?$/.test(tokens[index + 1] ?? '')) {
      current += 80
      index += 1
      used = true
      continue
    }
    if (token in FRENCH_UNITS) {
      current += FRENCH_UNITS[token]
      used = true
      continue
    }
    if (token in FRENCH_TENS) {
      current += FRENCH_TENS[token]
      used = true
      continue
    }
    if (token === 'cent' || token === 'cents') {
      current = (current || 1) * 100
      used = true
      continue
    }
    if (token === 'mille' || token === 'milles') {
      total += (current || 1) * 1000
      current = 0
      used = true
      continue
    }
    if (token === 'million' || token === 'millions') {
      total += (current || 1) * 1_000_000
      current = 0
      used = true
      continue
    }
    return null
  }

  return used ? total + current : null
}

const parseNumberValue = (value: string): number | null => {
  const digit = value.match(/\d+(?:[.,]\d+)?/)
  if (digit) return decimal(digit[0])
  return parseFrenchNumberWords(value)
}

const field = (text: string, names: string[], stopAtComma = false) => {
  const label = names.map(esc).join('|')
  const nextField = String.raw`\s+(?:${article})(?:${boundary})(?=\s|[,.;:]|$)`
  const stop = stopAtComma ? String.raw`(?=${nextField}|[,.;]|$)` : String.raw`(?=${nextField}|[.;]|$)`
  const raw = text.match(new RegExp(String.raw`(?:${article})(?:${label})${connector}(.+?)${stop}`, 'i'))?.[1]?.trim()
  return raw?.replace(/[,;:]+$/, '').trim()
}

const numberField = (text: string, names: string[]) => {
  const value = field(text, names)
  return value ? parseNumberValue(value) : null
}

export const voiceToRawQuote = (transcript: string, defaultVatRate: number): RawQuotePayload => {
  const normalized = restoreFieldBoundaries(transcript)
  const client = field(normalized, ['client'], true) ?? normalized.match(/(?:pour)\s+([^,.;]+?)(?=\s+(?:objet|article|avec|comprenant|incluant)(?=\s|[,.;:]|$)|[,.;]|$)/i)?.[1]?.trim()
  const object = field(normalized, ['objet'], true) ?? field(normalized, ['concernant'], true)
  const vat = numberField(normalized, ['tva', 'taxe'])
  const vatRate = vat ?? defaultVatRate
  const lines: Array<Record<string, unknown>> = []

  const compactPattern = new RegExp(String.raw`(${NUMBER_VALUE_PATTERN})\s+([^,;.]+?)\s+(?:à|a)\s+(${NUMBER_VALUE_PATTERN})\s*(?:mad|dhs?|dirhams?)`, 'gi')
  for (const match of normalized.matchAll(compactPattern)) {
    const quantity = parseNumberValue(match[1])
    const unitPriceHT = parseNumberValue(match[3])
    if (quantity === null || unitPriceHT === null) continue
    lines.push({ designation: match[2].trim(), unit: 'Unité', quantity, unitPriceHT, vatRate, discountPercent: 0 })
  }

  if (lines.length === 0) {
    const designation = field(normalized, ['désignation', 'designation']) ?? field(normalized, ['article'])
    const quantity = numberField(normalized, ['quantité', 'quantite', 'qte', 'qté'])
    const unitPriceHT = numberField(normalized, ['prix unitaire', 'prix unité', 'prix unite', 'pu'])
    if (designation && quantity !== null && unitPriceHT !== null) {
      lines.push({ designation, unit: 'Unité', quantity, unitPriceHT, vatRate, discountPercent: 0 })
    }
  }

  const raw: RawQuotePayload = {
    source: { kind: 'TEXT', name: 'Message vocal' },
    client: { name: client ?? null },
    object: object ?? 'Devis dicté vocalement',
    currency: 'MAD',
    lines
  }

  importDebug('voice.parser', {
    transcript,
    normalized,
    defaultVatRate,
    detectedClient: client ?? null,
    detectedObject: object ?? null,
    vatRate,
    lineCount: lines.length,
    lines
  })

  return raw
}
