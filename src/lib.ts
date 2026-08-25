import type { CommercialDocument, DocumentLine, DocumentType } from './types'

export const lineTotalHT = (line: DocumentLine) =>
  Math.round(line.quantity * line.unitPriceHT * 100) / 100

export const documentTotals = (doc: CommercialDocument) => {
  const totalHT = doc.lines.reduce((sum, line) => sum + lineTotalHT(line), 0)
  const totalVAT = doc.lines.reduce(
    (sum, line) => sum + lineTotalHT(line) * (line.vatRate / 100),
    0
  )
  return {
    totalHT: Math.round(totalHT * 100) / 100,
    totalVAT: Math.round(totalVAT * 100) / 100,
    totalTTC: Math.round((totalHT + totalVAT) * 100) / 100
  }
}

const units = [
  'zéro',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize'
]

const underHundred = (n: number): string => {
  if (n <= 16) return units[n]
  if (n < 20) return `dix-${units[n - 10]}`
  if (n < 70) {
    const tens = Math.floor(n / 10)
    const rest = n % 10
    const labels: Record<number, string> = {
      2: 'vingt',
      3: 'trente',
      4: 'quarante',
      5: 'cinquante',
      6: 'soixante'
    }
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
  const rounded = Math.round(amount * 100) / 100
  const dirhams = Math.floor(rounded)
  const centimes = Math.round((rounded - dirhams) * 100)
  const dirhamText = `${numberToFrench(dirhams)} dirham${dirhams > 1 ? 's' : ''}`
  if (!centimes) return dirhamText.toUpperCase()
  return `${dirhamText} et ${numberToFrench(centimes)} centime${centimes > 1 ? 's' : ''}`.toUpperCase()
}

const prefixFor = (type: DocumentType) => {
  if (type === 'FACTURE') return 'F'
  if (type === 'DEVIS') return 'D'
  if (type === 'BL') return 'BL'
  return 'BC'
}

export const createDocumentNumber = (
  type: DocumentType,
  existingCount: number,
  date = new Date()
) => `${prefixFor(type)}-${date.getFullYear()}-${String(existingCount + 1).padStart(3, '0')}`

export const createBlankDocument = (
  type: DocumentType,
  existingCount: number,
  defaultVatRate: number
): CommercialDocument => {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    type,
    number: createDocumentNumber(type, existingCount, now),
    date: now.toISOString().slice(0, 10),
    client: '',
    object: '',
    blShowPrices: false,
    lines: [
      {
        id: crypto.randomUUID(),
        designation: '',
        unit: 'Pièce',
        quantity: 1,
        unitPriceHT: 0,
        vatRate: defaultVatRate
      }
    ],
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
