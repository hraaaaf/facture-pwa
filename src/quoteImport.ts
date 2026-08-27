import type { CommercialDocument, DocumentLine } from './types'

export const CANONICAL_QUOTE_SCHEMA_VERSION = 1 as const

export type QuoteInputKind = 'IMAGE' | 'PDF' | 'EXCEL' | 'WORD' | 'TEXT' | 'UNKNOWN'
export type QuoteReviewStatus = 'READY' | 'REVIEW_REQUIRED'
export type QuoteIssueSeverity = 'ERROR' | 'WARNING'
export type QuoteValueOrigin = 'SOURCE' | 'DICTIONARY' | 'DEFAULT'

export interface QuoteIssue {
  code:
    | 'CLIENT_REQUIRED'
    | 'OBJECT_REQUIRED'
    | 'DATE_REQUIRED'
    | 'DATE_INVALID'
    | 'CURRENCY_UNSUPPORTED'
    | 'LINES_REQUIRED'
    | 'DESIGNATION_REQUIRED'
    | 'UNIT_REQUIRED'
    | 'QUANTITY_REQUIRED'
    | 'QUANTITY_INVALID'
    | 'UNIT_PRICE_REQUIRED'
    | 'UNIT_PRICE_INVALID'
    | 'VAT_REQUIRED'
    | 'VAT_INVALID'
    | 'DISCOUNT_INVALID'
    | 'DUPLICATE_LINE'
  field: string
  severity: QuoteIssueSeverity
  message: string
}

export interface CanonicalQuoteLine {
  designation: string | null
  unit: string | null
  quantity: number | null
  unitPriceHT: number | null
  vatRate: number | null
  discountPercent: number
  origins: {
    designation: QuoteValueOrigin | null
    unit: QuoteValueOrigin | null
    quantity: QuoteValueOrigin | null
    unitPriceHT: QuoteValueOrigin | null
    vatRate: QuoteValueOrigin | null
    discountPercent: QuoteValueOrigin
  }
}

export interface CanonicalQuoteJSON {
  schemaVersion: typeof CANONICAL_QUOTE_SCHEMA_VERSION
  source: { kind: QuoteInputKind; name: string | null }
  client: { name: string | null; address: string | null; ice: string | null; ifNumber: string | null }
  quote: { object: string | null; date: string | null; currency: 'MAD' | null; globalDiscountPercent: number }
  lines: CanonicalQuoteLine[]
  status: QuoteReviewStatus
  issues: QuoteIssue[]
}

export interface RawQuotePayload {
  source?: { kind?: unknown; name?: unknown }
  client?: { name?: unknown; address?: unknown; ice?: unknown; ifNumber?: unknown }
  object?: unknown
  date?: unknown
  currency?: unknown
  globalDiscountPercent?: unknown
  lines?: Array<Record<string, unknown>>
}

export interface QuoteDictionary {
  designations?: Record<string, string>
  units?: Record<string, string>
}

export interface NormalizeQuoteOptions {
  defaultVatRate?: number
  defaultUnit?: string
  dictionary?: QuoteDictionary
}

const headerAliases = {
  designation: ['designation', 'désignation', 'libelle', 'libellé', 'article', 'description', 'produit', 'service'],
  unit: ['unit', 'unite', 'unité', 'u'],
  quantity: ['quantity', 'quantite', 'quantité', 'qte', 'qté', 'qty'],
  unitPriceHT: ['unitpriceht', 'unit price ht', 'prixunitaireht', 'prix unitaire ht', 'prixunitaire', 'prix unitaire', 'pu', 'p.u', 'prix/u'],
  vatRate: ['vatrate', 'vat', 'tva', 'taux tva'],
  discountPercent: ['discountpercent', 'discount', 'remise', 'remise %', 'remise%']
} as const

const normalizeKey = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9%/]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ')

const aliasSets = Object.fromEntries(
  Object.entries(headerAliases).map(([field, aliases]) => [field, new Set(aliases.map(normalizeKey))])
) as Record<keyof typeof headerAliases, Set<string>>

const text = (value: unknown): string | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const normalized = String(value).replace(/\s+/g, ' ').trim()
  return normalized || null
}

export const normalizeQuoteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  let raw = value.trim().replace(/[\s\u00a0\u202f]/g, '')
  if (!raw) return null
  raw = raw.replace(/[^0-9,.-]/g, '')
  if (!raw || raw === '-' || raw === '.' || raw === ',') return null
  const lastComma = raw.lastIndexOf(',')
  const lastDot = raw.lastIndexOf('.')
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? ',' : '.'
    raw = raw.split(decimal === ',' ? '.' : ',').join('')
    if (decimal === ',') raw = raw.replace(',', '.')
  } else if (lastComma >= 0) {
    const parts = raw.split(',')
    raw = parts.length === 2 ? `${parts[0]}.${parts[1]}` : `${parts.slice(0, -1).join('')}.${parts.at(-1)}`
  } else if ((raw.match(/\./g) ?? []).length > 1) {
    const parts = raw.split('.')
    raw = `${parts.slice(0, -1).join('')}.${parts.at(-1)}`
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

const dictionaryLookup = (value: string, dictionary?: Record<string, string>) => {
  if (!dictionary) return null
  const wanted = normalizeKey(value)
  for (const [candidate, replacement] of Object.entries(dictionary)) {
    if (normalizeKey(candidate) === wanted) return text(replacement)
  }
  return null
}

const builtinUnit = (value: string): string | null => {
  const aliases: Record<string, string> = {
    piece: 'Pièce', pieces: 'Pièce', pcs: 'Pièce', pc: 'Pièce', pce: 'Pièce',
    unite: 'Unité', unites: 'Unité', u: 'Unité', heure: 'Heure', heures: 'Heure', h: 'Heure',
    jour: 'Jour', jours: 'Jour', j: 'Jour', kg: 'Kg', kilogramme: 'Kg', kilogrammes: 'Kg',
    m: 'm', metre: 'm', metres: 'm', m2: 'm²', lot: 'Lot', lots: 'Lot'
  }
  return aliases[normalizeKey(value)] ?? null
}

const findRawField = (row: Record<string, unknown>, field: keyof typeof headerAliases): unknown => {
  for (const [key, value] of Object.entries(row)) if (aliasSets[field].has(normalizeKey(key))) return value
  return undefined
}

const normalizeDate = (value: unknown): string | null => {
  const raw = text(value)
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const fr = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  return fr ? `${fr[3]}-${fr[2].padStart(2, '0')}-${fr[1].padStart(2, '0')}` : raw
}

const normalizeCurrency = (value: unknown): 'MAD' | null => {
  const raw = text(value)
  if (!raw) return 'MAD'
  return ['mad', 'dh', 'dhs', 'dirham', 'dirhams'].includes(normalizeKey(raw)) ? 'MAD' : null
}

const normalizeKind = (value: unknown): QuoteInputKind => {
  const raw = text(value)?.toUpperCase()
  return raw && ['IMAGE', 'PDF', 'EXCEL', 'WORD', 'TEXT'].includes(raw) ? raw as QuoteInputKind : 'UNKNOWN'
}

const canonicalLine = (row: Record<string, unknown>, options: NormalizeQuoteOptions): CanonicalQuoteLine => {
  const rawDesignation = text(findRawField(row, 'designation'))
  const correctedDesignation = rawDesignation ? dictionaryLookup(rawDesignation, options.dictionary?.designations) : null
  const rawUnit = text(findRawField(row, 'unit'))
  const correctedUnit = rawUnit ? dictionaryLookup(rawUnit, options.dictionary?.units) : null
  const standardUnit = rawUnit ? builtinUnit(rawUnit) : null
  const fallbackUnit = !rawUnit ? text(options.defaultUnit) : null
  const rawVat = findRawField(row, 'vatRate')
  const parsedVat = normalizeQuoteNumber(rawVat)
  const fallbackVat = rawVat == null && Number.isFinite(options.defaultVatRate) ? options.defaultVatRate as number : null
  const rawDiscount = findRawField(row, 'discountPercent')
  const discount = normalizeQuoteNumber(rawDiscount)
  return {
    designation: correctedDesignation ?? rawDesignation,
    unit: correctedUnit ?? standardUnit ?? rawUnit ?? fallbackUnit,
    quantity: normalizeQuoteNumber(findRawField(row, 'quantity')),
    unitPriceHT: normalizeQuoteNumber(findRawField(row, 'unitPriceHT')),
    vatRate: parsedVat ?? fallbackVat,
    discountPercent: discount ?? 0,
    origins: {
      designation: correctedDesignation ? 'DICTIONARY' : rawDesignation ? 'SOURCE' : null,
      unit: correctedUnit ? 'DICTIONARY' : standardUnit ? 'DICTIONARY' : rawUnit ? 'SOURCE' : fallbackUnit ? 'DEFAULT' : null,
      quantity: findRawField(row, 'quantity') == null ? null : 'SOURCE',
      unitPriceHT: findRawField(row, 'unitPriceHT') == null ? null : 'SOURCE',
      vatRate: parsedVat !== null ? 'SOURCE' : fallbackVat !== null ? 'DEFAULT' : null,
      discountPercent: discount !== null ? 'SOURCE' : 'DEFAULT'
    }
  }
}

const lineIssues = (line: CanonicalQuoteLine, index: number): QuoteIssue[] => {
  const issues: QuoteIssue[] = []
  const path = `lines.${index}`
  if (!line.designation) issues.push({ code: 'DESIGNATION_REQUIRED', field: `${path}.designation`, severity: 'ERROR', message: `Article ${index + 1} : désignation à vérifier.` })
  if (!line.unit) issues.push({ code: 'UNIT_REQUIRED', field: `${path}.unit`, severity: 'ERROR', message: `Article ${index + 1} : unité à vérifier.` })
  if (line.quantity === null) issues.push({ code: 'QUANTITY_REQUIRED', field: `${path}.quantity`, severity: 'ERROR', message: `Article ${index + 1} : quantité à vérifier.` })
  else if (line.quantity <= 0) issues.push({ code: 'QUANTITY_INVALID', field: `${path}.quantity`, severity: 'ERROR', message: `Article ${index + 1} : quantité supérieure à 0 requise.` })
  if (line.unitPriceHT === null) issues.push({ code: 'UNIT_PRICE_REQUIRED', field: `${path}.unitPriceHT`, severity: 'ERROR', message: `Article ${index + 1} : prix unitaire HT à vérifier.` })
  else if (line.unitPriceHT < 0) issues.push({ code: 'UNIT_PRICE_INVALID', field: `${path}.unitPriceHT`, severity: 'ERROR', message: `Article ${index + 1} : prix négatif interdit.` })
  if (line.vatRate === null) issues.push({ code: 'VAT_REQUIRED', field: `${path}.vatRate`, severity: 'ERROR', message: `Article ${index + 1} : TVA à vérifier.` })
  else if (line.vatRate < 0 || line.vatRate > 100) issues.push({ code: 'VAT_INVALID', field: `${path}.vatRate`, severity: 'ERROR', message: `Article ${index + 1} : TVA entre 0 et 100 %.` })
  if (line.discountPercent < 0 || line.discountPercent > 100) issues.push({ code: 'DISCOUNT_INVALID', field: `${path}.discountPercent`, severity: 'ERROR', message: `Article ${index + 1} : remise entre 0 et 100 %.` })
  return issues
}

const duplicateIssues = (lines: CanonicalQuoteLine[]): QuoteIssue[] => {
  const seen = new Map<string, number>()
  const issues: QuoteIssue[] = []
  lines.forEach((line, index) => {
    if (!line.designation || line.quantity === null || line.unitPriceHT === null) return
    const signature = [normalizeKey(line.designation), normalizeKey(line.unit ?? ''), line.quantity, line.unitPriceHT, line.vatRate ?? '', line.discountPercent].join('|')
    const first = seen.get(signature)
    if (first !== undefined) issues.push({ code: 'DUPLICATE_LINE', field: `lines.${index}`, severity: 'WARNING', message: `Article ${index + 1} identique à l’article ${first + 1} : doublon possible.` })
    else seen.set(signature, index)
  })
  return issues
}

export const normalizeQuotePayload = (raw: RawQuotePayload, options: NormalizeQuoteOptions = {}): CanonicalQuoteJSON => {
  const clientName = text(raw.client?.name)
  const object = text(raw.object)
  const date = normalizeDate(raw.date)
  const rawCurrency = text(raw.currency)
  const currency = normalizeCurrency(raw.currency)
  const globalDiscount = normalizeQuoteNumber(raw.globalDiscountPercent) ?? 0
  const lines = Array.isArray(raw.lines) ? raw.lines.map(row => canonicalLine(row, options)) : []
  const issues: QuoteIssue[] = []
  if (!clientName) issues.push({ code: 'CLIENT_REQUIRED', field: 'client.name', severity: 'ERROR', message: 'Client à vérifier.' })
  if (!object) issues.push({ code: 'OBJECT_REQUIRED', field: 'quote.object', severity: 'ERROR', message: 'Objet du devis à vérifier.' })
  if (!date) issues.push({ code: 'DATE_REQUIRED', field: 'quote.date', severity: 'ERROR', message: 'Date du devis à vérifier.' })
  else if (Number.isNaN(new Date(`${date}T12:00:00`).getTime())) issues.push({ code: 'DATE_INVALID', field: 'quote.date', severity: 'ERROR', message: 'Date du devis invalide.' })
  if (rawCurrency && !currency) issues.push({ code: 'CURRENCY_UNSUPPORTED', field: 'quote.currency', severity: 'ERROR', message: `Devise non prise en charge : ${rawCurrency}.` })
  if (globalDiscount < 0 || globalDiscount > 100) issues.push({ code: 'DISCOUNT_INVALID', field: 'quote.globalDiscountPercent', severity: 'ERROR', message: 'Remise globale entre 0 et 100 %.' })
  if (!lines.length) issues.push({ code: 'LINES_REQUIRED', field: 'lines', severity: 'ERROR', message: 'Aucune ligne de devis détectée.' })
  lines.forEach((line, index) => issues.push(...lineIssues(line, index)))
  issues.push(...duplicateIssues(lines))
  return {
    schemaVersion: CANONICAL_QUOTE_SCHEMA_VERSION,
    source: { kind: normalizeKind(raw.source?.kind), name: text(raw.source?.name) },
    client: { name: clientName, address: text(raw.client?.address), ice: text(raw.client?.ice), ifNumber: text(raw.client?.ifNumber) },
    quote: { object, date, currency, globalDiscountPercent: globalDiscount },
    lines,
    status: issues.some(issue => issue.severity === 'ERROR') ? 'REVIEW_REQUIRED' : 'READY',
    issues
  }
}

export const canonicalQuoteToDocumentFields = (
  quote: CanonicalQuoteJSON,
  lineId: (index: number) => string = index => `import-${index + 1}`
): Pick<CommercialDocument, 'client' | 'clientAddress' | 'clientIce' | 'clientIfNumber' | 'object' | 'date' | 'lines' | 'globalDiscountPercent'> => {
  if (quote.status !== 'READY' || quote.issues.some(issue => issue.severity === 'ERROR')) throw new Error('Le devis importé contient des champs à vérifier.')
  if (!quote.client.name || !quote.quote.object || !quote.quote.date || quote.quote.currency !== 'MAD') throw new Error('Le devis importé n’est pas complet.')
  const lines: DocumentLine[] = quote.lines.map((line, index) => {
    if (!line.designation || !line.unit || line.quantity === null || line.unitPriceHT === null || line.vatRate === null) throw new Error(`Article ${index + 1} incomplet.`)
    return {
      id: lineId(index),
      designation: line.designation,
      unit: line.unit,
      quantity: line.quantity,
      unitPriceHT: line.unitPriceHT,
      vatRate: line.vatRate,
      discountPercent: line.discountPercent
    }
  })
  return {
    client: quote.client.name,
    clientAddress: quote.client.address ?? '',
    clientIce: quote.client.ice ?? '',
    clientIfNumber: quote.client.ifNumber ?? '',
    object: quote.quote.object,
    date: quote.quote.date,
    lines,
    globalDiscountPercent: quote.quote.globalDiscountPercent
  }
}
