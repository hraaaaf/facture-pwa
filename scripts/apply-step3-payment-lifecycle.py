from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace(path: str, old: str, new: str) -> None:
    file = ROOT / path
    text = file.read_text()
    if old not in text:
        raise SystemExit(f'Anchor missing in {path}: {old[:120]!r}')
    file.write_text(text.replace(old, new, 1))


def write(path: str, content: str) -> None:
    file = ROOT / path
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(content)


# ---- Types -----------------------------------------------------------------
replace(
    'src/types.ts',
    "export type DocumentStatus = 'DRAFT' | 'FINALIZED' | 'PAID' | 'CANCELLED'\n",
    "export type DocumentStatus = 'DRAFT' | 'FINALIZED' | 'PAID' | 'CANCELLED'\n"
    "export type PaymentMethod = 'UNSPECIFIED' | 'BANK_TRANSFER' | 'CASH' | 'CHECK' | 'CARD' | 'OTHER'\n\n"
    "export interface PaymentRecord {\n"
    "  id: string\n"
    "  amount: number\n"
    "  date: string\n"
    "  method: PaymentMethod\n"
    "  note: string\n"
    "  createdAt: string\n"
    "}\n"
)
replace(
    'src/types.ts',
    "  globalDiscountPercent: number\n  status: DocumentStatus\n",
    "  globalDiscountPercent: number\n"
    "  /** Optional payment due date for invoices. Empty means no due date tracked. */\n"
    "  dueDate: string\n"
    "  /** Intended/default settlement method. Individual payments keep their own method. */\n"
    "  paymentMethod: PaymentMethod\n"
    "  /** Append-only settlement ledger for invoices. */\n"
    "  payments: PaymentRecord[]\n"
    "  status: DocumentStatus\n"
)

# ---- Business helpers -------------------------------------------------------
write('src/paymentLifecycle.ts', r'''import { documentTotals } from './lib'
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
''')

write('src/paymentLifecycle.test.ts', r'''import { describe, expect, it } from 'vitest'
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
''')

# ---- Document creation + validation ----------------------------------------
replace(
    'src/lib.ts',
    "  if (!doc.lines.length) issues.push({ field: 'lines', message: 'Ajoutez au moins un article.' })\n",
    "  if (!doc.lines.length) issues.push({ field: 'lines', message: 'Ajoutez au moins un article.' })\n"
    "  if (doc.type === 'FACTURE' && doc.dueDate) {\n"
    "    if (Number.isNaN(new Date(`${doc.dueDate}T12:00:00`).getTime())) {\n"
    "      issues.push({ field: 'dueDate', message: 'La date d’échéance est invalide.' })\n"
    "    } else if (doc.dueDate < doc.date) {\n"
    "      issues.push({ field: 'dueDate', message: 'L’échéance ne peut pas précéder la date de facture.' })\n"
    "    }\n"
    "  }\n"
)
replace(
    'src/lib.ts',
    "    globalDiscountPercent: 0,\n    status: 'DRAFT',\n",
    "    globalDiscountPercent: 0,\n"
    "    dueDate: '',\n"
    "    paymentMethod: 'UNSPECIFIED',\n"
    "    payments: [],\n"
    "    status: 'DRAFT',\n"
)

# ---- Storage normalization + atomic settlement ------------------------------
replace(
    'src/storage.ts',
    "import { formatDocumentNumber, validateDocument, validateNumberingPrefixes } from './lib'",
    "import { documentTotals, formatDocumentNumber, validateDocument, validateNumberingPrefixes } from './lib'"
)
replace(
    'src/storage.ts',
    "  DocumentStatus,\n  DocumentType\n",
    "  DocumentStatus,\n  DocumentType,\n  PaymentMethod,\n  PaymentRecord\n"
)
replace(
    'src/storage.ts',
    "const isStatus = (value: unknown): value is DocumentStatus =>\n  value === 'DRAFT' || value === 'FINALIZED' || value === 'PAID' || value === 'CANCELLED'\n",
    "const isStatus = (value: unknown): value is DocumentStatus =>\n"
    "  value === 'DRAFT' || value === 'FINALIZED' || value === 'PAID' || value === 'CANCELLED'\n\n"
    "const isPaymentMethod = (value: unknown): value is PaymentMethod =>\n"
    "  value === 'UNSPECIFIED' || value === 'BANK_TRANSFER' || value === 'CASH' || value === 'CHECK' || value === 'CARD' || value === 'OTHER'\n"
)
replace(
    'src/storage.ts',
    "const normalizeDocument = (value: unknown): CommercialDocument => {\n",
    "const normalizePayment = (value: unknown): PaymentRecord => {\n"
    "  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.amount !== 'number' || !Number.isFinite(value.amount) || value.amount <= 0) {\n"
    "    throw new Error('Paiement invalide')\n"
    "  }\n"
    "  if (typeof value.date !== 'string' || typeof value.createdAt !== 'string' || !isPaymentMethod(value.method)) throw new Error('Paiement invalide')\n"
    "  return { id: value.id, amount: value.amount, date: value.date, method: value.method, note: stringOr(value, 'note'), createdAt: value.createdAt }\n"
    "}\n\n"
    "const normalizeDocument = (value: unknown): CommercialDocument => {\n"
)
replace(
    'src/storage.ts',
    "    globalDiscountPercent: numberOr(value, 'globalDiscountPercent', 0),\n    status: isStatus(value.status) ? value.status : (legacyHadNumber ? 'FINALIZED' : 'DRAFT'),\n",
    "    globalDiscountPercent: numberOr(value, 'globalDiscountPercent', 0),\n"
    "    dueDate: stringOr(value, 'dueDate'),\n"
    "    paymentMethod: isPaymentMethod(value.paymentMethod) ? value.paymentMethod : 'UNSPECIFIED',\n"
    "    payments: Array.isArray(value.payments) ? value.payments.map(normalizePayment) : [],\n"
    "    status: isStatus(value.status) ? value.status : (legacyHadNumber ? 'FINALIZED' : 'DRAFT'),\n"
)
replace(
    'src/storage.ts',
    "export const setDocumentStatus = async (id: string, status: 'PAID' | 'CANCELLED'): Promise<CommercialDocument> => {\n",
    r'''export const recordInvoicePayment = async (
  id: string,
  input: { amount: number; date: string; method: PaymentMethod; note?: string }
): Promise<CommercialDocument> => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCS_STORE, 'readwrite')
    const store = tx.objectStore(DOCS_STORE)
    const request = store.get(id) as IDBRequest<unknown>
    let saved: CommercialDocument | undefined
    let settled = false
    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      try { tx.abort() } catch { /* transaction already finished */ }
      db.close()
      reject(error ?? new Error('Encaissement impossible'))
    }
    request.onerror = () => fail(request.error)
    request.onsuccess = () => {
      try {
        const current = normalizeDocument(request.result)
        if (current.type !== 'FACTURE') throw new Error('Seule une facture peut recevoir un paiement.')
        if (current.status === 'DRAFT') throw new Error('Finalisez la facture avant d’enregistrer un paiement.')
        if (current.status === 'CANCELLED') throw new Error('Une facture annulée ne peut pas être encaissée.')
        if (current.status === 'PAID') throw new Error('Cette facture est déjà soldée.')
        const amount = Math.round((input.amount + Number.EPSILON) * 100) / 100
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('Le montant du paiement doit être supérieur à 0.')
        if (!input.date || Number.isNaN(new Date(`${input.date}T12:00:00`).getTime())) throw new Error('La date de paiement est invalide.')
        if (input.date < current.date) throw new Error('Le paiement ne peut pas précéder la date de facture.')
        if (!isPaymentMethod(input.method) || input.method === 'UNSPECIFIED') throw new Error('Choisissez un mode de règlement.')
        const total = documentTotals(current).totalTTC
        const alreadyPaid = Math.round((current.payments.reduce((sum, payment) => sum + payment.amount, 0) + Number.EPSILON) * 100) / 100
        const remaining = Math.round((Math.max(0, total - alreadyPaid) + Number.EPSILON) * 100) / 100
        if (amount - remaining > 0.005) throw new Error(`Le paiement dépasse le reste dû de ${remaining.toFixed(2)} MAD.`)
        const now = new Date().toISOString()
        const payment: PaymentRecord = { id: crypto.randomUUID(), amount, date: input.date, method: input.method, note: input.note?.trim() ?? '', createdAt: now }
        const payments = [...current.payments, payment]
        const paidTotal = Math.round((alreadyPaid + amount + Number.EPSILON) * 100) / 100
        const fullyPaid = total - paidTotal <= 0.005
        saved = {
          ...current,
          payments,
          paymentMethod: current.paymentMethod === 'UNSPECIFIED' ? input.method : current.paymentMethod,
          status: fullyPaid ? 'PAID' : 'FINALIZED',
          paidAt: fullyPaid ? now : current.paidAt,
          updatedAt: now
        }
        store.put(saved)
      } catch (error) { fail(error) }
    }
    tx.onerror = () => fail(tx.error)
    tx.onabort = () => fail(tx.error)
    tx.oncomplete = () => {
      if (settled) return
      settled = true
      db.close()
      if (!saved) reject(new Error('Encaissement incomplet'))
      else resolve(saved)
    }
  })
}

export const setDocumentStatus = async (id: string, status: 'PAID' | 'CANCELLED'): Promise<CommercialDocument> => {
'''
)

# ---- App integration --------------------------------------------------------
replace(
    'src/App.tsx',
    "import { dashboardStatsForYear } from './dashboardStats'\n",
    "import { dashboardStatsForYear } from './dashboardStats'\n"
    "import { invoicePaymentStateLabel, invoicePaymentSummary, paymentMethodLabel, paymentMethodOptions } from './paymentLifecycle'\n"
)
replace(
    'src/App.tsx',
    "  rememberDocument,\n  removeDocument,\n",
    "  rememberDocument,\n  recordInvoicePayment,\n  removeDocument,\n"
)
replace(
    'src/App.tsx',
    "  DocumentLine,\n  DocumentType\n",
    "  DocumentLine,\n  DocumentType,\n  PaymentMethod\n"
)
replace(
    'src/App.tsx',
    "import './memory.css'\n",
    "import './memory.css'\nimport './payment-lifecycle.css'\n"
)
replace(
    'src/App.tsx',
    "  const [importOpen, setImportOpen] = useState(false)\n",
    "  const [importOpen, setImportOpen] = useState(false)\n  const [paymentTarget, setPaymentTarget] = useState<CommercialDocument | null>(null)\n"
)
replace(
    'src/App.tsx',
    "  const changeStatus = async (id: string, status: 'PAID' | 'CANCELLED') => {\n",
    r'''  const recordPayment = async (input: { amount: number; date: string; method: PaymentMethod; note?: string }) => {
    if (!paymentTarget) throw new Error('Facture introuvable')
    const saved = await recordInvoicePayment(paymentTarget.id, input)
    setPaymentTarget(saved)
    if (draft?.id === saved.id) setDraft(saved)
    await refresh()
    showNotice(saved.status === 'PAID' ? 'Facture soldée' : 'Paiement enregistré')
    return saved
  }

  const changeStatus = async (id: string, status: 'PAID' | 'CANCELLED') => {
'''
)
replace(
    'src/App.tsx',
    "          onStatus={changeStatus}\n",
    "          onStatus={changeStatus}\n          onPayment={setPaymentTarget}\n"
)
replace(
    'src/App.tsx',
    "          onConvert={targetType => convertDocument(draft, targetType)}\n",
    "          onConvert={targetType => convertDocument(draft, targetType)}\n          onPayment={setPaymentTarget}\n"
)
replace(
    'src/App.tsx',
    "      {importOpen && <QuoteImportSheet defaultVatRate={company.defaultVatRate} onClose={() => setImportOpen(false)} onCreate={startImportedQuote} />}\n",
    "      {importOpen && <QuoteImportSheet defaultVatRate={company.defaultVatRate} onClose={() => setImportOpen(false)} onCreate={startImportedQuote} />}\n"
    "      {paymentTarget && <PaymentSheet value={paymentTarget} onClose={() => setPaymentTarget(null)} onSave={recordPayment} />}\n"
)
replace(
    'src/App.tsx',
    "function History({ documents, search, onSearch, onHome, onNew, onEdit, onDuplicate, onConvert, onDelete, onStatus }: {\n",
    "function History({ documents, search, onSearch, onHome, onNew, onEdit, onDuplicate, onConvert, onDelete, onStatus, onPayment }: {\n"
)
replace(
    'src/App.tsx',
    "  onStatus: (id: string, status: 'PAID' | 'CANCELLED') => void\n}) {\n",
    "  onStatus: (id: string, status: 'PAID' | 'CANCELLED') => void\n  onPayment: (document: CommercialDocument) => void\n}) {\n"
)
replace(
    'src/App.tsx',
    "          const showAmount = document.type !== 'BL' || document.blShowPrices\n          return (\n",
    "          const showAmount = document.type !== 'BL' || document.blShowPrices\n          const payment = document.type === 'FACTURE' ? invoicePaymentSummary(document) : null\n          return (\n"
)
replace(
    'src/App.tsx',
    "<span className=\"history-card-topline\"><strong>{document.client || documentLabel(document.type)}</strong><span className=\"saved-chip\"><span className=\"status-dot\" /> {documentStatusLabel(document.status)}</span></span>",
    "<span className=\"history-card-topline\"><strong>{document.client || documentLabel(document.type)}</strong><span className={`saved-chip ${payment ? `payment-state-${payment.state.toLowerCase()}` : ''}`}><span className=\"status-dot\" /> {payment ? invoicePaymentStateLabel(payment.state) : documentStatusLabel(document.status)}</span></span>"
)
replace(
    'src/App.tsx',
    "<span className=\"history-meta-line\"><span>{shortDate(document.date)}</span>{showAmount && <strong>{money(totals.totalTTC)}</strong>}</span>\n",
    "<span className=\"history-meta-line\"><span>{shortDate(document.date)}</span>{showAmount && <strong>{money(totals.totalTTC)}</strong>}</span>\n"
    "                  {payment && payment.state !== 'PAID' && payment.state !== 'CANCELLED' && payment.state !== 'DRAFT' && <span className=\"invoice-balance-line\">Reste {money(payment.remaining)}{document.dueDate ? ` · Échéance ${shortDate(document.dueDate)}` : ''}</span>}\n"
)
replace(
    'src/App.tsx',
    "                {document.type === 'FACTURE' && document.status === 'FINALIZED' && <button onClick={() => onStatus(document.id, 'PAID')}>Payé</button>}\n",
    "                {document.type === 'FACTURE' && (document.status === 'FINALIZED' || document.status === 'PAID') && <button onClick={() => onPayment(document)}>{document.status === 'PAID' ? 'Paiements' : 'Encaisser'}</button>}\n"
)
replace(
    'src/App.tsx',
    "function Editor({ value, company, clients, catalog, onChange, onBack, onSave, onFinalize, onSaveClient, onPdf, onConvert }: {\n",
    "function Editor({ value, company, clients, catalog, onChange, onBack, onSave, onFinalize, onSaveClient, onPdf, onConvert, onPayment }: {\n"
)
replace(
    'src/App.tsx',
    "  onConvert: (type: DocumentType) => void\n}) {\n",
    "  onConvert: (type: DocumentType) => void\n  onPayment: (document: CommercialDocument) => void\n}) {\n"
)
replace(
    'src/App.tsx',
    "  const editable = value.status === 'DRAFT'\n",
    "  const editable = value.status === 'DRAFT'\n  const payment = value.type === 'FACTURE' ? invoicePaymentSummary(value) : null\n"
)
replace(
    'src/App.tsx',
    "        <section className=\"editor-meta glass-panel\">\n          <label><span>N° document</span><input value={value.number || 'Attribué à la finalisation'} readOnly /></label>\n          <label><span>Date</span><input type=\"date\" value={value.date} disabled={!editable} onChange={event => patch({ date: event.target.value })} /></label>\n        </section>\n",
    r'''        <section className="editor-meta glass-panel">
          <label><span>N° document</span><input value={value.number || 'Attribué à la finalisation'} readOnly /></label>
          <label><span>Date</span><input type="date" value={value.date} disabled={!editable} onChange={event => patch({ date: event.target.value })} /></label>
        </section>

        {value.type === 'FACTURE' && payment && (
          <section className="invoice-lifecycle-card glass-panel">
            <div className="invoice-lifecycle-head">
              <div><span className="section-kicker">Encaissement</span><h2>{invoicePaymentStateLabel(payment.state)}</h2></div>
              {!editable && <span className={`invoice-payment-chip payment-state-${payment.state.toLowerCase()}`}>{invoicePaymentStateLabel(payment.state)}</span>}
            </div>
            {editable ? (
              <div className="invoice-terms-grid">
                <label><span>Échéance</span><input type="date" value={value.dueDate} onChange={event => patch({ dueDate: event.target.value })} /></label>
                <label><span>Mode prévu</span><select value={value.paymentMethod} onChange={event => patch({ paymentMethod: event.target.value as PaymentMethod })}>{paymentMethodOptions.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
              </div>
            ) : (
              <>
                <div className="invoice-balance-grid">
                  <div><span>Total</span><strong>{money(payment.total)}</strong></div>
                  <div><span>Encaissé</span><strong>{money(payment.paid)}</strong></div>
                  <div className="remaining"><span>Reste dû</span><strong>{money(payment.remaining)}</strong></div>
                </div>
                <div className="invoice-terms-readonly"><span>{value.dueDate ? `Échéance ${shortDate(value.dueDate)}` : 'Échéance non renseignée'}</span><span>{paymentMethodLabel(value.paymentMethod)}</span></div>
                {(value.status === 'FINALIZED' || value.status === 'PAID') && <button className="invoice-payment-action" onClick={() => onPayment(value)}>{value.status === 'PAID' ? 'Voir les paiements' : 'Enregistrer un paiement / acompte'}</button>}
              </>
            )}
          </section>
        )}
'''
)
replace(
    'src/App.tsx',
    "function ClientQuickForm({ value, onClose, onSave }: {\n",
    r'''function PaymentSheet({ value, onClose, onSave }: {
  value: CommercialDocument
  onClose: () => void
  onSave: (input: { amount: number; date: string; method: PaymentMethod; note?: string }) => Promise<CommercialDocument>
}) {
  const summary = invoicePaymentSummary(value)
  const today = new Date()
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [amount, setAmount] = useState(summary.remaining)
  const [date, setDate] = useState(localDate)
  const [method, setMethod] = useState<PaymentMethod>(value.paymentMethod)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setAmount(summary.remaining) }, [summary.remaining])

  const save = async () => {
    if (method === 'UNSPECIFIED') {
      setError('Choisissez un mode de règlement.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSave({ amount, date, method, note })
      setNote('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Encaissement impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="payment-sheet-layer" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="payment-sheet" role="dialog" aria-modal="true" aria-label="Encaissement facture">
        <div className="sheet-handle" />
        <header><div><span className="section-kicker">Facture {value.number}</span><h2>Encaissements</h2><small>{value.client}</small></div><button onClick={onClose} aria-label="Fermer">×</button></header>
        <div className="payment-sheet-summary">
          <div><span>Total TTC</span><strong>{money(summary.total)}</strong></div>
          <div><span>Encaissé</span><strong>{money(summary.paid)}</strong></div>
          <div className="remaining"><span>Reste dû</span><strong>{money(summary.remaining)}</strong></div>
        </div>
        <div className="payment-sheet-terms"><span>{value.dueDate ? `Échéance ${shortDate(value.dueDate)}` : 'Sans échéance renseignée'}</span><span>{paymentMethodLabel(value.paymentMethod)}</span></div>

        {value.payments.length > 0 ? <div className="payment-history"><span className="section-kicker">Historique</span>{value.payments.map(payment => <article key={payment.id}><div><strong>{money(payment.amount)}</strong><small>{shortDate(payment.date)} · {paymentMethodLabel(payment.method)}</small></div>{payment.note && <span>{payment.note}</span>}</article>)}</div> : value.status === 'PAID' ? <p className="payment-legacy-note">Facture marquée payée sans détail de règlement historique.</p> : null}

        {value.status === 'FINALIZED' && summary.remaining > 0 && (
          <div className="payment-form">
            <div className="payment-form-grid"><label><span>Montant</span><input type="number" inputMode="decimal" min="0.01" step="0.01" max={summary.remaining} value={amount} onChange={event => setAmount(Math.max(0, Number(event.target.value) || 0))} /></label><label><span>Date</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label></div>
            <label><span>Mode de règlement</span><select value={method} onChange={event => setMethod(event.target.value as PaymentMethod)}>{paymentMethodOptions.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
            <label><span>Note facultative</span><input value={note} onChange={event => setNote(event.target.value)} placeholder="Référence, acompte…" /></label>
            {error && <p className="payment-form-error">{error}</p>}
            <button className="payment-save" disabled={busy || amount <= 0} onClick={() => void save()}>{busy ? 'Enregistrement…' : summary.paid > 0 ? 'Ajouter le paiement' : 'Enregistrer le paiement'}</button>
          </div>
        )}
      </section>
    </div>
  )
}

function ClientQuickForm({ value, onClose, onSave }: {
'''
)

# ---- Styles ----------------------------------------------------------------
write('src/payment-lifecycle.css', r'''.invoice-balance-line{display:block;margin-top:5px;font-size:12px;font-weight:700;color:#486057}.saved-chip.payment-state-unpaid,.invoice-payment-chip.payment-state-unpaid{background:rgba(58,105,86,.1);color:#355f50}.saved-chip.payment-state-partial,.invoice-payment-chip.payment-state-partial{background:rgba(190,138,37,.12);color:#85611d}.saved-chip.payment-state-overdue,.invoice-payment-chip.payment-state-overdue{background:rgba(184,66,53,.1);color:#9f4034}.saved-chip.payment-state-paid,.invoice-payment-chip.payment-state-paid{background:rgba(48,128,83,.12);color:#2d744b}.invoice-lifecycle-card{margin:14px 0 0;padding:18px}.invoice-lifecycle-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.invoice-lifecycle-head h2{margin:2px 0 0;font-size:21px}.invoice-payment-chip{border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800}.invoice-terms-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.invoice-terms-grid label,.payment-form label{display:grid;gap:6px;font-size:11px;font-weight:800;color:#6b746f}.invoice-terms-grid input,.invoice-terms-grid select,.payment-form input,.payment-form select{width:100%;min-height:46px;border:1px solid rgba(55,78,68,.13);border-radius:13px;background:rgba(255,255,255,.72);padding:0 12px;font:inherit;color:#24332d}.invoice-balance-grid,.payment-sheet-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}.invoice-balance-grid>div,.payment-sheet-summary>div{padding:11px;border-radius:14px;background:rgba(255,255,255,.58);display:grid;gap:3px}.invoice-balance-grid span,.payment-sheet-summary span{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#78817d}.invoice-balance-grid strong,.payment-sheet-summary strong{font-size:14px;color:#24332d}.invoice-balance-grid .remaining,.payment-sheet-summary .remaining{background:rgba(218,230,222,.78)}.invoice-terms-readonly,.payment-sheet-terms{display:flex;justify-content:space-between;gap:10px;margin-top:11px;font-size:12px;color:#66716c}.invoice-payment-action{width:100%;margin-top:13px;min-height:46px;border:0;border-radius:15px;background:#274f40;color:white;font-weight:800}.payment-sheet-layer{position:fixed;inset:0;z-index:90;background:rgba(25,34,30,.38);backdrop-filter:blur(9px);display:flex;align-items:flex-end;justify-content:center;padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom))}.payment-sheet{width:min(620px,100%);max-height:min(86vh,760px);overflow:auto;border-radius:28px 28px 22px 22px;background:#f4f7f4;box-shadow:0 24px 80px rgba(18,35,28,.28);padding:10px 18px 20px}.payment-sheet .sheet-handle{width:42px;height:5px;border-radius:999px;background:#c1cbc6;margin:0 auto 12px}.payment-sheet header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.payment-sheet header h2{margin:2px 0;font-size:24px}.payment-sheet header small{color:#6c7772}.payment-sheet header button{width:40px;height:40px;border:0;border-radius:50%;background:rgba(54,76,67,.08);font-size:24px}.payment-history{display:grid;gap:8px;margin-top:16px}.payment-history article{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border-radius:14px;background:white}.payment-history article div{display:grid;gap:2px}.payment-history article small,.payment-history article span{font-size:11px;color:#6f7874}.payment-legacy-note{padding:12px;border-radius:14px;background:rgba(190,138,37,.1);font-size:12px;color:#73571d}.payment-form{display:grid;gap:11px;margin-top:16px;padding-top:16px;border-top:1px solid rgba(52,72,64,.1)}.payment-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.payment-form-error{margin:0;color:#a44034;font-size:12px;font-weight:700}.payment-save{min-height:50px;border:0;border-radius:16px;background:#285443;color:white;font-weight:850;font-size:14px}.payment-save:disabled{opacity:.5}@media(max-width:540px){.invoice-terms-grid,.payment-form-grid{grid-template-columns:1fr}.invoice-balance-grid,.payment-sheet-summary{grid-template-columns:1fr 1fr}.invoice-balance-grid .remaining,.payment-sheet-summary .remaining{grid-column:1/-1}.invoice-terms-readonly,.payment-sheet-terms{flex-direction:column;gap:4px}.payment-sheet-layer{padding-left:0;padding-right:0;padding-bottom:0}.payment-sheet{border-radius:28px 28px 0 0;padding-bottom:max(22px,env(safe-area-inset-bottom))}}
''')

# ---- Canonical docs ---------------------------------------------------------
canonical = ROOT / 'docs/FUNCTIONAL_AUDIT_REMEDIATION.md'
text = canonical.read_text()
marker = '## Étape 2 — Continuité / sauvegarde des données\n'
if marker not in text:
    raise SystemExit('Canonical step 2 marker missing')
head = text.split(marker, 1)[0]
canonical.write_text(head + r'''## Étape 2 — Continuité / sauvegarde des données

**État : CLOS — PR #12 mergée et production READY.**

Preuve canonique :
- PR `#12` : MERGED ;
- `main` : `ee14680c4637370ac253ca907e4e8fb64c64e721` ;
- run `33274757981` : SUCCESS, `107/107` tests, navigateur `7/7` ;
- run numérotation `33274757955` : SUCCESS ;
- artefact `9721171861`, SHA-256 `9f32f21e854dc00380dc3c5ef7270ce7bf23cc60004b3c34f689f651850d2ab5` ;
- production auto `dpl_4dSoPNeDURi3wwujXZbMq54umuLi` READY ;
- alias public HTTP 200.

## Étape 3 — Cycle facture / encaissement

**Goal** : une facture doit permettre de suivre l’échéance et les règlements réels sans perdre la simplicité mobile ni affaiblir le verrouillage après finalisation.

**Succès attendu** :
- échéance optionnelle mais validée, jamais antérieure à la date facture ;
- mode de règlement prévu ;
- paiements/acompte append-only après finalisation ;
- aucun paiement nul, négatif, antérieur à la facture ou supérieur au reste dû ;
- calcul fiable Total / Encaissé / Reste ;
- états opérationnels À encaisser / Partiel / En retard / Payé ;
- passage automatique à PAID quand le reste atteint zéro ;
- compatibilité avec les anciennes factures PAID sans historique détaillé ;
- historique + éditeur cohérents sur mobile ;
- BEFORE/AFTER 390/430/768/1280, zéro overflow et zéro erreur navigateur.

**État : EN COURS.**

Repo : `hraaaaf/facture-pwa`
Branche : `feat/invoice-payment-lifecycle`
Base : `ee14680c4637370ac253ca907e4e8fb64c64e721`

## Avancement audit remediation

**2/7 clos = 28,6 %.**

## Next exact

Construire le candidat Step 3, exécuter tests/build, ouvrir la PR et certifier le cycle d’encaissement BEFORE/AFTER avant tout merge.
''')

# ---- Browser certification --------------------------------------------------
write('scripts/payment-lifecycle-certification.mjs', r'''import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const [baselineRoot, featureRoot] = process.argv.slice(2)
if (!baselineRoot || !featureRoot) throw new Error('Usage: node script baselineRoot featureRoot')
const artifactDir = resolve('artifacts/payment-lifecycle')
mkdirSync(artifactDir, { recursive: true })
const widths = [390, 430, 768, 1280]
const failures = []
const assertions = []
const report = { assertions, widths: {}, failure: null }

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }
function serve(root) {
  const dist = resolve(root, 'dist')
  const server = createServer((req, res) => {
    const pathname = new URL(req.url, 'http://x').pathname
    let file = join(dist, pathname === '/' ? 'index.html' : pathname)
    if (!existsSync(file)) file = join(dist, 'index.html')
    try { res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file)) }
    catch { res.writeHead(404); res.end('not found') }
  })
  return new Promise(resolveServer => server.listen(0, '127.0.0.1', () => resolveServer({ server, url: `http://127.0.0.1:${server.address().port}` })))
}

async function seed(page) {
  await page.goto('about:blank')
  await page.goto(currentUrl)
  await page.evaluate(async () => {
    const req = indexedDB.open('facture-pwa', 3)
    const db = await new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error) })
    const tx = db.transaction(['settings', 'documents'], 'readwrite')
    tx.objectStore('settings').put({
      name:'TAPISTOR',brand:'TAPISTOR',address:'Rabat',cityLabel:'Rabat',phone:'',fax:'',email:'',ice:'001',ifNumber:'001',rc:'',patente:'',cnss:'',bankName:'',rib:'',legalLine:'',defaultVatRate:20,logoDataUrl:'',managerSignatureDataUrl:'',pdfTemplate:'premium',onboardingCompleted:true,
      numberingPrefixes:{DEVIS:'DEV',FACTURE:'F',BL:'BL',BC:'BC'},numberingBaseline:{year:2026,lastUsed:{DEVIS:0,FACTURE:202,BL:0,BC:0}}
    }, 'company')
    const base = {
      type:'FACTURE',date:'2026-08-01',clientId:'',clientAddress:'',clientIce:'',clientIfNumber:'',object:'Fourniture',blShowPrices:false,globalDiscountPercent:0,status:'FINALIZED',finalizedAt:'2026-08-01T09:00:00.000Z',paidAt:'',cancelledAt:'',sourceDocumentId:'',createdAt:'2026-08-01T09:00:00.000Z',updatedAt:'2026-08-01T09:00:00.000Z',
      lines:[{id:'l1',designation:'Service',unit:'Pièce',quantity:1,unitPriceHT:1000,vatRate:20,discountPercent:0}]
    }
    tx.objectStore('documents').put({ ...base, id:'invoice-pay', number:'F-2026-201', client:'Client Paiement', dueDate:'2099-12-31', paymentMethod:'BANK_TRANSFER', payments:[] })
    tx.objectStore('documents').put({ ...base, id:'invoice-overdue', number:'F-2026-202', client:'Client Retard', lines:[{...base.lines[0],unitPriceHT:500}], dueDate:'2026-08-10', paymentMethod:'CHECK', payments:[] })
    await new Promise((resolve, reject) => { tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error) })
    db.close()
  })
  await page.reload()
  await page.getByText('Historique', { exact: true }).last().click()
  await page.waitForTimeout(250)
}

function check(name, ok, detail='') { assertions.push({ name, ok, detail }); if (!ok) failures.push(`${name}: ${detail}`) }

const baseline = await serve(baselineRoot)
const feature = await serve(featureRoot)
const browser = await chromium.launch({ headless: true })
let currentUrl = baseline.url
try {
  for (const width of widths) {
    const row = report.widths[width] = {}
    for (const phase of ['before','after']) {
      currentUrl = phase === 'before' ? baseline.url : feature.url
      const page = await browser.newPage({ viewport: { width, height: width <= 430 ? 844 : 900 } })
      const pageErrors = []; const consoleErrors = []
      page.on('pageerror', error => pageErrors.push(String(error)))
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
      await seed(page)
      const screenshot = join(artifactDir, `${phase}-${width}.png`)
      await page.screenshot({ path: screenshot, fullPage: true })
      row[phase] = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth, text: document.body.innerText }))
      row[phase].pageErrors = pageErrors; row[phase].consoleErrors = consoleErrors
      await page.close()
    }
  }

  check('baseline_defect', report.widths[390].before.text.includes('Payé') && !report.widths[390].before.text.includes('Encaisser'), 'baseline must expose only the legacy Paid shortcut')
  check('operational_states', report.widths[390].after.text.includes('À encaisser') && report.widths[390].after.text.includes('En retard'), 'feature must distinguish unpaid and overdue')
  check('balance_visibility', report.widths[390].after.text.includes('Reste') && report.widths[390].after.text.includes('1 200,00') && report.widths[390].after.text.includes('600,00'), 'remaining balances must be visible')

  currentUrl = feature.url
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await seed(page)
  const card = page.locator('.premium-history-card').filter({ hasText: 'Client Paiement' })
  await card.getByText('Encaisser', { exact: true }).click()
  check('payment_sheet', await page.getByRole('dialog', { name: 'Encaissement facture' }).isVisible(), 'payment sheet should open')
  await page.getByLabel('Montant').fill('400')
  await page.getByLabel('Mode de règlement').selectOption('BANK_TRANSFER')
  await page.getByRole('button', { name: 'Enregistrer le paiement' }).click()
  await page.waitForTimeout(200)
  check('partial_payment', (await page.locator('.payment-sheet').innerText()).includes('800,00') && (await page.locator('.payment-sheet').innerText()).includes('400,00'), '400 payment should leave 800')
  await page.getByLabel('Montant').fill('800')
  await page.getByRole('button', { name: 'Ajouter le paiement' }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Fermer' }).click()
  await page.reload(); await page.getByText('Historique', { exact: true }).last().click(); await page.waitForTimeout(200)
  const paidCard = page.locator('.premium-history-card').filter({ hasText: 'Client Paiement' })
  check('full_payment_persists', (await paidCard.innerText()).includes('Payé') && !(await paidCard.innerText()).includes('Reste'), 'second payment should settle and persist')
  const raw = await page.evaluate(async () => {
    const req = indexedDB.open('facture-pwa', 3); const db = await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})
    const tx=db.transaction('documents','readonly'); const r=tx.objectStore('documents').get('invoice-pay'); const value=await new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)}); db.close(); return value
  })
  check('ledger_atomicity', raw.status === 'PAID' && raw.payments?.length === 2 && Math.abs(raw.payments.reduce((s,p)=>s+p.amount,0)-1200)<0.001, JSON.stringify({status:raw.status,payments:raw.payments?.length}))
  await page.close()

  const layoutsOk = widths.every(width => ['before','after'].every(phase => { const x=report.widths[width][phase]; return x.scrollWidth === x.innerWidth && x.pageErrors.length === 0 && x.consoleErrors.length === 0 }))
  check('responsive_clean', layoutsOk, 'all viewports require exact width and zero browser errors')
} catch (error) { report.failure = error instanceof Error ? error.stack : String(error); failures.push(report.failure) }
finally {
  await browser.close(); baseline.server.closeAllConnections?.(); feature.server.closeAllConnections?.(); await Promise.all([new Promise(r=>baseline.server.close(r)),new Promise(r=>feature.server.close(r))])
}
writeFileSync(join(artifactDir,'report.json'), JSON.stringify(report,null,2))
if (failures.length) { console.error(failures.join('\n')); process.exit(1) }
console.log(`PAYMENT LIFECYCLE CERTIFIED: ${assertions.length}/${assertions.length} assertions`)
''')

write('.github/workflows/payment-lifecycle-cert.yml', r'''name: Payment Lifecycle Certification
on:
  pull_request:
    branches: [main]
    paths:
      - 'src/types.ts'
      - 'src/lib.ts'
      - 'src/storage.ts'
      - 'src/App.tsx'
      - 'src/paymentLifecycle.ts'
      - 'src/paymentLifecycle.test.ts'
      - 'src/payment-lifecycle.css'
      - 'scripts/payment-lifecycle-certification.mjs'
      - '.github/workflows/payment-lifecycle-cert.yml'
      - 'docs/FUNCTIONAL_AUDIT_REMEDIATION.md'
permissions:
  contents: read
jobs:
  certify:
    runs-on: ubuntu-24.04
    timeout-minutes: 12
    steps:
      - name: Checkout feature
        uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Node
        uses: actions/setup-node@v4
        with: { node-version: 22 }
      - name: Install
        run: npm install --no-audit --no-fund
      - name: Unit tests
        run: npm test
      - name: Build feature
        run: npm run build
      - name: Install Playwright
        run: |
          npm install --no-save playwright
          npx playwright install --with-deps chromium
      - name: Build main baseline
        run: |
          rm -rf /tmp/facture-main
          mkdir -p /tmp/facture-main
          git archive origin/main | tar -x -C /tmp/facture-main
          ln -s "$GITHUB_WORKSPACE/node_modules" /tmp/facture-main/node_modules
          (cd /tmp/facture-main && npm run build)
      - name: Browser before-after certification
        run: timeout --signal=TERM --kill-after=5s 180s node scripts/payment-lifecycle-certification.mjs /tmp/facture-main .
      - name: Verify report
        run: |
          node - <<'NODE'
          const fs=require('fs'); const r=JSON.parse(fs.readFileSync('artifacts/payment-lifecycle/report.json','utf8'))
          if(r.failure) throw new Error(r.failure)
          if(!Array.isArray(r.assertions)||r.assertions.length!==8||r.assertions.some(x=>!x.ok)) throw new Error('Payment lifecycle assertions incomplete')
          for(const w of [390,430,768,1280]) for(const p of ['before','after']) if(!fs.existsSync(`artifacts/payment-lifecycle/${p}-${w}.png`)) throw new Error(`Missing ${p}-${w}`)
          console.log('PAYMENT LIFECYCLE REPORT VERIFIED')
          NODE
      - name: Upload visual proof
        uses: actions/upload-artifact@v4
        with:
          name: payment-lifecycle-before-after
          path: artifacts/payment-lifecycle
          if-no-files-found: error
          retention-days: 5
''')

print('STEP 3 PATCH APPLIED')
