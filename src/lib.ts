import type { CommercialDocument, DocumentLine, DocumentType, NumberingPrefixes } from './types'
import { defaultNumberingPrefixes } from './types'

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const clampPercent = (value: number | undefined) => Math.min(100, Math.max(0, Number.isFinite(value) ? value as number : 0))

export const lineSubtotalHT = (line: DocumentLine) =>
  roundMoney(line.quantity * line.unitPriceHT)

export const lineTotalHT = (line: DocumentLine) =>
  roundMoney(lineSubtotalHT(line) * (1 - clampPercent(line.discountPercent) / 100))

export const documentTotals = (doc: CommercialDocument) => {
  const linesHT = doc.lines.reduce((sum, line) => sum + lineTotalHT(line), 0)
  const globalDiscountRate = clampPercent(doc.globalDiscountPercent)
  const globalFactor = 1 - globalDiscountRate / 100
  const totalHT = roundMoney(linesHT * globalFactor)
  const totalVAT = roundMoney(doc.lines.reduce((sum, line) => {
    const discountedLine = lineTotalHT(line) * globalFactor
    return sum + discountedLine * (clampPercent(line.vatRate) / 100)
  }, 0))

  return {
    linesHT: roundMoney(linesHT),
    globalDiscount: roundMoney(linesHT - totalHT),
    totalHT,
    totalVAT,
    totalTTC: roundMoney(totalHT + totalVAT)
  }
}

export interface ValidationIssue {
  field: string
  message: string
}

export const validateDocument = (doc: CommercialDocument): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  if (!doc.client.trim()) issues.push({ field: 'client', message: 'Le client est obligatoire.' })
  if (!doc.object.trim()) issues.push({ field: 'object', message: 'L’objet est obligatoire.' })
  if (!doc.date || Number.isNaN(new Date(`${doc.date}T12:00:00`).getTime())) {
    issues.push({ field: 'date', message: 'La date est invalide.' })
  }
  if (!doc.lines.length) issues.push({ field: 'lines', message: 'Ajoutez au moins un article.' })
  if (doc.type === 'FACTURE' && doc.dueDate) {
    if (Number.isNaN(new Date(`${doc.dueDate}T12:00:00`).getTime())) {
      issues.push({ field: 'dueDate', message: 'La date d’échéance est invalide.' })
    } else if (doc.dueDate < doc.date) {
      issues.push({ field: 'dueDate', message: 'L’échéance ne peut pas précéder la date de facture.' })
    }
  }
  if (doc.globalDiscountPercent < 0 || doc.globalDiscountPercent > 100) {
    issues.push({ field: 'globalDiscountPercent', message: 'La remise globale doit être comprise entre 0 et 100 %.' })
  }

  doc.lines.forEach((line, index) => {
    const label = `Article ${index + 1}`
    if (!line.designation.trim()) issues.push({ field: `lines.${index}.designation`, message: `${label} : désignation obligatoire.` })
    if (!(line.quantity > 0)) issues.push({ field: `lines.${index}.quantity`, message: `${label} : quantité supérieure à 0 requise.` })
    if (line.unitPriceHT < 0) issues.push({ field: `lines.${index}.unitPriceHT`, message: `${label} : prix négatif interdit.` })
    if (line.vatRate < 0 || line.vatRate > 100) issues.push({ field: `lines.${index}.vatRate`, message: `${label} : TVA entre 0 et 100 %.` })
    if ((line.discountPercent ?? 0) < 0 || (line.discountPercent ?? 0) > 100) {
      issues.push({ field: `lines.${index}.discountPercent`, message: `${label} : remise entre 0 et 100 %.` })
    }
  })

  return issues
}

const units = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'
]

const underHundred = (n: number): string => {
  if (n <= 16) return units[n]
  if (n < 20) return `dix-${units[n - 10]}`
  if (n < 70) {
    const tens = Math.floor(n / 10)
    const rest = n % 10
    const labels: Record<number, string> = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' }
    if (rest === 0) return labels[tens]
    if (rest === 1) return `${labels[tens]} et un`
    return `${labels[tens]}-${units[rest]}`
  }
  if (n < 80) {
    if (n === 71) return 'soixante et onze'
    return `soixante-${underHundred(n - 60)}`
  }
  if (n === 80) return 'quatre-vingts'
  return `quatre-vingt-${underHundred(n - 80)}`
}

const underThousand = (n: number): string => {
  if (n < 100) return underHundred(n)
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  const head = hundreds === 1 ? 'cent' : `${units[hundreds]} cent`
  if (rest === 0) return hundreds > 1 ? `${head}s` : head
  return `${head} ${underHundred(rest)}`
}

export const numberToFrench = (value: number): string => {
  const n = Math.trunc(Math.abs(value))
  if (n < 1000) return underThousand(n)
  if (n < 1_000_000) {
    const thousands = Math.floor(n / 1000)
    const rest = n % 1000
    const head = thousands === 1 ? 'mille' : `${numberToFrench(thousands)} mille`
    return rest ? `${head} ${underThousand(rest)}` : head
  }
  if (n < 1_000_000_000) {
    const millions = Math.floor(n / 1_000_000)
    const rest = n % 1_000_000
    const head = `${numberToFrench(millions)} million${millions > 1 ? 's' : ''}`
    return rest ? `${head} ${numberToFrench(rest)}` : head
  }
  return String(n)
}

export const amountToFrenchDirhams = (amount: number): string => {
  const rounded = roundMoney(amount)
  const dirhams = Math.floor(rounded)
  const centimes = Math.round((rounded - dirhams) * 100)
  const dirhamText = `${numberToFrench(dirhams)} dirham${dirhams > 1 ? 's' : ''}`
  if (!centimes) return dirhamText.toUpperCase()
  return `${dirhamText} et ${numberToFrench(centimes)} centime${centimes > 1 ? 's' : ''}`.toUpperCase()
}

const localIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const validateNumberingPrefixes = (prefixes: NumberingPrefixes): string => {
  const values = Object.values(prefixes).map(prefix => prefix.trim().toUpperCase())
  if (values.some(prefix => !prefix)) return 'Chaque type de document doit avoir un préfixe.'
  if (new Set(values).size !== values.length) return 'Chaque type de document doit avoir un préfixe distinct.'
  return ''
}

export const formatDocumentNumber = (
  type: DocumentType,
  year: number,
  sequence: number,
  prefixes: NumberingPrefixes = defaultNumberingPrefixes
) => {
  const issue = validateNumberingPrefixes(prefixes)
  if (issue) throw new Error(issue)
  const prefix = prefixes[type].trim().toUpperCase()
  return `${prefix}-${year}-${String(sequence).padStart(3, '0')}`
}

export const createBlankDocument = (
  type: DocumentType,
  defaultVatRate: number,
  sourceDocumentId = ''
): CommercialDocument => {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    type,
    number: '',
    date: localIsoDate(now),
    client: '',
    clientId: '',
    clientAddress: '',
    clientIce: '',
    clientIfNumber: '',
    object: '',
    blShowPrices: false,
    globalDiscountPercent: 0,
    dueDate: '',
    paymentMethod: 'UNSPECIFIED',
    payments: [],
    status: 'DRAFT',
    finalizedAt: '',
    paidAt: '',
    cancelledAt: '',
    sourceDocumentId,
    lines: [{
      id: crypto.randomUUID(),
      designation: '',
      unit: 'Pièce',
      quantity: 1,
      unitPriceHT: 0,
      vatRate: defaultVatRate,
      discountPercent: 0
    }],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  }
}

export const documentLabel = (type: DocumentType) => {
  if (type === 'FACTURE') return 'Facture'
  if (type === 'DEVIS') return 'Devis'
  if (type === 'BL') return 'Bon de livraison'
  return 'Bon de commande'
}

export const documentStatusLabel = (status: CommercialDocument['status']) => {
  if (status === 'FINALIZED') return 'Finalisé'
  if (status === 'PAID') return 'Payé'
  if (status === 'CANCELLED') return 'Annulé'
  return 'Brouillon'
}
