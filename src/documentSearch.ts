import { documentLabel, documentStatusLabel, documentTotals } from './lib'
import type { CommercialDocument, DocumentType } from './types'

export type DocumentSearchFilters = {
  query: string
  type: 'ALL' | DocumentType
  period: 'ALL' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'
  dateFrom: string
  dateTo: string
  amountMin: string
  amountMax: string
}

export const defaultDocumentSearchFilters = (): DocumentSearchFilters => ({
  query: '',
  type: 'ALL',
  period: 'ALL',
  dateFrom: '',
  dateTo: '',
  amountMin: '',
  amountMax: ''
})

const canonical = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('fr')
  .trim()
  .replace(/\s+/g, ' ')

const numeric = (value: string) => {
  const normalized = value.replace(',', '.').trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const boundsForPeriod = (period: DocumentSearchFilters['period'], now: Date, dateFrom: string, dateTo: string) => {
  if (period === 'CUSTOM') return { from: dateFrom, to: dateTo }
  if (period === 'ALL') return { from: '', to: '' }
  const year = now.getFullYear()
  if (period === 'THIS_YEAR') return { from: `${year}-01-01`, to: `${year}-12-31` }
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  return { from: `${year}-${month}-01`, to: `${year}-${month}-${String(lastDay).padStart(2, '0')}` }
}

export const searchableDocumentText = (document: CommercialDocument) => canonical([
  document.number,
  document.client,
  document.clientAddress,
  document.clientIce,
  document.clientIfNumber,
  document.object,
  documentLabel(document.type),
  documentStatusLabel(document.status),
  ...document.lines.flatMap(line => [line.designation, line.unit])
].join(' '))

export const filterDocuments = (
  documents: CommercialDocument[],
  filters: DocumentSearchFilters,
  now = new Date()
) => {
  const query = canonical(filters.query)
  const min = numeric(filters.amountMin)
  const max = numeric(filters.amountMax)
  const { from, to } = boundsForPeriod(filters.period, now, filters.dateFrom, filters.dateTo)

  return documents.filter(document => {
    if (filters.type !== 'ALL' && document.type !== filters.type) return false
    if (query && !searchableDocumentText(document).includes(query)) return false
    if (from && document.date < from) return false
    if (to && document.date > to) return false

    const amount = document.type === 'BL' && !document.blShowPrices ? 0 : documentTotals(document).totalTTC
    if (min !== null && amount < min) return false
    if (max !== null && amount > max) return false
    return true
  })
}

export const activeAdvancedFilterCount = (filters: DocumentSearchFilters) => [
  filters.period !== 'ALL',
  filters.amountMin.trim() !== '',
  filters.amountMax.trim() !== ''
].filter(Boolean).length
