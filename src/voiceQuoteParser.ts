import type { RawQuotePayload } from './quoteImport'

const decimal = (value: string) => Number(value.replace(',', '.'))
const esc = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const FIELDS = ['client', 'objet', 'désignation', 'designation', 'prix unitaire', 'pu', 'quantité', 'quantite', 'qte', 'tva', 'taxe']
const boundary = FIELDS.map(esc).join('|')
const connector = String.raw`\s*(?:,|;|\.|:|-)?\s*(?:(?:c['’]?est|est(?:\s+de)?|c(?:e|')?est|de|à|a)\s+)?`

const field = (text: string, names: string[]) => {
  const label = names.map(esc).join('|')
  return text.match(new RegExp(String.raw`(?:${label})${connector}(.+?)(?=\s+(?:${boundary})\b|[.;]|$)`, 'i'))?.[1]?.trim()
}

const numberField = (text: string, names: string[]) => {
  const value = field(text, names)
  const match = value?.match(/\d+(?:[.,]\d+)?/)
  return match ? decimal(match[0]) : null
}

export const voiceToRawQuote = (transcript: string, defaultVatRate: number): RawQuotePayload => {
  const normalized = transcript.replace(/\s+/g, ' ').trim()
  const client = field(normalized, ['client']) ?? normalized.match(/(?:pour)\s+([^,.;]+?)(?=\s+(?:objet|avec|comprenant|incluant)\b|[,.;]|$)/i)?.[1]?.trim()
  const object = field(normalized, ['objet']) ?? field(normalized, ['concernant'])
  const vat = numberField(normalized, ['tva', 'taxe'])
  const vatRate = vat ?? defaultVatRate
  const lines: Array<Record<string, unknown>> = []

  const compactPattern = /(\d+(?:[.,]\d+)?)\s+([^,;.]+?)\s+(?:à|a)\s+(\d+(?:[.,]\d+)?)\s*(?:mad|dhs?|dirhams?)/gi
  for (const match of normalized.matchAll(compactPattern)) {
    lines.push({ designation: match[2].trim(), unit: 'Unité', quantity: decimal(match[1]), unitPriceHT: decimal(match[3]), vatRate, discountPercent: 0 })
  }

  if (lines.length === 0) {
    const designation = field(normalized, ['désignation', 'designation'])
    const quantity = numberField(normalized, ['quantité', 'quantite', 'qte'])
    const unitPriceHT = numberField(normalized, ['prix unitaire', 'pu'])
    if (designation && quantity !== null && unitPriceHT !== null) {
      lines.push({ designation, unit: 'Unité', quantity, unitPriceHT, vatRate, discountPercent: 0 })
    }
  }

  return {
    source: { kind: 'TEXT', name: 'Message vocal' },
    client: { name: client ?? null },
    object: object ?? 'Devis dicté vocalement',
    currency: 'MAD',
    lines
  }
}
