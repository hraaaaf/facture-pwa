import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { amountToFrenchDirhams, createBlankDocument, documentLabel, documentTotals, lineTotalHT } from './lib'
import { generatePdf } from './pdf'
import { getCompany, getDocuments, removeDocument, saveCompany, saveDocument } from './storage'
import type { CommercialDocument, CompanySettings, DocumentLine, DocumentType } from './types'
import { defaultCompany } from './types'

type View = 'home' | 'editor' | 'history' | 'settings'
type IconName =
  | 'home'
  | 'history'
  | 'plus'
  | 'settings'
  | 'search'
  | 'file'
  | 'invoice'
  | 'truck'
  | 'order'
  | 'chevron'
  | 'back'
  | 'save'
  | 'eye'
  | 'trash'
  | 'more'
  | 'check'

const money = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2
  }).format(value)

const shortMoney = (value: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' MAD'

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR').format(new Date(`${iso}T12:00:00`))

const documentIcon: Record<DocumentType, IconName> = {
  DEVIS: 'file',
  FACTURE: 'invoice',
  BL: 'truck',
  BC: 'order'
}

const typeClass: Record<DocumentType, string> = {
  DEVIS: 'type-devis',
  FACTURE: 'type-facture',
  BL: 'type-bl',
  BC: 'type-bc'
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [documents, setDocuments] = useState<CommercialDocument[]>([])
  const [company, setCompany] = useState<CompanySettings>(defaultCompany)
  const [draft, setDraft] = useState<CommercialDocument | null>(null)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [newOpen, setNewOpen] = useState(false)

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
    setNewOpen(false)
    setView('editor')
  }

  const editDocument = (document: CommercialDocument) => {
    setDraft(structuredClone(document))
    setView('editor')
  }

  const duplicateDocument = (document: CommercialDocument) => {
    const count = documents.filter(item => item.type === document.type).length
    const blank = createBlankDocument(document.type, count, company.defaultVatRate)
    setDraft({
      ...blank,
      client: document.client,
      object: document.object,
      lines: document.lines.map(line => ({ ...line, id: crypto.randomUUID() })),
      blShowPrices: document.blShowPrices
    })
    setView('editor')
    showNotice('Copie créée en brouillon')
  }

  const convertDocument = (document: CommercialDocument, targetType: DocumentType) => {
    const count = documents.filter(item => item.type === targetType).length
    const blank = createBlankDocument(targetType, count, company.defaultVatRate)
    setDraft({
      ...blank,
      client: document.client,
      object: document.object,
      lines: document.lines.map(line => ({ ...line, id: crypto.randomUUID() })),
      blShowPrices: targetType === 'BL' ? document.blShowPrices : false
    })
    setView('editor')
    showNotice(`${documentLabel(targetType)} créé sans ressaisie`)
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
    convertDocument(draft, targetType)
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
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      {notice && <div className="toast">{notice}</div>}

      {view === 'home' && (
        <Home
          documents={documents}
          onEdit={editDocument}
          onHistory={() => setView('history')}
          onSettings={() => setView('settings')}
          onNew={() => setNewOpen(true)}
        />
      )}

      {view === 'history' && (
        <History
          documents={filteredDocuments}
          search={search}
          onSearch={setSearch}
          onHome={() => setView('home')}
          onNew={() => setNewOpen(true)}
          onEdit={editDocument}
          onDuplicate={duplicateDocument}
          onConvert={convertDocument}
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

      {newOpen && <NewDocumentSheet onClose={() => setNewOpen(false)} onNew={startDocument} />}
    </div>
  )
}

function Home({
  documents,
  onEdit,
  onHistory,
  onSettings,
  onNew
}: {
  documents: CommercialDocument[]
  onEdit: (document: CommercialDocument) => void
  onHistory: () => void
  onSettings: () => void
  onNew: () => void
}) {
  const stats = (['DEVIS', 'FACTURE', 'BL', 'BC'] as DocumentType[]).map(type => {
    const list = documents.filter(document => document.type === type)
    const amount = list.reduce((sum, document) => {
      if (document.type === 'BL' && !document.blShowPrices) return sum
      return sum + documentTotals(document).totalTTC
    }, 0)
    return { type, count: list.length, amount }
  })

  return (
    <main className="screen home-screen with-bottom-nav">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">FACTURE PWA</p>
          <h1>Tableau de bord</h1>
          <p className="muted">Simple. Rapide. Professionnel.</p>
        </div>
        <button className="profile-button" onClick={onSettings} aria-label="Réglages">
          <Icon name="settings" />
        </button>
      </header>

      <button className="search-surface" onClick={onHistory}>
        <Icon name="search" />
        <span>Rechercher un document…</span>
      </button>

      <section className="section-block compact-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Aperçu</span>
            <h2>Vos documents</h2>
          </div>
          <span className="period-chip">Cette année</span>
        </div>

        <div className="stats-grid">
          {stats.map(stat => (
            <button className={`stat-card ${typeClass[stat.type]}`} key={stat.type} onClick={onHistory}>
              <span className="stat-icon"><Icon name={documentIcon[stat.type]} /></span>
              <span className="stat-count">{stat.count}</span>
              <span className="stat-label">{documentLabel(stat.type)}</span>
              <span className="stat-amount">{shortMoney(stat.amount)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section-block recent-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Activité</span>
            <h2>Documents récents</h2>
          </div>
          <button className="text-button" onClick={onHistory}>Voir tout</button>
        </div>

        {documents.length === 0 ? (
          <button className="empty-state premium-empty" onClick={onNew}>
            <span className="empty-icon"><Icon name="plus" /></span>
            <strong>Créer le premier document</strong>
            <span>Devis, facture, BL ou bon de commande.</span>
          </button>
        ) : (
          <div className="document-list glass-list">
            {documents.slice(0, 5).map(document => {
              const showAmount = document.type !== 'BL' || document.blShowPrices
              return (
                <button className="document-row" key={document.id} onClick={() => onEdit(document)}>
                  <span className={`document-badge small ${typeClass[document.type]}`}><Icon name={documentIcon[document.type]} /></span>
                  <span className="row-main">
                    <strong>{document.client || documentLabel(document.type)}</strong>
                    <small>{documentLabel(document.type)} · #{document.number}</small>
                  </span>
                  <span className="row-meta">
                    {showAmount && <strong>{shortMoney(documentTotals(document).totalTTC)}</strong>}
                    <small>{shortDate(document.date)}</small>
                  </span>
                  <Icon name="chevron" />
                </button>
              )
            })}
          </div>
        )}
      </section>

      <div className="local-pill"><span className="status-dot" /> Données locales · hors ligne</div>
      <BottomNav active="home" onHome={() => undefined} onNew={onNew} onHistory={onHistory} />
    </main>
  )
}

function NewDocumentSheet({ onClose, onNew }: { onClose: () => void; onNew: (type: DocumentType) => void }) {
  const options: Array<{ type: DocumentType; subtitle: string }> = [
    { type: 'DEVIS', subtitle: 'Créer un nouveau devis' },
    { type: 'FACTURE', subtitle: 'Créer une nouvelle facture' },
    { type: 'BL', subtitle: 'Créer un bon de livraison' },
    { type: 'BC', subtitle: 'Créer un bon de commande' }
  ]

  return (
    <div className="sheet-layer" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="new-sheet" role="dialog" aria-modal="true" aria-label="Nouveau document">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <button className="sheet-close" onClick={onClose} aria-label="Fermer">×</button>
          <div>
            <h2>Nouveau document</h2>
            <p>Choisissez le type de document</p>
          </div>
          <span className="sheet-header-spacer" />
        </div>
        <div className="new-options">
          {options.map(option => (
            <button className="new-option" key={option.type} onClick={() => onNew(option.type)}>
              <span className={`new-option-icon ${typeClass[option.type]}`}><Icon name={documentIcon[option.type]} /></span>
              <span className="new-option-copy">
                <strong>{documentLabel(option.type)}</strong>
                <small>{option.subtitle}</small>
              </span>
              <span className="option-arrow"><Icon name="chevron" /></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function BottomNav({
  active,
  onHome,
  onNew,
  onHistory
}: {
  active: 'home' | 'history'
  onHome: () => void
  onNew: () => void
  onHistory: () => void
}) {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      <button className={`nav-item ${active === 'home' ? 'active' : ''}`} onClick={onHome}>
        <Icon name="home" />
        <span>Accueil</span>
      </button>
      <button className="fab" onClick={onNew} aria-label="Nouveau document"><Icon name="plus" /></button>
      <button className={`nav-item ${active === 'history' ? 'active' : ''}`} onClick={onHistory}>
        <Icon name="history" />
        <span>Historique</span>
      </button>
    </nav>
  )
}

function History({
  documents,
  search,
  onSearch,
  onHome,
  onNew,
  onEdit,
  onDuplicate,
  onConvert,
  onDelete
}: {
  documents: CommercialDocument[]
  search: string
  onSearch: (value: string) => void
  onHome: () => void
  onNew: () => void
  onEdit: (document: CommercialDocument) => void
  onDuplicate: (document: CommercialDocument) => void
  onConvert: (document: CommercialDocument, targetType: DocumentType) => void
  onDelete: (id: string) => void
}) {
  const [filter, setFilter] = useState<'ALL' | DocumentType>('ALL')
  const visibleDocuments = filter === 'ALL' ? documents : documents.filter(document => document.type === filter)
  const filters: Array<{ value: 'ALL' | DocumentType; label: string }> = [
    { value: 'ALL', label: 'Tous' },
    { value: 'FACTURE', label: 'Factures' },
    { value: 'DEVIS', label: 'Devis' },
    { value: 'BL', label: 'BL' },
    { value: 'BC', label: 'BC' }
  ]

  return (
    <main className="screen with-bottom-nav history-screen">
      <header className="history-header premium-history-header">
        <div>
          <p className="eyebrow">ARCHIVES LOCALES</p>
          <h1>Historique</h1>
          <p className="muted">{visibleDocuments.length} document{visibleDocuments.length > 1 ? 's' : ''}</p>
        </div>
      </header>

      <label className="search-surface interactive-search history-search">
        <Icon name="search" />
        <input value={search} onChange={event => onSearch(event.target.value)} placeholder="Client, numéro, objet…" />
      </label>

      <div className="history-filters" role="group" aria-label="Filtrer les documents">
        {filters.map(item => (
          <button
            key={item.value}
            className={filter === item.value ? 'active' : ''}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="premium-history-list">
        {visibleDocuments.map(document => {
          const totals = documentTotals(document)
          const showAmount = document.type !== 'BL' || document.blShowPrices
          return (
            <article className="premium-history-card" key={document.id}>
              <button className="premium-history-main" onClick={() => onEdit(document)}>
                <span className={`document-badge small ${typeClass[document.type]}`}><Icon name={documentIcon[document.type]} /></span>
                <span className="history-copy">
                  <span className="history-card-topline">
                    <strong>{document.client || documentLabel(document.type)}</strong>
                    <span className="saved-chip"><span className="status-dot" /> Enregistré</span>
                  </span>
                  <span className="history-number">{documentLabel(document.type)} · #{document.number}</span>
                  <span className="history-object">{document.object || 'Sans objet'}</span>
                  <span className="history-meta-line">
                    <span>{shortDate(document.date)}</span>
                    {showAmount && <strong>{money(totals.totalTTC)}</strong>}
                  </span>
                </span>
                <Icon name="chevron" />
              </button>

              <div className="history-card-actions">
                <button onClick={() => onEdit(document)}>Ouvrir</button>
                <button onClick={() => onDuplicate(document)}>Dupliquer</button>
                {document.type === 'DEVIS' && <button onClick={() => onConvert(document, 'FACTURE')}>→ Facture</button>}
                {document.type === 'DEVIS' && <button onClick={() => onConvert(document, 'BL')}>→ BL</button>}
                <button className="danger" onClick={() => onDelete(document.id)}>Supprimer</button>
              </div>
            </article>
          )
        })}

        {visibleDocuments.length === 0 && (
          <div className="empty-state history-empty">
            <span className="empty-icon"><Icon name="search" /></span>
            <strong>Aucun document</strong>
            <span>Modifiez la recherche ou le filtre.</span>
          </div>
        )}
      </div>

      <BottomNav active="history" onHome={onHome} onNew={onNew} onHistory={() => undefined} />
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
      <header className="editor-header">
        <button className="back-button" onClick={onBack} aria-label="Retour"><Icon name="back" /></button>
        <div className="editor-title">
          <span className={`editor-type-icon ${typeClass[value.type]}`}><Icon name={documentIcon[value.type]} /></span>
          <div>
            <h1>{documentLabel(value.type)}</h1>
            <span className="draft-status"><span className="status-dot" /> Brouillon</span>
          </div>
        </div>
        <button className="editor-more" aria-label="Plus d’options"><Icon name="more" /></button>
      </header>

      <section className="editor-meta glass-panel">
        <label>
          <span>N° document</span>
          <input value={value.number} onChange={event => patch({ number: event.target.value })} />
        </label>
        <label>
          <span>Date</span>
          <input type="date" value={value.date} onChange={event => patch({ date: event.target.value })} />
        </label>
      </section>

      <section className="editor-section">
        <div className="editor-section-title">
          <div><span className="section-kicker">Destinataire</span><h2>Client</h2></div>
        </div>
        <div className="glass-panel client-panel">
          <label className="client-field">
            <Icon name="search" />
            <input value={value.client} onChange={event => patch({ client: event.target.value })} placeholder="Nom du client ou organisme" />
          </label>
          <p>Les clients mémorisés et l’auto-complétion arrivent dans le lot Clients.</p>
        </div>
      </section>

      <section className="editor-section">
        <div className="editor-section-title"><div><span className="section-kicker">Description</span><h2>Objet</h2></div></div>
        <div className="glass-panel object-panel">
          <textarea value={value.object} onChange={event => patch({ object: event.target.value })} placeholder="Objet du document" rows={3} />
        </div>
      </section>

      {value.type === 'BL' && (
        <section className="glass-panel bl-price-panel">
          <span>
            <strong>Afficher les prix</strong>
            <small>Sinon le BL affiche seulement désignation, unité et quantité.</small>
          </span>
          <label className="switch-control">
            <input type="checkbox" checked={value.blShowPrices} onChange={event => patch({ blShowPrices: event.target.checked })} />
            <span />
          </label>
        </section>
      )}

      <section className="editor-section articles-section">
        <div className="editor-section-title">
          <div><span className="section-kicker">Contenu</span><h2>Articles</h2></div>
          <button className="add-article-button" onClick={addLine}><Icon name="plus" /> Ajouter</button>
        </div>

        <div className="line-list premium-lines">
          {value.lines.map((line, index) => (
            <article className="article-card" key={line.id}>
              <div className="article-head">
                <div>
                  <span className="article-index">{String(index + 1).padStart(2, '0')}</span>
                  <strong>Article</strong>
                </div>
                {value.lines.length > 1 && (
                  <button className="trash-button" onClick={() => removeLine(line.id)} aria-label={`Supprimer l’article ${index + 1}`}>
                    <Icon name="trash" />
                  </button>
                )}
              </div>

              <label className="article-designation">
                <span>Désignation</span>
                <textarea rows={2} value={line.designation} onChange={event => updateLine(line.id, { designation: event.target.value })} placeholder="Prestation ou article" />
              </label>

              <div className={`article-fields ${pricingVisible ? '' : 'no-price'}`}>
                <label>
                  <span>Unité</span>
                  <input value={line.unit} onChange={event => updateLine(line.id, { unit: event.target.value })} />
                </label>
                <NumberField compact label="Qté" value={line.quantity} onChange={quantity => updateLine(line.id, { quantity })} />
                {pricingVisible && <NumberField compact label="PU HT" value={line.unitPriceHT} step="0.01" onChange={unitPriceHT => updateLine(line.id, { unitPriceHT })} />}
                {pricingVisible && <NumberField compact label="TVA %" value={line.vatRate} step="0.01" onChange={vatRate => updateLine(line.id, { vatRate })} />}
              </div>

              {pricingVisible && (
                <div className="article-total">
                  <span>Total HT</span>
                  <strong>{money(lineTotalHT(line))}</strong>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {pricingVisible && (
        <section className="premium-totals">
          <div><span>Sous-total HT</span><strong>{money(totals.totalHT)}</strong></div>
          <div><span>TVA</span><strong>{money(totals.totalVAT)}</strong></div>
          <div className="premium-grand-total"><span>Total TTC</span><strong>{money(totals.totalTTC)}</strong></div>
        </section>
      )}

      {pricingVisible && (
        <section className="amount-words-card">
          <span className="section-kicker">Montant en lettres</span>
          <p>{amountToFrenchDirhams(totals.totalTTC)}</p>
        </section>
      )}

      {value.type === 'DEVIS' && (
        <section className="conversion-card premium-conversion">
          <span>Créer depuis ce devis</span>
          <div>
            <button className="secondary-button" onClick={() => onConvert('FACTURE')}>→ Facture</button>
            <button className="secondary-button" onClick={() => onConvert('BL')}>→ BL</button>
          </div>
        </section>
      )}

      <nav className="editor-bottom-bar" aria-label="Actions document">
        <button className="editor-action" onClick={() => onPdf(value)}><Icon name="eye" /><span>Aperçu PDF</span></button>
        <button className="editor-save" onClick={() => void onSave(value)}><Icon name="save" /><span>Enregistrer</span></button>
        <button className="editor-action" onClick={addLine}><Icon name="plus" /><span>Article</span></button>
      </nav>
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
  onChange,
  compact = false
}: {
  label: string
  value: number
  step?: string
  onChange: (value: number) => void
  compact?: boolean
}) {
  return (
    <label className={compact ? 'compact-number-field' : 'field'}>
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
      <button className="back-button" onClick={onBack} aria-label="Retour"><Icon name="back" /></button>
      <h1>{title}</h1>
      <span className="header-spacer" />
    </header>
  )
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.5 20v-6h5v6"/></>,
    history: <><path d="M4.7 5.5A9 9 0 1 1 3 12"/><path d="M3 5v5h5"/><path d="M12 7.5V12l3 2"/></>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    search: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></>,
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h6M9 16h6"/></>,
    invoice: <><path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
    truck: <><path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    order: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5"/></>,
    chevron: <path d="m9 5 7 7-7 7"/>,
    back: <path d="m15 5-7 7 7 7"/>,
    save: <><path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>,
    check: <path d="m5 12 4 4L19 6"/>
  }
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}
