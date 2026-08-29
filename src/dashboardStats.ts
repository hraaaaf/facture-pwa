import { documentTotals } from './lib'
import type { CommercialDocument, DocumentType } from './types'

export interface DashboardStat {
  type: DocumentType
  count: number
  amount: number
}

const dashboardTypes: DocumentType[] = ['DEVIS', 'FACTURE', 'BL', 'BC']

export const isDashboardBusinessDocument = (document: CommercialDocument, year: number) => {
  const documentYear = Number(document.date.slice(0, 4))
  const businessStatus = document.status === 'FINALIZED' || document.status === 'PAID'
  return documentYear === year && businessStatus
}

export const dashboardStatsForYear = (documents: CommercialDocument[], year: number): DashboardStat[] =>
  dashboardTypes.map(type => {
    const list = documents.filter(document =>
      document.type === type && isDashboardBusinessDocument(document, year)
    )
    const amount = list.reduce((sum, document) => {
      if (document.type === 'BL' && !document.blShowPrices) return sum
      return sum + documentTotals(document).totalTTC
    }, 0)
    return { type, count: list.length, amount }
  })
