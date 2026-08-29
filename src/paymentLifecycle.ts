import { documentTotals } from './lib'
import type { CommercialDocument, PaymentMethod } from './types'

export type InvoicePaymentState = 'DRAFT' | 'UNPAID' | 'PARTIAL' | 'OVERDUE' | 'PAID' | 'CANCELLED'

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

const localIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const paymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'UNSPECIFIED', label: 'Non précisé' },
  { value: 'BANK_TRANSFER', label: 'Virement' },
  { value: 'CHECK', label: 'Chèque' },
  { value: 'CASH', label: 'Espèces' },
  { value: 'CARD', label: 'Carte' },
  { value: 'OTHER', label: 'Autre' }
]

export const paymentMethodLabel = (method: PaymentMethod) =>
  paymentMethodOptions.find(option => option.value === method)?.label ?? 'Non précisé'

export const invoicePaymentSummary = (document: CommercialDocument, today = localIsoDate(new Date())) => {
  const total = documentTotals(document).totalTTC
  const recorded = roundMoney(document.payments.reduce((sum, payment) => sum + payment.amount, 0))
  const paid = document.status === 'PAID' && document.payments.length === 0
    ? total
    : Math.min(total, recorded)
  const remaining = roundMoney(Math.max(0, total - paid))
  let state: InvoicePaymentState
  if (document.status === 'DRAFT') state = 'DRAFT'
  else if (document.status === 'CANCELLED') state = 'CANCELLED'
  else if (document.status === 'PAID' || remaining <= 0.005) state = 'PAID'
  else if (document.dueDate && document.dueDate < today) state = 'OVERDUE'
  else if (paid > 0) state = 'PARTIAL'
  else state = 'UNPAID'
  return { total, paid: roundMoney(paid), remaining, state }
}

export const invoicePaymentStateLabel = (state: InvoicePaymentState) => {
  if (state === 'PAID') return 'Payé'
  if (state === 'PARTIAL') return 'Partiel'
  if (state === 'OVERDUE') return 'En retard'
  if (state === 'UNPAID') return 'À encaisser'
  if (state === 'CANCELLED') return 'Annulé'
  return 'Brouillon'
}
