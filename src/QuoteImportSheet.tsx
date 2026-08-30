import { useMemo, useRef, useState } from 'react'
import { extractInputFile, extractedInputToRawQuote } from './inputExtractors'
import { IMPORT_TIMEOUT_MS, MAX_IMPORT_BYTES, MAX_PDF_PAGES } from './importGuards'
import { prepareImportDictionary } from './importDictionary'
import { importDebug } from './importDebug'
import { voiceToRawQuote } from './voiceQuoteParser'
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

type FileImportMode = 'PHOTO' | 'PDF' | 'EXCEL' | 'WORD'
type ImportMode = FileImportMode | 'VOICE'
type Step = 'PICKER' | 'VOICE' | 'PROCESSING' | 'REVIEW' | 'READY' | 'ERROR'

type SpeechRecognitionResultLike = {
  isFinal: boolean
  0: { transcript: string }
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

const acceptByMode: Record<FileImportMode, string> = {
  PHOTO: 'image/png,image/jpeg,image/webp,image/bmp,image/gif',
  PDF: 'application/pdf,.pdf',
  EXCEL: '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv',
  WORD: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

const modeLabel: Record<ImportMode, string> = { PHOTO: 'Photo', PDF: 'PDF', EXCEL: 'Excel', WORD: 'Word', VOICE: 'Vocal' }
const modeMark: Record<ImportMode, string> = { PHOTO: 'IMG', PDF: 'PDF', EXCEL: 'XLS', WORD: 'DOC', VOICE: 'MIC' }

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

const getSpeechRecognitionCtor = (): SpeechRecognitionCtor | null => {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

const localToday = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const importAbortRef = useRef<AbortController | null>(null)
  const [mode, setMode] = useState<ImportMode>('PDF')
  const [step, setStep] = useState<Step>('PICKER')
  const [quote, setQuote] = useState<CanonicalQuoteJSON | null>(null)
  const [reviewIssues, setReviewIssues] = useState<QuoteIssue[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [voiceText, setVoiceText] = useState('')
  const [voiceListening, setVoiceListening] = useState(false)

  const errors = useMemo(() => quote?.issues.filter(issue => issue.severity === 'ERROR') ?? [], [quote])
  const quoteWarnings = useMemo(() => quote?.issues.filter(issue => issue.severity === 'WARNING') ?? [], [quote])
  const voiceSupported = typeof window !== 'undefined' && Boolean(getSpeechRecognitionCtor())

  const choose = (nextMode: ImportMode) => {
    setMode(nextMode)
    setError('')
    if (nextMode === 'VOICE') {
      setVoiceText('')
      setStep('VOICE')
      return
    }
    window.setTimeout(() => fileRef.current?.click(), 0)
  }

  const stopVoice = () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setVoiceListening(false)
  }

  const startVoice = () => {
    const Recognition = getSpeechRecognitionCtor()
    if (!Recognition) {
      setError('La dictée vocale native n’est pas disponible ici. Saisissez ou collez la transcription ci-dessous.')
      return
    }
    recognitionRef.current?.abort()
    const recognition = new Recognition()
    recognition.lang = 'fr-FR'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.onresult = event => {
      const parts: string[] = []
      for (let index = 0; index < event.results.length; index += 1) {
        const part = event.results[index][0].transcript.trim()
        if (part) parts.push(part)
      }
      setVoiceText(parts.join(' ').replace(/\s+/g, ' ').trim())
    }
    recognition.onerror = event => {
      setVoiceListening(false)
      setError(event.error === 'not-allowed' ? 'Accès au micro refusé. Autorisez le micro ou saisissez la transcription.' : 'La dictée a été interrompue. Vous pouvez reprendre ou corriger le texte.')
    }
    recognition.onend = () => {
      recognitionRef.current = null
      setVoiceListening(false)
    }
    recognitionRef.current = recognition
    setError('')
    setVoiceListening(true)
    recognition.start()
  }

  const analyzeVoice = () => {
    stopVoice()
    if (!voiceText.trim()) {
      setError('Dictez ou saisissez au moins une ligne avant l’analyse.')
      return
    }
    setStep('PROCESSING')
    setSourceName('Message vocal')
    const raw = voiceToRawQuote(voiceText, defaultVatRate)
    if (!raw.date) raw.date = localToday()
    const canonical = normalizeImportedRaw(raw, defaultVatRate)
    setQuote(canonical)
    setReviewIssues(canonical.issues.filter(issue => issue.severity === 'ERROR'))
    setWarnings([])
    setStep(canonical.status === 'READY' ? 'READY' : 'REVIEW')
  }

  const abortImport = () => {
    if (importAbortRef.current && !importAbortRef.current.signal.aborted) importAbortRef.current.abort()
  }

  const closeSheet = () => {
    abortImport()
    onClose()
  }

  const reset = () => {
    abortImport()
    importAbortRef.current = null
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setVoiceListening(false)
    setStep('PICKER')
    setQuote(null)
    setReviewIssues([])
    setWarnings([])
    setError('')
    setSourceName('')
    setVoiceText('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const importFile = async (file: File) => {
    importAbortRef.current?.abort()
    const controller = new AbortController()
    importAbortRef.current = controller
    setStep('PROCESSING')
    setError('')
    setSourceName(file.name)
    try {
      const extracted = await extractInputFile(file, { signal: controller.signal })
      const raw = extractedInputToRawQuote(extracted)
      const canonical = normalizeImportedRaw(raw, defaultVatRate)
      setWarnings(extracted.warnings)
      setQuote(canonical)
      setReviewIssues(canonical.issues.filter(issue => issue.severity === 'ERROR'))
      setStep(canonical.status === 'READY' ? 'READY' : 'REVIEW')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de lire ce fichier.')
      setStep('ERROR')
    } finally {
      if (importAbortRef.current === controller) importAbortRef.current = null
    }
  }

  const changeIssue = (issue: QuoteIssue, value: string) => {
    if (!quote) return
    const raw = patchRawField(canonicalToRaw(quote), issue.field, value)
    const next = normalizeImportedRaw(raw, defaultVatRate)
    setQuote(next)
    importDebug('voice.review.change', {
      mode,
      field: issue.field,
      valueLength: value.length,
      status: next.status,
      remainingErrors: next.issues.filter(item => item.severity === 'ERROR').length
    })
  }

  const confirmReview = () => {
    if (!quote || errors.length > 0) return
    importDebug('voice.review.confirm', { mode, status: quote.status, remainingErrors: errors.length })
    setStep('READY')
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
    <div className="quote-import-layer" role="presentation" onMouseDown={event => event.target === event.currentTarget && closeSheet()}>
      <section className="quote-import-sheet" role="dialog" aria-modal="true" aria-label="Importer vers devis">
        <div className="sheet-handle" />
        <header className="quote-import-header">
          <button className="sheet-close" onClick={closeSheet} aria-label="Fermer">×</button>
          <div><span className="section-kicker">INPUT → DEVIS</span><h2>Importer un devis</h2><p>Lecture et correction sur cet appareil</p></div>
          <span className="quote-local-badge"><span className="status-dot" /> Local</span>
        </header>

        <input
          ref={fileRef}
          className="quote-file-input"
          type="file"
          accept={mode === 'VOICE' ? undefined : acceptByMode[mode]}
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
              {(['PHOTO', 'PDF', 'EXCEL', 'WORD'] as FileImportMode[]).map(item => (
                <button key={item} onClick={() => choose(item)}>
                  <span className="quote-format-mark">{modeMark[item]}</span>
                  <strong>{modeLabel[item]}</strong>
                </button>
              ))}
              <button className="quote-voice-choice" onClick={() => choose('VOICE')}>
                <span className="quote-voice-icon">●</span>
                <span><small>VOCAL</small><strong>Dicter le devis</strong><em>Parlez naturellement, puis vérifiez.</em></span>
              </button>
            </div>
            <p className="quote-privacy-note"><span className="status-dot" /> Les documents restent locaux. La dictée native dépend du navigateur et peut utiliser son propre service vocal.</p>
            <p className="quote-limit-note">Limites de sécurité : {Math.round(MAX_IMPORT_BYTES / 1024 / 1024)} Mo · PDF {MAX_PDF_PAGES} pages max · {Math.round(IMPORT_TIMEOUT_MS / 1000)} s max.</p>
          </>
        )}

        {step === 'VOICE' && (
          <div className="quote-voice-panel">
            <div className={`quote-voice-orb ${voiceListening ? 'listening' : ''}`} aria-hidden="true"><span>●</span></div>
            <span className="section-kicker">MESSAGE VOCAL</span>
            <h3>{voiceListening ? 'Je vous écoute…' : 'Dictez votre devis'}</h3>
            <p>Exemple : « Client Hôtel Atlas, 200 draps à 85 dirhams, TVA 20 %. »</p>
            <textarea
              value={voiceText}
              onChange={event => setVoiceText(event.target.value)}
              placeholder="La transcription apparaîtra ici. Vous pouvez aussi la saisir ou la corriger manuellement."
              aria-label="Transcription du message vocal"
            />
            {error && <p className="quote-voice-error">{error}</p>}
            {!voiceSupported && !error && <p className="quote-voice-hint">Dictée native indisponible sur ce navigateur : la saisie manuelle reste utilisable.</p>}
            <div className="quote-voice-actions">
              <button onClick={reset}>Retour</button>
              <button className={voiceListening ? 'quote-stop-voice' : ''} onClick={voiceListening ? stopVoice : startVoice}>
                {voiceListening ? 'Arrêter' : 'Commencer'}
              </button>
              <button className="quote-primary" onClick={analyzeVoice} disabled={!voiceText.trim()}>Analyser</button>
            </div>
          </div>
        )}

        {step === 'PROCESSING' && (
          <div className="quote-processing" aria-live="polite">
            <span className="quote-spinner" />
            <strong>Analyse du document…</strong>
            <span>{sourceName}</span>
            <small>Extraction → dictionnaire → validation → JSON canonique</small>
            <button className="quote-cancel-processing" onClick={abortImport}>Annuler l’analyse</button>
          </div>
        )}

        {step === 'ERROR' && (
          <div className="quote-error-card">
            <strong>Import impossible</strong>
            <p>{error}</p>
            <div><button onClick={reset}>Annuler</button><button className="quote-primary" onClick={() => mode !== 'VOICE' && choose(mode)}>Réessayer</button></div>
          </div>
        )}

        {step === 'REVIEW' && quote && (
          <>
            <div className="quote-import-summary">
              <div><span>Source</span><strong>{quote.source.kind}</strong><small>{sourceName}</small></div>
              <div><span>Lignes</span><strong>{quote.lines.length}</strong><small>détectées</small></div>
              <div className="needs-review"><span>À vérifier</span><strong>{errors.length}</strong><small>champ{errors.length > 1 ? 's' : ''}</small></div>
            </div>
            <div className="quote-review-heading"><div><span className="section-kicker">Revue ciblée</span><h3>Uniquement les incertitudes</h3></div><button onClick={reset}>Changer de source</button></div>
            <div className="quote-review-list">
              {reviewIssues.map(issue => {
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
            <div className="quote-ready-actions">
              <button onClick={reset}>Recommencer</button>
              <button className="quote-primary" onClick={confirmReview} disabled={errors.length > 0}>Valider les corrections</button>
            </div>
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
