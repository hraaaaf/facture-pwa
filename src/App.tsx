import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { createBlankDocument, documentLabel, documentTotals, lineTotalHT } from './lib'
import { generatePdf } from './pdf'
import { getCompany, getDocuments, removeDocument, saveCompany, saveDocument } from './storage'
import type { CommercialDocument, CompanySettings, DocumentLine, DocumentType } from './types'
import { defaultCompany } from './types'

type View = 'home' | 'editor' | 'history' | 'settings'

const money = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2
  }).format(value)

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR').format(new Date(`${iso}T12:00:00`))

const documentIcon: Record<DocumentType, string> = {
  DEVIS: 'D',
  FACTURE: 'F',
  BL: 'BL',
  BC: 'BC'
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [documents, setDocuments] = useState<CommercialDocument[]>([])
  const [company, setCompany] = useState<CompanySettings>(defaultCompany)
  const [draft, setDraft] = useState<CommercialDocument | null>(null)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = async () => {
    const [savedDocuments, savedCompany] = await Promise.all([getDocuments(), getCompany()])
    setDocuments(savedDocuments)
    setCompany(savedCompany)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 1800)
  }

  const startDocument = (type: DocumentType) => {
    const count = documents.filter(document => document.type === type).length
    setDraft(createBlankDocument(type, count, company.defaultVatRate))
    setView('editor')
  }

  const editDocument = (document: CommercialDocument) => {
    setDraft(structuredClone(document))
    setView('editor')
  }

  const persistDraft = async (document: CommercialDocument) => {
    const saved = { ...document, updatedAt: new Date().toISOString() }
    await saveDocument(saved)
    setDraft(saved)
    await refresh()
    showNotice('Document enregistré')
  }

  const deleteDocument = async (id: string) => {
    if (!window.confirm('Supprimer ce document ?')) return
    await removeDocument(id)
    await refresh()
  }

  const convertDraft = (targetType: DocumentType) => {
    if (!draft) return
    const count = documents.filter(document => document.type === targetType).length
    const blank = createBlankDocument(targetType, count, company.defaultVatRate)
    setDraft({
      ...blank,
      client: draft.client,
      object: draft.object,
      lines: draft.lines.map(line => ({ ...line, id: crypto.randomUUID() })),
      blShowPrices: targetType === 'BL' ? draft.blShowPrices : false
    })
    showNotice(`${documentLabel(targetType)} créé sans ressaisie`)
  }

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr')
    if (!query) return documents
    return documents.filter(document =>
      [document.number, document.client, document.object, documentLabel(document.type)]
        .join(' ')
        .toLocaleLowerCase('fr')
        .includes(query)
    )
  }, [documents, search])

  return (
    <div className="app-shell">
      {notice && <div className="toast">{notice}</div>}

      {view === 'home' && (
        <Home
          documents={documents}
          onNew={startDocument}
          onEdit={editDocument}
          onHistory={() => setView('history')}
          onSettings={() => setView('settings')}
        />
      )}

      {view === 'history' && (
        <History
          documents={filteredDocuments}
          search={search}
          onSearch={setSearch}
          onBack={() => setView('home')}
          onEdit={editDocument}
          onDelete={deleteDocument}
        />
      )}

      {view === 'settings' && (
        <Settings
          value={company}
          onBack={() => setView('home')}
          onSave={async next => {
            await saveCompany(next)
            setCompany(next)
            setView('home')
            showNotice('Réglages enregistrés')
          }}
        />
      )}

      {view === 'editor' && draft && (
        <Editor
          value={draft}
          company={company}
          onChange={setDraft}
          onBack={() => setView('home')}
          onSave={persistDraft}
          onPdf={document => generatePdf(document, company)}
          onConvert={convertDraft}
        />
      )}
    </div>
  )
}

function Home({
  documents,
  onNew,
  onEdit,
  onHistory,
  onSettings
}: {
  documents: CommercialDocument[]
  onNew: (type: DocumentType) => void
  onEdit: (document: CommercialDocument) => void
  onHistory: () => void
  onSettings: () => void
}) {
  return (
    <main className="screen home-screen">
      <header className="brand-header">
        <div>
          <p className="eyebrow">FACTURE PWA</p>
          <h1>Créer un document</h1>
          <p className="muted">Rapide, local et sans compte.</p>
        </div>
        <button className="icon-button" onClick={onSettings} aria-label="Réglages">
          ⚙
        </button>
      </header>

      <section className="document-grid" aria-label="Nouveau document">
        {(['DEVIS', 'FACTURE', 'BL', 'BC'] as DocumentType[]).map(type => (
          <button className="document-action" key={type} onClick={() => onNew(type)}>
            <span className="document-badge">{documentIcon[type]}</span>
            <span>
              <strong>{documentLabel(type)}</strong>
              <small>Nouveau</small>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        ))}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Récents</h2>
          <button className="text-button" onClick={onHistory}>Tout voir</button>
        </div>
        {documents.length === 0 ? (
          <div className="empty-state">
            <strong>Aucun document</strong>
            <span>Le premier prendra moins d’une minute.</span>
          </div>
        ) : (
          <div className="document-list">
            {documents.slice(0, 4).map(document => (
              <button className="document-row" key={document.id} onClick={() => onEdit(document)}>
                <span className="document-badge small">{documentIcon[document.type]}</span>
                <span className="row-main">
                  <strong>{document.client || documentLabel(document.type)}</strong>
                  <small>#{document.number} · {shortDate(document.date)}</small>
                </span>
                <span aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="offline-note">✓ Les données restent sur cet appareil</div>
    </main>
  )
}

function History({
  documents,
  search,
  onSearch,
  onBack,
  onEdit,
  onDelete
}: {
  documents: CommercialDocument[]
  search: string
  onSearch: (value: string) => void
  onBack: () => void
  onEdit: (document: CommercialDocument) => void
  onDelete: (id: string) => void
}) {
  return (
    <main className="screen">
      <ScreenHeader title="Documents" onBack={onBack} />
      <label className="field">
        <span>Rechercher</span>
        <input value={search} onChange={event => onSearch(event.target.value)} placeholder="Client, numéro, objet…" />
      </label>
      <div className="document-list standalone-list">
        {documents.map(document => {
          const totals = documentTotals(document)
          const showAmount = document.type !== 'BL' || document.blShowPrices
          return (
            <div className="history-card" key={document.id}>
              <button className="history-main" onClick={() => onEdit(document)}>
                <span className="document-badge small">{documentIcon[document.type]}</span>
                <span className="row-main">
                  <strong>{document.client || documentLabel(document.type)}</strong>
                  <small>{documentLabel(document.type)} #{document.number}</small>
                  <small>{shortDate(document.date)}{showAmount ? ` · ${money(totals.totalTTC)}` : ''}</small>
                </span>
              </button>
              <button className="danger-link" onClick={() => onDelete(document.id)} aria-label="Supprimer">Supprimer</button>
            </div>
          )
        })}
        {documents.length === 0 && <div className="empty-state"><strong>Aucun résultat</strong></div>}
      </div>
    </main>
  )
}

function Editor({
  value,
  company,
  onChange,
  onBack,
  onSave,
  onPdf,
  onConvert
}: {
  value: CommercialDocument
  company: CompanySettings
  onChange: (document: CommercialDocument) => void
  onBack: () => void
  onSave: (document: CommercialDocument) => Promise<void>
  onPdf: (document: CommercialDocument) => void
  onConvert: (type: DocumentType) => void
}) {
  const totals = documentTotals(value)
  const pricingVisible = value.type !== 'BL' || value.blShowPrices

  const patch = (next: Partial<CommercialDocument>) => onChange({ ...value, ...next })
  const updateLine = (id: string, next: Partial<DocumentLine>) =>
    patch({ lines: value.lines.map(line => line.id === id ? { ...line, ...next } : line) })

  const addLine = () => patch({
    lines: [
      ...value.lines,
      {
        id: crypto.randomUUID(),
        designation: '',
        unit: 'Pièce',
        quantity: 1,
        unitPriceHT: 0,
        vatRate: company.defaultVatRate
      }
    ]
  })

  const removeLine = (id: string) => {
    if (value.lines.length === 1) return
    patch({ lines: value.lines.filter(line => line.id !== id) })
  }

  return (
    <main className="screen editor-screen">
      <ScreenHeader title={documentLabel(value.type)} onBack={onBack} />

      <section className="form-card">
        <div className="two-columns">
          <label className="field">
            <span>N°</span>
            <input value={value.number} onChange={event => patch({ number: event.target.value })} />
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" value={value.date} onChange={event => patch({ date: event.target.value })} />
          </label>
        </div>
        <label className="field">
          <span>Client</span>
          <input value={value.client} onChange={event => patch({ client: event.target.value })} placeholder="Nom ou organisme" />
        </label>
        <label className="field">
          <span>Objet</span>
          <textarea value={value.object} onChange={event => patch({ object: event.target.value })} placeholder="Objet du document" rows={3} />
        </label>
        {value.type === 'BL' && (
          <label className="toggle-row">
            <span>
              <strong>Afficher les prix</strong>
              <small>Sinon le BL contient seulement désignation, unité et quantité.</small>
            </span>
            <input type="checkbox" checked={value.blShowPrices} onChange={event => patch({ blShowPrices: event.target.checked })} />
          </label>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Lignes</h2>
          <button className="text-button" onClick={addLine}>+ Ajouter</button>
        </div>
        <div className="line-list">
          {value.lines.map((line, index) => (
            <article className="line-card" key={line.id}>
              <div className="line-title">
                <strong>Ligne {index + 1}</strong>
                {value.lines.length > 1 && (
                  <button className="danger-link" onClick={() => removeLine(line.id)}>Supprimer</button>
                )}
              </div>
              <label className="field">
                <span>Désignation</span>
                <textarea rows={2} value={line.designation} onChange={event => updateLine(line.id, { designation: event.target.value })} />
              </label>
              <div className="two-columns">
                <label className="field">
                  <span>Unité</span>
                  <input value={line.unit} onChange={event => updateLine(line.id, { unit: event.target.value })} />
                </label>
                <NumberField label="Quantité" value={line.quantity} onChange={quantity => updateLine(line.id, { quantity })} />
              </div>
              {pricingVisible && (
                <div className="two-columns">
                  <NumberField label="PU HT (MAD)" value={line.unitPriceHT} step="0.01" onChange={unitPriceHT => updateLine(line.id, { unitPriceHT })} />
                  <NumberField label="TVA %" value={line.vatRate} step="0.01" onChange={vatRate => updateLine(line.id, { vatRate })} />
                </div>
              )}
              {pricingVisible && <div className="line-total">Total HT <strong>{money(lineTotalHT(line))}</strong></div>}
            </article>
          ))}
        </div>
      </section>

      {pricingVisible && (
        <section className="totals-card">
          <div><span>Total HT</span><strong>{money(totals.totalHT)}</strong></div>
          <div><span>TVA</span><strong>{money(totals.totalVAT)}</strong></div>
          <div className="grand-total"><span>Total TTC</span><strong>{money(totals.totalTTC)}</strong></div>
        </section>
      )}

      {value.type === 'DEVIS' && (
        <section className="conversion-card">
          <span>Créer depuis ce devis</span>
          <div>
            <button className="secondary-button" onClick={() => onConvert('FACTURE')}>→ Facture</button>
            <button className="secondary-button" onClick={() => onConvert('BL')}>→ BL</button>
          </div>
        </section>
      )}

      <div className="editor-actions">
        <button className="primary-button" onClick={() => void onSave(value)}>Enregistrer</button>
        <button className="secondary-button" onClick={() => onPdf(value)}>Générer le PDF</button>
      </div>
    </main>
  )
}

function Settings({
  value,
  onBack,
  onSave
}: {
  value: CompanySettings
  onBack: () => void
  onSave: (company: CompanySettings) => Promise<void>
}) {
  const [draft, setDraft] = useState(value)
  const patch = (next: Partial<CompanySettings>) => setDraft(current => ({ ...current, ...next }))

  const imageChanged = (key: 'logoDataUrl' | 'managerSignatureDataUrl') => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => patch({ [key]: String(reader.result ?? '') })
    reader.readAsDataURL(file)
  }

  return (
    <main className="screen">
      <ScreenHeader title="Réglages" onBack={onBack} />
      <section className="form-card settings-card">
        <label className="field"><span>Nom / raison sociale</span><input value={draft.name} onChange={event => patch({ name: event.target.value })} /></label>
        <label className="field"><span>Marque</span><input value={draft.brand} onChange={event => patch({ brand: event.target.value })} /></label>
        <label className="field"><span>Adresse</span><textarea rows={3} value={draft.address} onChange={event => patch({ address: event.target.value })} /></label>
        <label className="field"><span>Mentions légales</span><textarea rows={4} value={draft.legalLine} onChange={event => patch({ legalLine: event.target.value })} /></label>
        <div className="two-columns">
          <label className="field"><span>Ville</span><input value={draft.cityLabel} onChange={event => patch({ cityLabel: event.target.value })} /></label>
          <NumberField label="TVA par défaut %" value={draft.defaultVatRate} step="0.01" onChange={defaultVatRate => patch({ defaultVatRate })} />
        </div>
        <label className="field file-field"><span>Logo</span><input type="file" accept="image/png,image/jpeg" onChange={imageChanged('logoDataUrl')} /></label>
        <label className="field file-field"><span>Signature gérant</span><input type="file" accept="image/png,image/jpeg" onChange={imageChanged('managerSignatureDataUrl')} /></label>
        <button className="primary-button" onClick={() => void onSave(draft)}>Enregistrer les réglages</button>
      </section>
    </main>
  )
}

function NumberField({
  label,
  value,
  step = '1',
  onChange
}: {
  label: string
  value: number
  step?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={event => onChange(Math.max(0, Number(event.target.value) || 0))}
      />
    </label>
  )
}

function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="screen-header">
      <button className="back-button" onClick={onBack} aria-label="Retour">‹</button>
      <h1>{title}</h1>
      <span className="header-spacer" />
    </header>
  )
}
