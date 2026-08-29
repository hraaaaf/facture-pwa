import { describe, expect, it } from 'vitest'
import { dashboardStatsForYear, isDashboardBusinessDocument } from './dashboardStats'
import type { CommercialDocument, DocumentStatus, DocumentType } from './types'

const document = ({
  id,
  type = 'FACTURE',
  date = '2026-08-29',
  status = 'FINALIZED',
  amount = 100,
  blShowPrices = true
}: {
  id: string
  type?: DocumentType
  date?: string
  status?: DocumentStatus
  amount?: number
  blShowPrices?: boolean
}): CommercialDocument => ({
  id,
  type,
  number: status === 'DRAFT' ? '' : `${type}-2026-${id}`,
  date,
  client: 'Client',
  clientId: '',
  clientAddress: '',
  clientIce: '',
  clientIfNumber: '',
  object: 'Test dashboard',
  lines: [{
    id: `line-${id}`,
    designation: 'Article',
    unit: 'Pièce',
    quantity: 1,
    unitPriceHT: amount,
    vatRate: 0,
    discountPercent: 0
  }],
  blShowPrices,
  globalDiscountPercent: 0,
  dueDate: '',
  paymentMethod: 'UNSPECIFIED',
  payments: [],
  status,
  finalizedAt: status === 'DRAFT' ? '' : '2026-08-29T12:00:00.000Z',
  paidAt: status === 'PAID' ? '2026-08-29T13:00:00.000Z' : '',
  cancelledAt: status === 'CANCELLED' ? '2026-08-29T14:00:00.000Z' : '',
  sourceDocumentId: '',
  createdAt: '2026-08-29T10:00:00.000Z',
  updatedAt: '2026-08-29T10:00:00.000Z'
})

describe('dashboard yearly business stats', () => {
  it('retient uniquement les documents finalisés ou payés de l’année ciblée', () => {
    expect(isDashboardBusinessDocument(document({ id: '1', status: 'FINALIZED' }), 2026)).toBe(true)
    expect(isDashboardBusinessDocument(document({ id: '2', status: 'PAID' }), 2026)).toBe(true)
    expect(isDashboardBusinessDocument(document({ id: '3', status: 'DRAFT' }), 2026)).toBe(false)
    expect(isDashboardBusinessDocument(document({ id: '4', status: 'CANCELLED' }), 2026)).toBe(false)
    expect(isDashboardBusinessDocument(document({ id: '5', date: '2025-12-31' }), 2026)).toBe(false)
  })

  it('exclut brouillons, annulés et années précédentes des comptes et montants', () => {
    const stats = dashboardStatsForYear([
      document({ id: '001', type: 'FACTURE', amount: 100, status: 'FINALIZED' }),
      document({ id: '002', type: 'FACTURE', amount: 200, status: 'PAID' }),
      document({ id: '003', type: 'FACTURE', amount: 900, status: 'DRAFT' }),
      document({ id: '004', type: 'FACTURE', amount: 800, status: 'CANCELLED' }),
      document({ id: '005', type: 'FACTURE', amount: 700, date: '2025-08-29', status: 'FINALIZED' }),
      document({ id: '006', type: 'DEVIS', amount: 300, status: 'FINALIZED' }),
      document({ id: '007', type: 'BL', amount: 400, status: 'FINALIZED', blShowPrices: false }),
      document({ id: '008', type: 'BC', amount: 500, status: 'FINALIZED' })
    ], 2026)

    expect(stats).toEqual([
      { type: 'DEVIS', count: 1, amount: 300 },
      { type: 'FACTURE', count: 2, amount: 300 },
      { type: 'BL', count: 1, amount: 0 },
      { type: 'BC', count: 1, amount: 500 }
    ])
  })
})
