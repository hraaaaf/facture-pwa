import { describe, expect, it } from 'vitest'
import { createBlankDocument } from './lib'
import { invoicePaymentSummary, invoicePaymentStateLabel, paymentMethodLabel } from './paymentLifecycle'

const invoice = () => {
  const doc = createBlankDocument('FACTURE', 20)
  doc.status = 'FINALIZED'
  doc.number = 'F-2026-001'
  doc.client = 'Client'
  doc.object = 'Prestation'
  doc.lines[0] = { ...doc.lines[0], designation: 'Service', quantity: 1, unitPriceHT: 1000, vatRate: 20 }
  return doc
}

describe('invoice payment lifecycle', () => {
  it('reports an unpaid finalized invoice', () => {
    const doc = invoice()
    expect(invoicePaymentSummary(doc, '2026-08-29')).toMatchObject({ total: 1200, paid: 0, remaining: 1200, state: 'UNPAID' })
  })

  it('reports a partial payment', () => {
    const doc = invoice()
    doc.payments = [{ id: 'p1', amount: 400, date: '2026-08-20', method: 'BANK_TRANSFER', note: '', createdAt: '2026-08-20T10:00:00.000Z' }]
    expect(invoicePaymentSummary(doc, '2026-08-29')).toMatchObject({ paid: 400, remaining: 800, state: 'PARTIAL' })
  })

  it('reports an overdue invoice before partial state', () => {
    const doc = invoice()
    doc.dueDate = '2026-08-01'
    doc.payments = [{ id: 'p1', amount: 400, date: '2026-08-20', method: 'CHECK', note: '', createdAt: '2026-08-20T10:00:00.000Z' }]
    expect(invoicePaymentSummary(doc, '2026-08-29').state).toBe('OVERDUE')
  })

  it('keeps legacy PAID invoices fully settled without synthetic records', () => {
    const doc = invoice()
    doc.status = 'PAID'
    expect(invoicePaymentSummary(doc, '2026-08-29')).toMatchObject({ paid: 1200, remaining: 0, state: 'PAID' })
  })

  it('rounds multiple payments safely', () => {
    const doc = invoice()
    doc.payments = [
      { id: 'p1', amount: 399.99, date: '2026-08-20', method: 'BANK_TRANSFER', note: '', createdAt: '2026-08-20T10:00:00.000Z' },
      { id: 'p2', amount: 800.01, date: '2026-08-21', method: 'CASH', note: '', createdAt: '2026-08-21T10:00:00.000Z' }
    ]
    expect(invoicePaymentSummary(doc, '2026-08-29')).toMatchObject({ paid: 1200, remaining: 0 })
  })

  it('labels payment methods and states in French', () => {
    expect(paymentMethodLabel('BANK_TRANSFER')).toBe('Virement')
    expect(invoicePaymentStateLabel('OVERDUE')).toBe('En retard')
  })
})
