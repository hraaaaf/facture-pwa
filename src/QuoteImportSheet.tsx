import { useMemo, useRef, useState } from 'react'
import { extractInputFile, extractedInputToRawQuote } from './inputExtractors'
import { IMPORT_TIMEOUT_MS, MAX_IMPORT_BYTES, MAX_PDF_PAGES } from './importGuards'
import { prepareImportDictionary } from './importDictionary'
import { importDebug } from './importDebug'
import { voiceToRawQuote } from './voiceQuoteParser'
import {
  normalizeQuotePayload,
  type CanonicalQuoteJSON,
  type RawQuotePayload
} from './quoteImport'
import {
  defaultQuoteImportSelection,
  isImportableQuoteLine,
  selectedQuoteImportCount,
  selectedQuoteToDraftFields,
  type ImportedQuoteFields,
  type QuoteImportSelection,
  type QuoteSelectionField
} from './quoteImportSelection'
import './quote-import.css'

export type { ImportedQuoteFields } from './quoteImportSelection'

type FileImportMode = 'PHOTO' | 'PDF' | 'EXCEL' | 'WORD'
type ImportMode = FileImportMode | 'VOICE'
type Step = 'PICKER' | 'VOICE' | 'PROCESSING' | 'SUMMARY' | 'ERROR'

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
  const [selection, setSelection] = useState<QuoteImportSelection | null>(null)
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
    setSelection(defaultQuoteImportSelection(canonical))
    setWarnings([])
    setStep('SUMMARY')
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
    setSelection(null)
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
      setSelection(defaultQuoteImportSelection(canonical))
      setStep('SUMMARY')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de lire ce fichier.')
      setStep('ERROR')
    } finally {
      if (importAbortRef.current === controller) importAbortRef.current = null
    }
  }

  const toggleField = (field: QuoteSelectionField) => {
    setSelection(current => current ? {
      ...current,
      fields: { ...current.fields, [field]: !current.fields[field] }
    } : current)
  }

  const toggleLine = (index: number) => {
    setSelection(current => {
      if (!current) return current
      const lines = [...current.lines]
      lines[index] = !lines[index]
      return { ...current, lines }
    })
  }

  const selectAllDetected = () => {
    if (!quote) return
    setSelection(defaultQuoteImportSelection(quote))
  }

  const clearSelection = () => {
    setSelection(current => current ? {
      fields: Object.fromEntries(
        Object.keys(current.fields).map(key => [key, false])
      ) as QuoteImportSelection['fields'],
      lines: current.lines.map(() => false)
    } : current)
  }

  const create = () => {
    if (!quote || !selection || selectedQuoteImportCount(selection) === 0) return
    const fields = selectedQuoteToDraftFields(quote, selection, () => crypto.randomUUID())
    importDebug('quote.summary.confirm', {
      mode,
      selectedCount: selectedQuoteImportCount(selection),
      detectedLines: quote.lines.length,
      importedLines: fields.lines.length
    })
    onCreate(fields)
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

        {step === 'SUMMARY' && quote && selection && (
          <>
            <div className="quote-import-summary">
              <div><span>Source</span><strong>{quote.source.kind}</strong><small>{sourceName}</small></div>
              <div><span>Lignes</span><strong>{quote.lines.length}</strong><small>détectées</small></div>
              <div className={errors.length > 0 ? 'needs-review' : ''}>
                <span>À compléter</span><strong>{errors.length}</strong><small>dans le brouillon</small>
              </div>
            </div>

            <div className="quote-review-heading">
              <div><span className="section-kicker">Résumé de l’import</span><h3>Choisissez ce que vous gardez</h3></div>
              <button onClick={reset}>Changer de source</button>
            </div>

            <div className="quote-selection-toolbar">
              <span><strong>{selectedQuoteImportCount(selection)}</strong> élément{selectedQuoteImportCount(selection) > 1 ? 's' : ''} sélectionné{selectedQuoteImportCount(selection) > 1 ? 's' : ''}</span>
              <div>
                <button type="button" onClick={selectAllDetected}>Tout sélectionner</button>
                <button type="button" onClick={clearSelection}>Tout décocher</button>
              </div>
            </div>

            <div className="quote-selection-section">
              <div className="quote-selection-section-title">
                <span className="section-kicker">Informations</span>
                <small>Décochez ce que vous ne voulez pas importer.</small>
              </div>
              <div className="quote-selection-list">
                {([
                  { key: 'client', label: 'Client', value: quote.client.name },
                  { key: 'object', label: 'Objet', value: quote.quote.object },
                  { key: 'date', label: 'Date', value: quote.quote.date },
                  { key: 'clientAddress', label: 'Adresse', value: quote.client.address },
                  { key: 'clientIce', label: 'ICE', value: quote.client.ice },
                  { key: 'clientIfNumber', label: 'IF', value: quote.client.ifNumber },
                  ...(quote.quote.globalDiscountPercent > 0
                    ? [{ key: 'globalDiscountPercent' as QuoteSelectionField, label: 'Remise globale', value: `${quote.quote.globalDiscountPercent} %` }]
                    : [])
                ] as Array<{ key: QuoteSelectionField; label: string; value: string | null }>).map(item => {
                  const available = Boolean(item.value && String(item.value).trim())
                  return (
                    <label className={`quote-selection-row ${available ? '' : 'unavailable'}`} key={item.key}>
                      <input
                        type="checkbox"
                        checked={available && selection.fields[item.key]}
                        disabled={!available}
                        onChange={() => toggleField(item.key)}
                      />
                      <span className="quote-selection-check" aria-hidden="true" />
                      <span className="quote-selection-copy">
                        <strong>{item.label}</strong>
                        <small>{available ? item.value : 'Non détecté · restera vide'}</small>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="quote-selection-section">
              <div className="quote-selection-section-title">
                <span className="section-kicker">Articles</span>
                <small>Chaque ligne peut être importée ou ignorée.</small>
              </div>
              <div className="quote-selection-list">
                {quote.lines.length > 0 ? quote.lines.map((line, index) => {
                  const available = isImportableQuoteLine(line)
                  return (
                    <label className={`quote-selection-row quote-selection-line ${available ? '' : 'unavailable'}`} key={index}>
                      <input
                        type="checkbox"
                        checked={available && Boolean(selection.lines[index])}
                        disabled={!available}
                        onChange={() => toggleLine(index)}
                      />
                      <span className="quote-selection-check" aria-hidden="true" />
                      <span className="quote-selection-copy">
                        <strong>{line.designation || `Article ${index + 1}`}</strong>
                        <small>{available
                          ? `${line.quantity} × ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(line.unitPriceHT ?? 0)} MAD · TVA ${line.vatRate}%`
                          : 'Ligne incomplète · non importée automatiquement'}</small>
                      </span>
                    </label>
                  )
                }) : <p className="quote-selection-empty">Aucune ligne exploitable détectée. Vous pourrez ajouter les articles dans le brouillon.</p>}
              </div>
            </div>

            {errors.length > 0 && (
              <p className="quote-selection-note">
                {errors.length} champ{errors.length > 1 ? 's' : ''} ou valeur{errors.length > 1 ? 's' : ''} reste{errors.length > 1 ? 'nt' : ''} à compléter. Cela ne bloque pas l’import du brouillon ; la finalisation gardera ses contrôles habituels.
              </p>
            )}
            {(warnings.length > 0 || quoteWarnings.length > 0) && <p className="quote-warning-note">{[...warnings, ...quoteWarnings.map(item => item.message)].join(' · ')}</p>}

            <div className="quote-ready-actions">
              <button onClick={reset}>Recommencer</button>
              <button className="quote-primary" onClick={create} disabled={selectedQuoteImportCount(selection) === 0}>Importer la sélection</button>
            </div>
          </>
        )}

      </section>
    </div>
  )
}
