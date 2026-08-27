import { useMemo, useRef, useState } from 'react'
import { extractInputFile, extractedInputToRawQuote } from './inputExtractors'
import { prepareImportDictionary } from './importDictionary'
import {
  canonicalQuoteToDocumentFields,
  normalizeQuotePayload,
  type CanonicalQuoteJSON,
  type QuoteIssue,
  type RawQuotePayload
} from './quoteImport'
import type { CommercialDocument } from './types'
import './quote-import.css'

export type ImportedQuoteFields = Pick<CommercialDocument,
  'client' | 'clientAddress' | 'clientIce' | 'clientIfNumber' | 'object' | 'date' | 'lines' | 'globalDiscountPercent'>

type ImportMode = 'PHOTO' | 'PDF' | 'EXCEL' | 'WORD'
type Step = 'PICKER' | 'PROCESSING' | 'REVIEW' | 'READY' | 'ERROR'

const acceptByMode: Record<ImportMode, string> = {
  PHOTO: 'image/png,image/jpeg,image/webp,image/bmp,image/gif',
  PDF: 'application/pdf,.pdf',
  EXCEL: '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv',
  WORD: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

const modeLabel: Record<ImportMode, string> = { PHOTO: 'Photo', PDF: 'PDF', EXCEL: 'Excel', WORD: 'Word' }
const modeMark: Record<ImportMode, string> = { PHOTO: 'IMG', PDF: 'PDF', EXCEL: 'XLS', WORD: 'DOC' }

const canonicalToRaw = (quote: CanonicalQuoteJSON): RawQuotePayload => ({
  source: quote.source,
  client: {
    name: quote.client.name,
    address: quote.client.address,
    ice: quote.client.ice,
    ifNumber: quote.client.ifNumber
  },
  object: quote.quote.object,
  date: quote.quote.date,
  currency: quote.quote.currency,
  globalDiscountPercent: quote.quote.globalDiscountPercent,
  lines: quote.lines.map(line => ({
    designation: line.designation,
    unit: line.unit,
    quantity: line.quantity,
    unitPriceHT: line.unitPriceHT,
    vatRate: line.vatRate,
    discountPercent: line.discountPercent
  }))
})

const normalizeImportedRaw = (raw: RawQuotePayload, defaultVatRate: number) => {
  const prepared = prepareImportDictionary(raw)
  return normalizeQuotePayload(prepared.raw, { defaultVatRate, defaultUnit: 'Unité', dictionary: prepared.dictionary })
}

const getFieldValue = (quote: CanonicalQuoteJSON, field: string): string | number => {
  if (field === 'client.name') return quote.client.name ?? ''
  if (field === 'quote.object') return quote.quote.object ?? ''
  if (field === 'quote.date') return quote.quote.date ?? ''
  const match = field.match(/^lines\.(\d+)\.(designation|unit|quantity|unitPriceHT|vatRate|discountPercent)$/)
  if (!match) return ''
  const line = quote.lines[Number(match[1])]
  if (!line) return ''
  const value = line[match[2] as keyof typeof line]
  return typeof value === 'number' || typeof value === 'string' ? value : ''
}

const patchRawField = (raw: RawQuotePayload, field: string, value: string): RawQuotePayload => {
  const next = structuredClone(raw)
  if (field === 'client.name') {
    next.client = { ...next.client, name: value }
    return next
  }
  if (field === 'quote.object') {
    next.object = value
    return next
  }
  if (field === 'quote.date') {
    next.date = value
    return next
  }
  const match = field.match(/^lines\.(\d+)\.(designation|unit|quantity|unitPriceHT|vatRate|discountPercent)$/)
  if (!match || !next.lines) return next
  const index = Number(match[1])
  next.lines[index] = { ...next.lines[index], [match[2]]: value }
  return next
}

const issueInputType = (issue: QuoteIssue) => {
  if (issue.field === 'quote.date') return 'date'
  if (/\.(quantity|unitPriceHT|vatRate|discountPercent)$/.test(issue.field)) return 'number'
  return 'text'
}

const totalHT = (quote: CanonicalQuoteJSON) => quote.lines.reduce((sum, line) => {
  if (line.quantity === null || line.unitPriceHT === null) return sum
  const gross = line.quantity * line.unitPriceHT
  return sum + gross * (1 - line.discountPercent / 100)
}, 0) * (1 - quote.quote.globalDiscountPercent / 100)

export function QuoteImportSheet({ defaultVatRate, onClose, onCreate }: {
  defaultVatRate: number
  onClose: () => void
  onCreate: (fields: ImportedQuoteFields) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<ImportMode>('PDF')
  const [step, setStep] = useState<Step>('PICKER')
  const [quote, setQuote] = useState<CanonicalQuoteJSON | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState('')
  const [sourceName, setSourceName] = useState('')

  const errors = useMemo(() => quote?.issues.filter(issue => issue.severity === 'ERROR') ?? [], [quote])
  const quoteWarnings = useMemo(() => quote?.issues.filter(issue => issue.severity === 'WARNING') ?? [], [quote])

  const choose = (nextMode: ImportMode) => {
    setMode(nextMode)
    window.setTimeout(() => fileRef.current?.click(), 0)
  }

  const reset = () => {
    setStep('PICKER')
    setQuote(null)
    setWarnings([])
    setError('')
    setSourceName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const importFile = async (file: File) => {
    setStep('PROCESSING')
    setError('')
    setSourceName(file.name)
    try {
      const extracted = await extractInputFile(file)
      const raw = extractedInputToRawQuote(extracted)
      const canonical = normalizeImportedRaw(raw, defaultVatRate)
      setWarnings(extracted.warnings)
      setQuote(canonical)
      setStep(canonical.status === 'READY' ? 'READY' : 'REVIEW')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de lire ce fichier.')
      setStep('ERROR')
    }
  }

  const changeIssue = (issue: QuoteIssue, value: string) => {
    if (!quote) return
    const raw = patchRawField(canonicalToRaw(quote), issue.field, value)
    const next = normalizeImportedRaw(raw, defaultVatRate)
    setQuote(next)
    if (next.status === 'READY') setStep('READY')
  }

  const create = () => {
    if (!quote) return
    try {
      const fields = canonicalQuoteToDocumentFields(quote, () => crypto.randomUUID())
      onCreate(fields)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Le devis doit encore être vérifié.')
      setStep('REVIEW')
    }
  }

  return (
    <div className="quote-import-layer" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="quote-import-sheet" role="dialog" aria-modal="true" aria-label="Importer vers devis">
        <div className="sheet-handle" />
        <header className="quote-import-header">
          <button className="sheet-close" onClick={onClose} aria-label="Fermer">×</button>
          <div><span className="section-kicker">INPUT → DEVIS</span><h2>Importer un devis</h2><p>Lecture et correction sur cet appareil</p></div>
          <span className="quote-local-badge"><span className="status-dot" /> Local</span>
        </header>

        <input
          ref={fileRef}
          className="quote-file-input"
          type="file"
          accept={acceptByMode[mode]}
          onChange={event => {
            const file = event.target.files?.[0]
            if (file) void importFile(file)
          }}
        />

        {step === 'PICKER' && (
          <>
            <div className="quote-import-intro">
              <strong>Choisissez la source</strong>
              <span>Les champs détectés sont normalisés puis contrôlés avant création.</span>
            </div>
            <div className="quote-format-grid">
              {(Object.keys(modeLabel) as ImportMode[]).map(item => (
                <button key={item} onClick={() => choose(item)}>
                  <span className="quote-format-mark">{modeMark[item]}</span>
                  <strong>{modeLabel[item]}</strong>
                </button>
              ))}
            </div>
            <p className="quote-privacy-note"><span className="status-dot" /> Le document reste local. Les modèles OCR peuvent être téléchargés au premier usage.</p>
          </>
        )}

        {step === 'PROCESSING' && (
          <div className="quote-processing" aria-live="polite">
            <span className="quote-spinner" />
            <strong>Analyse du document…</strong>
            <span>{sourceName}</span>
            <small>Extraction → dictionnaire → validation → JSON canonique</small>
          </div>
        )}

        {step === 'ERROR' && (
          <div className="quote-error-card">
            <strong>Import impossible</strong>
            <p>{error}</p>
            <div><button onClick={reset}>Annuler</button><button className="quote-primary" onClick={() => choose(mode)}>Réessayer</button></div>
          </div>
        )}

        {step === 'REVIEW' && quote && (
          <>
            <div className="quote-import-summary">
              <div><span>Source</span><strong>{quote.source.kind}</strong><small>{sourceName}</small></div>
              <div><span>Lignes</span><strong>{quote.lines.length}</strong><small>détectées</small></div>
              <div className="needs-review"><span>À vérifier</span><strong>{errors.length}</strong><small>champ{errors.length > 1 ? 's' : ''}</small></div>
            </div>
            <div className="quote-review-heading"><div><span className="section-kicker">Revue ciblée</span><h3>Uniquement les incertitudes</h3></div><button onClick={reset}>Changer de fichier</button></div>
            <div className="quote-review-list">
              {errors.map(issue => {
                const editable = !['CURRENCY_UNSUPPORTED', 'LINES_REQUIRED'].includes(issue.code)
                return (
                  <label className={`quote-review-field ${editable ? '' : 'blocked'}`} key={`${issue.code}-${issue.field}`}>
                    <span>{issue.message}</span>
                    {editable ? (
                      <input
                        type={issueInputType(issue)}
                        inputMode={issueInputType(issue) === 'number' ? 'decimal' : undefined}
                        value={getFieldValue(quote, issue.field)}
                        onChange={event => changeIssue(issue, event.target.value)}
                      />
                    ) : <small>Corrigez la source puis relancez l’import. Aucune conversion ou ligne ne sera inventée.</small>}
                  </label>
                )
              })}
            </div>
            {(warnings.length > 0 || quoteWarnings.length > 0) && <p className="quote-warning-note">{[...warnings, ...quoteWarnings.map(item => item.message)].join(' · ')}</p>}
          </>
        )}

        {step === 'READY' && quote && (
          <>
            <div className="quote-ready-hero"><span className="quote-ready-check">✓</span><div><span className="section-kicker">JSON CANONIQUE PRÊT</span><h3>{quote.client.name}</h3><p>{quote.quote.object}</p></div></div>
            <div className="quote-ready-grid">
              <div><span>Lignes</span><strong>{quote.lines.length}</strong></div>
              <div><span>Total HT détecté</span><strong>{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(totalHT(quote))} MAD</strong></div>
            </div>
            {(warnings.length > 0 || quoteWarnings.length > 0) && <p className="quote-warning-note">{[...warnings, ...quoteWarnings.map(item => item.message)].join(' · ')}</p>}
            <div className="quote-ready-actions"><button onClick={reset}>Recommencer</button><button className="quote-primary" onClick={create}>Créer le devis</button></div>
          </>
        )}
      </section>
    </div>
  )
}
