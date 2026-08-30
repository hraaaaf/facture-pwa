import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  amountToFrenchDirhams,
  createBlankDocument,
  documentLabel,
  documentStatusLabel,
  documentTotals,
  lineTotalHT
} from './lib'
import { dashboardStatsForYear } from './dashboardStats'
import { activeAdvancedFilterCount, defaultDocumentSearchFilters, filterDocuments } from './documentSearch'
import { invoicePaymentStateLabel, invoicePaymentSummary, paymentMethodLabel, paymentMethodOptions } from './paymentLifecycle'
import { generatePdf } from './pdf'
import { QuoteImportSheet, type ImportedQuoteFields } from './QuoteImportSheet'
import { EntityManager } from './EntityManager'
import { deleteManagedCatalogItem, deleteManagedClient, saveManagedCatalogItem, saveManagedClient } from './entityManagement'
import {
  finalizeDocument,
  getCatalogItems,
  getClients,
  getCompany,
  getDocuments,
  rememberDocument,
  recordInvoicePayment,
  removeDocument,
  saveClientProfile,
  saveDocument,
  setDocumentStatus
} from './storage'
import type {
  CatalogItem,
  ClientProfile,
  CommercialDocument,
  CompanySettings,
  DocumentLine,
  DocumentType,
  PaymentMethod
} from './types'
import { clientDisplayName, defaultCompany } from './types'
import './memory.css'
import './payment-lifecycle.css'
import './search-filters.css'

type View = 'home' | 'editor' | 'history' | 'memory'
type IconName = 'home' | 'history' | 'plus' | 'settings' | 'search' | 'file' | 'invoice' | 'truck' | 'order' | 'chevron' | 'back' | 'save' | 'eye' | 'trash' | 'more' | 'check'

const money = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 }).format(value)
const shortMoney = (value: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' MAD'
const shortDate = (iso: string) => new Intl.DateTimeFormat('fr-FR').format(new Date(`${iso}T12:00:00`))
const canonical = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr')

const documentIcon: Record<DocumentType, IconName> = { DEVIS: 'file', FACTURE: 'invoice', BL: 'truck', BC: 'order' }
const typeClass: Record<DocumentType, string> = { DEVIS: 'type-devis', FACTURE: 'type-facture', BL: 'type-bl', BC: 'type-bc' }

const newClientProfile = (name = ''): ClientProfile => {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name,
    company: '',
    address: '',
    ice: '',
    ifNumber: '',
    phone: '',
    email: '',
    usageCount: 0,
    createdAt: now,
    updatedAt: now
  }
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [documents, setDocuments] = useState<CommercialDocument[]>([])
  const [company, setCompany] = useState<CompanySettings>(defaultCompany)
  const [clients, setClients] = useState<ClientProfile[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [draft, setDraft] = useState<CommercialDocument | null>(null)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<CommercialDocument | null>(null)
  const autosaveTimer = useRef<number | null>(null)
  const autosaveGeneration = useRef(0)

  const refresh = async () => {
    const [savedDocuments, savedCompany, savedClients, savedCatalog] = await Promise.all([
      getDocuments(), getCompany(), getClients(), getCatalogItems()
    ])
    setDocuments(savedDocuments)
    setCompany(savedCompany)
    setClients(savedClients)
    setCatalog(savedCatalog)
  }

  useEffect(() => { void refresh() }, [])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2400)
  }

  const cancelAutosave = () => {
    autosaveGeneration.current += 1
    if (autosaveTimer.current !== null) {
      window.clearTimeout(autosaveTimer.current)
      autosaveTimer.current = null
    }
  }

  const updateDraft = (next: CommercialDocument) => {
    setDraft(next)
    if (next.status !== 'DRAFT') return
    cancelAutosave()
    const generation = autosaveGeneration.current
    autosaveTimer.current = window.setTimeout(() => {
      const saved = { ...next, updatedAt: new Date().toISOString() }
      void saveDocument(saved)
        .then(() => {
          if (generation !== autosaveGeneration.current) return
          setDocuments(current => {
            const without = current.filter(document => document.id !== saved.id)
            return [saved, ...without].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          })
          setDraft(current =>
            current?.id === saved.id && current.status === 'DRAFT'
              ? { ...current, updatedAt: saved.updatedAt }
              : current
          )
        })
        .catch(error => {
          if (generation !== autosaveGeneration.current) return
          if (error instanceof Error && error.message.includes('finalisé')) void refresh()
        })
    }, 800)
  }

  const startDocument = (type: DocumentType) => {
    setDraft(createBlankDocument(type, company.defaultVatRate))
    setNewOpen(false)
    setView('editor')
  }

  const startImportedQuote = (fields: ImportedQuoteFields) => {
    const blank = createBlankDocument('DEVIS', company.defaultVatRate)
    setDraft({ ...blank, ...fields })
    setImportOpen(false)
    setNewOpen(false)
    setView('editor')
    showNotice('Devis importé en brouillon')
  }

  const editDocument = (document: CommercialDocument) => {
    setDraft(structuredClone(document))
    setView('editor')
  }

  const duplicateDocument = (document: CommercialDocument) => {
    const blank = createBlankDocument(document.type, company.defaultVatRate)
    setDraft({
      ...blank,
      client: document.client,
      clientId: document.clientId,
      clientAddress: document.clientAddress,
      clientIce: document.clientIce,
      clientIfNumber: document.clientIfNumber,
      object: document.object,
      lines: document.lines.map(line => ({ ...line, id: crypto.randomUUID() })),
      globalDiscountPercent: document.globalDiscountPercent,
      blShowPrices: document.blShowPrices
    })
    setView('editor')
    showNotice('Copie créée en brouillon')
  }

  const convertDocument = (document: CommercialDocument, targetType: DocumentType) => {
    const blank = createBlankDocument(targetType, company.defaultVatRate, document.id)
    setDraft({
      ...blank,
      client: document.client,
      clientId: document.clientId,
      clientAddress: document.clientAddress,
      clientIce: document.clientIce,
      clientIfNumber: document.clientIfNumber,
      object: document.object,
      lines: document.lines.map(line => ({ ...line, id: crypto.randomUUID() })),
      globalDiscountPercent: document.globalDiscountPercent,
      blShowPrices: targetType === 'BL' ? document.blShowPrices : false
    })
    setView('editor')
    showNotice(`${documentLabel(targetType)} créé sans ressaisie`)
  }

  const persistDraft = async (document: CommercialDocument) => {
    cancelAutosave()
    try {
      const saved = { ...document, updatedAt: new Date().toISOString() }
      await saveDocument(saved)
      setDraft(saved)
      await refresh()
      showNotice('Brouillon enregistré')
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Sauvegarde impossible')
    }
  }

  const finalizeDraft = async (document: CommercialDocument) => {
    try {
      if (!window.confirm('Finaliser ce document ? Son numéro deviendra définitif et ne sera jamais réutilisé.')) return
      cancelAutosave()
      const saved = await finalizeDocument(document, company)
      setDraft(saved)
      try {
        await rememberDocument(saved)
      } catch {
        // La mémoire rapide est un confort. Elle ne doit jamais remettre en cause une finalisation réussie.
      }
      await refresh()
      showNotice(`Finalisé · ${saved.number}`)
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Finalisation impossible')
    }
  }

  const persistClient = async (profile: ClientProfile) => {
    const saved = await saveClientProfile(profile)
    setClients(await getClients())
    showNotice('Client mémorisé')
    return saved
  }

  const persistManagedClient = async (profile: ClientProfile) => {
    await saveManagedClient(profile)
    await refresh()
    showNotice('Fiche client enregistrée')
  }

  const removeManagedClient = async (id: string) => {
    await deleteManagedClient(id)
    await refresh()
    showNotice('Fiche client supprimée')
  }

  const persistManagedItem = async (item: CatalogItem) => {
    await saveManagedCatalogItem(item)
    await refresh()
    showNotice('Article enregistré')
  }

  const removeManagedItem = async (id: string) => {
    await deleteManagedCatalogItem(id)
    await refresh()
    showNotice('Article supprimé du catalogue')
  }

  const recordPayment = async (input: { amount: number; date: string; method: PaymentMethod; note?: string }) => {
    if (!paymentTarget) throw new Error('Facture introuvable')
    const saved = await recordInvoicePayment(paymentTarget.id, input)
    setPaymentTarget(saved)
    if (draft?.id === saved.id) setDraft(saved)
    await refresh()
    showNotice(saved.status === 'PAID' ? 'Facture soldée' : 'Paiement enregistré')
    return saved
  }

  const changeStatus = async (id: string, status: 'PAID' | 'CANCELLED') => {
    try {
      if (status === 'CANCELLED' && !window.confirm('Annuler ce document ? Son numéro restera réservé définitivement.')) return
      const saved = await setDocumentStatus(id, status)
      if (draft?.id === id) setDraft(saved)
      await refresh()
      showNotice(status === 'PAID' ? 'Facture marquée payée' : 'Document annulé')
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Changement de statut impossible')
    }
  }

  const deleteDocument = async (id: string) => {
    try {
      if (!window.confirm('Supprimer ce brouillon ?')) return
      await removeDocument(id)
      await refresh()
      showNotice('Brouillon supprimé')
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Suppression impossible')
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      {notice && <div className="toast">{notice}</div>}

      {view === 'home' && (
        <Home documents={documents} onEdit={editDocument} onHistory={() => setView('history')} onSettings={() => undefined} onNew={() => setNewOpen(true)} onManage={() => setView('memory')} />
      )}

      {view === 'memory' && (
        <EntityManager clients={clients} catalog={catalog} onBack={() => setView('home')} onSaveClient={persistManagedClient} onDeleteClient={removeManagedClient} onSaveItem={persistManagedItem} onDeleteItem={removeManagedItem} />
      )}

      {view === 'history' && (
        <History
          documents={documents}
          search={search}
          onSearch={setSearch}
          onHome={() => setView('home')}
          onNew={() => setNewOpen(true)}
          onEdit={editDocument}
          onDuplicate={duplicateDocument}
          onConvert={convertDocument}
          onDelete={deleteDocument}
          onStatus={changeStatus}
          onPayment={setPaymentTarget}
        />
      )}

      {view === 'editor' && draft && (
        <Editor
          value={draft}
          company={company}
          clients={clients}
          catalog={catalog}
          onChange={updateDraft}
          onBack={() => setView('home')}
          onSave={persistDraft}
          onFinalize={finalizeDraft}
          onSaveClient={persistClient}
          onPdf={document => generatePdf(document, company)}
          onConvert={targetType => convertDocument(draft, targetType)}
          onPayment={setPaymentTarget}
        />
      )}

      {newOpen && <NewDocumentSheet onClose={() => setNewOpen(false)} onNew={startDocument} onImport={() => { setNewOpen(false); setImportOpen(true) }} />}
      {importOpen && <QuoteImportSheet defaultVatRate={company.defaultVatRate} onClose={() => setImportOpen(false)} onCreate={startImportedQuote} />}
      {paymentTarget && <PaymentSheet value={paymentTarget} onClose={() => setPaymentTarget(null)} onSave={recordPayment} />}
    </div>
  )
}

function Home({ documents, onEdit, onHistory, onSettings, onNew, onManage }: {
  documents: CommercialDocument[]
  onEdit: (document: CommercialDocument) => void
  onHistory: () => void
  onSettings: () => void
  onNew: () => void
  onManage: () => void
}) {
  const stats = dashboardStatsForYear(documents, new Date().getFullYear())

  return (
    <main className="screen home-screen with-bottom-nav">
      <header className="dashboard-header">
        <div><p className="eyebrow">FACTEA</p><h1>Tableau de bord</h1><p className="muted">Simple. Rapide. Professionnel.</p></div>
        <button className="profile-button" onClick={onSettings} aria-label="Réglages"><Icon name="settings" /></button>
      </header>
      <button className="search-surface" onClick={onHistory}><Icon name="search" /><span>Rechercher un document…</span></button>
      <button className="management-surface" onClick={onManage}><span><strong>Clients & catalogue</strong><small>Gérer vos fiches réutilisables</small></span><Icon name="chevron" /></button>

      <section className="section-block compact-section">
        <div className="section-heading"><div><span className="section-kicker">Aperçu</span><h2>Vos documents</h2></div><span className="period-chip">Cette année</span></div>
        <div className="stats-grid">
          {stats.map(stat => (
            <button className={`stat-card ${typeClass[stat.type]}`} key={stat.type} onClick={onHistory}>
              <span className="stat-icon"><Icon name={documentIcon[stat.type]} /></span>
              <span className="stat-count">{stat.count}</span><span className="stat-label">{documentLabel(stat.type)}</span><span className="stat-amount">{shortMoney(stat.amount)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section-block recent-section">
        <div className="section-heading"><div><span className="section-kicker">Activité</span><h2>Documents récents</h2></div><button className="text-button" onClick={onHistory}>Voir tout</button></div>
        {documents.length === 0 ? (
          <button className="empty-state premium-empty" onClick={onNew}><span className="empty-icon"><Icon name="plus" /></span><strong>Créer le premier document</strong><span>Devis, facture, BL ou bon de commande.</span></button>
        ) : (
          <div className="document-list glass-list">
            {documents.slice(0, 5).map(document => {
              const showAmount = document.type !== 'BL' || document.blShowPrices
              return (
                <button className="document-row" key={document.id} onClick={() => onEdit(document)}>
                  <span className={`document-badge small ${typeClass[document.type]}`}><Icon name={documentIcon[document.type]} /></span>
                  <span className="row-main"><strong>{document.client || documentLabel(document.type)}</strong><small>{documentLabel(document.type)} · {document.number || 'Brouillon'}</small></span>
                  <span className="row-meta">{showAmount && <strong>{shortMoney(documentTotals(document).totalTTC)}</strong>}<small>{documentStatusLabel(document.status)} · {shortDate(document.date)}</small></span>
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

function NewDocumentSheet({ onClose, onNew, onImport }: { onClose: () => void; onNew: (type: DocumentType) => void; onImport: () => void }) {
  const options: Array<{ type: DocumentType; subtitle: string }> = [
    { type: 'DEVIS', subtitle: 'Créer un nouveau devis' }, { type: 'FACTURE', subtitle: 'Créer une nouvelle facture' },
    { type: 'BL', subtitle: 'Créer un bon de livraison' }, { type: 'BC', subtitle: 'Créer un bon de commande' }
  ]
  return (
    <div className="sheet-layer" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="new-sheet" role="dialog" aria-modal="true" aria-label="Nouveau document">
        <div className="sheet-handle" />
        <div className="sheet-header"><button className="sheet-close" onClick={onClose} aria-label="Fermer">×</button><div><h2>Nouveau document</h2><p>Créez ou importez un devis</p></div><span className="sheet-header-spacer" /></div>
        <button className="import-quote-card" onClick={onImport}>
          <span className="import-quote-icon"><Icon name="file" /></span>
          <span className="import-quote-copy"><strong>Importer → devis</strong><small>Photo, PDF, Excel ou Word · traitement local</small><span className="import-format-pills"><i>Photo</i><i>PDF</i><i>Excel</i><i>Word</i></span></span>
          <span className="import-local-chip"><span className="status-dot" /> Local</span>
        </button>
        <div className="manual-separator"><span>Ou créer manuellement</span></div>
        <div className="new-options">
          {options.map(option => (
            <button className="new-option" key={option.type} onClick={() => onNew(option.type)}>
              <span className={`new-option-icon ${typeClass[option.type]}`}><Icon name={documentIcon[option.type]} /></span>
              <span className="new-option-copy"><strong>{documentLabel(option.type)}</strong><small>{option.subtitle}</small></span><span className="option-arrow"><Icon name="chevron" /></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function BottomNav({ active, onHome, onNew, onHistory }: { active: 'home' | 'history'; onHome: () => void; onNew: () => void; onHistory: () => void }) {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      <button className={`nav-item ${active === 'home' ? 'active' : ''}`} onClick={onHome}><Icon name="home" /><span>Accueil</span></button>
      <button className="fab" onClick={onNew} aria-label="Nouveau document"><Icon name="plus" /></button>
      <button className={`nav-item ${active === 'history' ? 'active' : ''}`} onClick={onHistory}><Icon name="history" /><span>Historique</span></button>
    </nav>
  )
}

function History({ documents, search, onSearch, onHome, onNew, onEdit, onDuplicate, onConvert, onDelete, onStatus, onPayment }: {
  documents: CommercialDocument[]
  search: string
  onSearch: (value: string) => void
  onHome: () => void
  onNew: () => void
  onEdit: (document: CommercialDocument) => void
  onDuplicate: (document: CommercialDocument) => void
  onConvert: (document: CommercialDocument, targetType: DocumentType) => void
  onDelete: (id: string) => void
  onStatus: (id: string, status: 'PAID' | 'CANCELLED') => void
  onPayment: (document: CommercialDocument) => void
}) {
  const [filter, setFilter] = useState<'ALL' | DocumentType>('ALL')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advanced, setAdvanced] = useState(() => defaultDocumentSearchFilters())
  const effectiveFilters = { ...advanced, query: search, type: filter }
  const visibleDocuments = filterDocuments(documents, effectiveFilters)
  const advancedCount = activeAdvancedFilterCount(effectiveFilters)
  const filters: Array<{ value: 'ALL' | DocumentType; label: string }> = [
    { value: 'ALL', label: 'Tous' }, { value: 'FACTURE', label: 'Factures' }, { value: 'DEVIS', label: 'Devis' }, { value: 'BL', label: 'BL' }, { value: 'BC', label: 'BC' }
  ]
  const resetAdvanced = () => setAdvanced(defaultDocumentSearchFilters())

  return (
    <main className="screen with-bottom-nav history-screen">
      <header className="history-header premium-history-header"><div><p className="eyebrow">ARCHIVES LOCALES</p><h1>Historique</h1><p className="muted">{visibleDocuments.length} document{visibleDocuments.length > 1 ? 's' : ''}</p></div></header>
      <label className="search-surface interactive-search history-search"><Icon name="search" /><input value={search} onChange={event => onSearch(event.target.value)} placeholder="Client, n°, ICE, désignation, objet…" /></label>
      <div className="history-filters" role="group" aria-label="Filtrer les documents">
        {filters.map(item => <button key={item.value} className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)}>{item.label}</button>)}
      </div>
      <div className="advanced-search-toolbar">
        <button className={`advanced-search-toggle ${advancedOpen ? 'active' : ''}`} onClick={() => setAdvancedOpen(value => !value)} aria-expanded={advancedOpen}>Filtres{advancedCount > 0 && <span className="advanced-search-count">{advancedCount}</span>}</button>
        {advancedCount > 0 && <button className="advanced-search-reset" style={{ width: 'auto', marginTop: 0 }} onClick={resetAdvanced}>Effacer</button>}
      </div>
      {advancedOpen && (
        <section className="advanced-search-panel" aria-label="Filtres avancés">
          <div className="advanced-search-grid">
            <label className="full"><span>Période</span><select value={advanced.period} onChange={event => setAdvanced(current => ({ ...current, period: event.target.value as typeof current.period }))}><option value="ALL">Toutes les dates</option><option value="THIS_MONTH">Ce mois</option><option value="THIS_YEAR">Cette année</option><option value="CUSTOM">Personnalisée</option></select></label>
            {advanced.period === 'CUSTOM' && <><label><span>Du</span><input type="date" value={advanced.dateFrom} onChange={event => setAdvanced(current => ({ ...current, dateFrom: event.target.value }))} /></label><label><span>Au</span><input type="date" value={advanced.dateTo} onChange={event => setAdvanced(current => ({ ...current, dateTo: event.target.value }))} /></label></>}
            <label><span>Montant min. TTC</span><input type="number" inputMode="decimal" min="0" value={advanced.amountMin} onChange={event => setAdvanced(current => ({ ...current, amountMin: event.target.value }))} placeholder="0" /></label>
            <label><span>Montant max. TTC</span><input type="number" inputMode="decimal" min="0" value={advanced.amountMax} onChange={event => setAdvanced(current => ({ ...current, amountMax: event.target.value }))} placeholder="Ex. 5000" /></label>
          </div>
          <button className="advanced-search-reset" onClick={resetAdvanced}>Réinitialiser les filtres avancés</button>
        </section>
      )}

      <div className="premium-history-list">
        {visibleDocuments.map(document => {
          const totals = documentTotals(document)
          const showAmount = document.type !== 'BL' || document.blShowPrices
          const payment = document.type === 'FACTURE' ? invoicePaymentSummary(document) : null
          return (
            <article className={`premium-history-card status-${document.status.toLowerCase()}`} key={document.id}>
              <button className="premium-history-main" onClick={() => onEdit(document)}>
                <span className={`document-badge small ${typeClass[document.type]}`}><Icon name={documentIcon[document.type]} /></span>
                <span className="history-copy">
                  <span className="history-card-topline"><strong>{document.client || documentLabel(document.type)}</strong><span className={`saved-chip ${payment ? `payment-state-${payment.state.toLowerCase()}` : ''}`}><span className="status-dot" /> {payment ? invoicePaymentStateLabel(payment.state) : documentStatusLabel(document.status)}</span></span>
                  <span className="history-number">{documentLabel(document.type)} · {document.number ? `#${document.number}` : 'Numéro non attribué'}</span>
                  <span className="history-object">{document.object || 'Sans objet'}</span>
                  <span className="history-meta-line"><span>{shortDate(document.date)}</span>{showAmount && <strong>{money(totals.totalTTC)}</strong>}</span>
                  {payment && payment.state !== 'PAID' && payment.state !== 'CANCELLED' && payment.state !== 'DRAFT' && <span className="invoice-balance-line">Reste {money(payment.remaining)}{document.dueDate ? ` · Échéance ${shortDate(document.dueDate)}` : ''}</span>}
                </span><Icon name="chevron" />
              </button>

              <div className="history-card-actions">
                <button onClick={() => onEdit(document)}>Ouvrir</button>
                <button onClick={() => onDuplicate(document)}>Dupliquer</button>
                {document.type === 'DEVIS' && document.status !== 'CANCELLED' && <button onClick={() => onConvert(document, 'FACTURE')}>→ Facture</button>}
                {document.type === 'DEVIS' && document.status !== 'CANCELLED' && <button onClick={() => onConvert(document, 'BL')}>→ BL</button>}
                {document.type === 'FACTURE' && (document.status === 'FINALIZED' || document.status === 'PAID') && <button onClick={() => onPayment(document)}>{document.status === 'PAID' ? 'Paiements' : 'Encaisser'}</button>}
                {(document.status === 'FINALIZED' || document.status === 'PAID') && <button className="danger" onClick={() => onStatus(document.id, 'CANCELLED')}>Annuler</button>}
                {document.status === 'DRAFT' && <button className="danger" onClick={() => onDelete(document.id)}>Supprimer</button>}
              </div>
            </article>
          )
        })}
        {visibleDocuments.length === 0 && <div className="empty-state history-empty"><span className="empty-icon"><Icon name="search" /></span><strong>Aucun document</strong><span>Modifiez la recherche ou le filtre.</span></div>}
      </div>
      <BottomNav active="history" onHome={onHome} onNew={onNew} onHistory={() => undefined} />
    </main>
  )
}

function Editor({ value, company, clients, catalog, onChange, onBack, onSave, onFinalize, onSaveClient, onPdf, onConvert, onPayment }: {
  value: CommercialDocument
  company: CompanySettings
  clients: ClientProfile[]
  catalog: CatalogItem[]
  onChange: (document: CommercialDocument) => void
  onBack: () => void
  onSave: (document: CommercialDocument) => Promise<void>
  onFinalize: (document: CommercialDocument) => Promise<void>
  onSaveClient: (client: ClientProfile) => Promise<ClientProfile>
  onPdf: (document: CommercialDocument) => void
  onConvert: (type: DocumentType) => void
  onPayment: (document: CommercialDocument) => void
}) {
  const [clientForm, setClientForm] = useState<ClientProfile | null>(null)
  const totals = documentTotals(value)
  const pricingVisible = value.type !== 'BL' || value.blShowPrices
  const editable = value.status === 'DRAFT'
  const payment = value.type === 'FACTURE' ? invoicePaymentSummary(value) : null
  const patch = (next: Partial<CommercialDocument>) => { if (editable) onChange({ ...value, ...next }) }
  const updateLine = (id: string, next: Partial<DocumentLine>) => patch({ lines: value.lines.map(line => line.id === id ? { ...line, ...next } : line) })

  const selectClient = (client: ClientProfile) => patch({
    client: clientDisplayName(client),
    clientId: client.id,
    clientAddress: client.address,
    clientIce: client.ice,
    clientIfNumber: client.ifNumber
  })

  const clientSuggestions = (() => {
    const query = canonical(value.client)
    if (!query) return clients.slice(0, 4)
    return clients.filter(client => {
      const text = canonical([client.name, client.company, client.ice, client.phone].join(' '))
      return text.includes(query)
    }).slice(0, 4)
  })()

  const catalogMatches = (query: string) => {
    const needle = canonical(query)
    if (needle.length < 2) return []
    return catalog.filter(item => canonical(item.designation).includes(needle)).slice(0, 3)
  }

  const insertCatalogItem = (item: CatalogItem) => {
    if (!editable) return
    const blank = value.lines.find(line => !line.designation.trim() && line.unitPriceHT === 0)
    const next = {
      designation: item.designation,
      unit: item.unit,
      unitPriceHT: item.lastUnitPriceHT,
      vatRate: item.vatRate,
      discountPercent: 0
    }
    if (blank) updateLine(blank.id, next)
    else patch({ lines: [...value.lines, { id: crypto.randomUUID(), quantity: 1, ...next }] })
  }

  const addLine = () => {
    if (!editable) return
    patch({ lines: [...value.lines, { id: crypto.randomUUID(), designation: '', unit: 'Pièce', quantity: 1, unitPriceHT: 0, vatRate: company.defaultVatRate, discountPercent: 0 }] })
  }
  const removeLine = (id: string) => { if (editable && value.lines.length > 1) patch({ lines: value.lines.filter(line => line.id !== id) }) }

  const openClientForm = () => {
    const existing = clients.find(client => client.id === value.clientId)
    setClientForm(existing ? structuredClone(existing) : newClientProfile(value.client))
  }

  const saveClient = async (profile: ClientProfile) => {
    const saved = await onSaveClient(profile)
    selectClient(saved)
    setClientForm(null)
  }

  return (
    <>
      <main className={`screen editor-screen ${editable ? '' : 'editor-readonly'}`}>
        <header className="editor-header">
          <button className="back-button" onClick={onBack} aria-label="Retour"><Icon name="back" /></button>
          <div className="editor-title"><span className={`editor-type-icon ${typeClass[value.type]}`}><Icon name={documentIcon[value.type]} /></span><div><h1>{documentLabel(value.type)}</h1><span className="draft-status"><span className="status-dot" /> {documentStatusLabel(value.status)}</span></div></div>
          <button className="editor-more" aria-label="Plus d’options"><Icon name="more" /></button>
        </header>

        {!editable && <section className="amount-words-card"><span className="section-kicker">Document verrouillé</span><p>Le numéro {value.number} est définitif. Les données métier sont en lecture seule.</p></section>}

        <section className="editor-meta glass-panel">
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

        <section className="editor-section">
          <div className="editor-section-title">
            <div><span className="section-kicker">Destinataire</span><h2>Client</h2></div>
            {editable && <button className="memory-mini-action" onClick={openClientForm}>{value.clientId ? 'Fiche' : '+ Mémoriser'}</button>}
          </div>
          <div className="glass-panel client-panel memory-client-panel">
            <label className="client-field">
              <Icon name="search" />
              <input
                disabled={!editable}
                value={value.client}
                onChange={event => patch({
                  client: event.target.value,
                  clientId: '',
                  clientAddress: '',
                  clientIce: '',
                  clientIfNumber: ''
                })}
                placeholder="Nom du client ou organisme"
              />
            </label>

            {editable && clientSuggestions.length > 0 && (
              <div className="memory-suggestions" aria-label="Clients suggérés">
                {clientSuggestions.map(client => (
                  <button key={client.id} onClick={() => selectClient(client)}>
                    <span>{clientDisplayName(client)}</span>
                    <small>{client.company && client.name ? client.name : client.ice ? `ICE ${client.ice}` : 'Client mémorisé'}</small>
                  </button>
                ))}
              </div>
            )}

            {(value.clientAddress || value.clientIce || value.clientIfNumber) && (
              <div className="client-snapshot">
                {value.clientAddress && <span>{value.clientAddress}</span>}
                <small>{[value.clientIce && `ICE ${value.clientIce}`, value.clientIfNumber && `IF ${value.clientIfNumber}`].filter(Boolean).join(' · ')}</small>
              </div>
            )}
          </div>
        </section>

        <section className="editor-section"><div className="editor-section-title"><div><span className="section-kicker">Description</span><h2>Objet</h2></div></div><div className="glass-panel object-panel"><textarea disabled={!editable} value={value.object} onChange={event => patch({ object: event.target.value })} placeholder="Objet du document" rows={3} /></div></section>

        {value.type === 'BL' && <section className="glass-panel bl-price-panel"><span><strong>Afficher les prix</strong><small>Sinon le BL affiche seulement désignation, unité et quantité.</small></span><label className="switch-control"><input type="checkbox" disabled={!editable} checked={value.blShowPrices} onChange={event => patch({ blShowPrices: event.target.checked })} /><span /></label></section>}

        <section className="editor-section articles-section">
          <div className="editor-section-title"><div><span className="section-kicker">Contenu</span><h2>Articles</h2></div>{editable && <button className="add-article-button" onClick={addLine}><Icon name="plus" /> Ajouter</button>}</div>

          {editable && catalog.length > 0 && (
            <div className="catalog-quick-block">
              <span>Prestations fréquentes</span>
              <div className="catalog-quick-row">
                {catalog.slice(0, 4).map(item => (
                  <button key={item.id} onClick={() => insertCatalogItem(item)}>
                    <strong>{item.designation}</strong>
                    <small>{money(item.lastUnitPriceHT)} · TVA {item.vatRate}%</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="line-list premium-lines">
            {value.lines.map((line, index) => {
              const matches = catalogMatches(line.designation)
              return (
                <article className="article-card" key={line.id}>
                  <div className="article-head"><div><span className="article-index">{String(index + 1).padStart(2, '0')}</span><strong>Article</strong></div>{editable && value.lines.length > 1 && <button className="trash-button" onClick={() => removeLine(line.id)} aria-label={`Supprimer l’article ${index + 1}`}><Icon name="trash" /></button>}</div>
                  <label className="article-designation"><span>Désignation</span><textarea disabled={!editable} rows={2} value={line.designation} onChange={event => updateLine(line.id, { designation: event.target.value })} placeholder="Prestation ou article" /></label>
                  {editable && matches.length > 0 && (
                    <div className="catalog-suggestions">
                      {matches.map(item => (
                        <button key={item.id} onClick={() => updateLine(line.id, {
                          designation: item.designation,
                          unit: item.unit,
                          unitPriceHT: item.lastUnitPriceHT,
                          vatRate: item.vatRate
                        })}>
                          <span>{item.designation}</span>
                          <small>{item.unit} · {money(item.lastUnitPriceHT)} · TVA {item.vatRate}%</small>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className={`article-fields ${pricingVisible ? '' : 'no-price'}`}>
                    <label><span>Unité</span><input disabled={!editable} value={line.unit} onChange={event => updateLine(line.id, { unit: event.target.value })} /></label>
                    <NumberField disabled={!editable} compact label="Qté" value={line.quantity} onChange={quantity => updateLine(line.id, { quantity })} />
                    {pricingVisible && <NumberField disabled={!editable} compact label="PU HT" value={line.unitPriceHT} step="0.01" onChange={unitPriceHT => updateLine(line.id, { unitPriceHT })} />}
                    {pricingVisible && <NumberField disabled={!editable} compact label="TVA %" value={line.vatRate} step="0.01" onChange={vatRate => updateLine(line.id, { vatRate })} />}
                    {pricingVisible && <NumberField disabled={!editable} compact label="Remise %" value={line.discountPercent ?? 0} step="0.01" onChange={discountPercent => updateLine(line.id, { discountPercent })} />}
                  </div>
                  {pricingVisible && <div className="article-total"><span>Total HT après remise</span><strong>{money(lineTotalHT(line))}</strong></div>}
                </article>
              )
            })}
          </div>
        </section>

        {pricingVisible && (
          <section className="premium-totals">
            <div><span>Total lignes HT</span><strong>{money(totals.linesHT)}</strong></div>
            {editable && <div><span>Remise globale %</span><NumberField compact label="" value={value.globalDiscountPercent} step="0.01" onChange={globalDiscountPercent => patch({ globalDiscountPercent: Math.min(100, globalDiscountPercent) })} /></div>}
            {totals.globalDiscount > 0 && <div><span>Remise globale</span><strong>- {money(totals.globalDiscount)}</strong></div>}
            <div><span>Total HT</span><strong>{money(totals.totalHT)}</strong></div><div><span>TVA</span><strong>{money(totals.totalVAT)}</strong></div><div className="premium-grand-total"><span>Total TTC</span><strong>{money(totals.totalTTC)}</strong></div>
          </section>
        )}
        {pricingVisible && <section className="amount-words-card"><span className="section-kicker">Montant en lettres</span><p>{amountToFrenchDirhams(totals.totalTTC)}</p></section>}

        {value.type === 'DEVIS' && value.status !== 'CANCELLED' && <section className="conversion-card premium-conversion"><span>Créer depuis ce devis</span><div><button className="secondary-button" onClick={() => onConvert('FACTURE')}>→ Facture</button><button className="secondary-button" onClick={() => onConvert('BL')}>→ BL</button></div></section>}

        <nav className="editor-bottom-bar" aria-label="Actions document">
          <button className="editor-action" onClick={() => onPdf(value)}><Icon name="eye" /><span>Aperçu PDF</span></button>
          {editable && <button className="editor-action" onClick={() => void onSave(value)}><Icon name="save" /><span>Enregistrer</span></button>}
          {editable && <button className="editor-save" onClick={() => void onFinalize(value)}><Icon name="check" /><span>Finaliser</span></button>}
        </nav>
      </main>

      {clientForm && (
        <ClientQuickForm
          value={clientForm}
          onClose={() => setClientForm(null)}
          onSave={saveClient}
        />
      )}
    </>
  )
}

function PaymentSheet({ value, onClose, onSave }: {
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
  value: ClientProfile
  onClose: () => void
  onSave: (profile: ClientProfile) => Promise<void>
}) {
  const [draft, setDraft] = useState(value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const patch = (next: Partial<ClientProfile>) => setDraft(current => ({ ...current, ...next }))

  const save = async () => {
    if (!clientDisplayName(draft)) {
      setError('Renseigne un nom ou une société.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSave(draft)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible d’enregistrer le client.')
      setBusy(false)
    }
  }

  return (
    <div className="client-form-layer" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="client-form-sheet" role="dialog" aria-modal="true" aria-label="Fiche client">
        <div className="sheet-handle" />
        <header>
          <div><span className="section-kicker">Mémoire locale</span><h2>Fiche client</h2></div>
          <button onClick={onClose} aria-label="Fermer">×</button>
        </header>
        <div className="client-form-grid">
          <label><span>Nom</span><input value={draft.name} onChange={event => patch({ name: event.target.value })} /></label>
          <label><span>Société</span><input value={draft.company} onChange={event => patch({ company: event.target.value })} /></label>
          <label className="wide"><span>Adresse</span><textarea rows={2} value={draft.address} onChange={event => patch({ address: event.target.value })} /></label>
          <label><span>ICE</span><input inputMode="numeric" value={draft.ice} onChange={event => patch({ ice: event.target.value })} /></label>
          <label><span>IF</span><input inputMode="numeric" value={draft.ifNumber} onChange={event => patch({ ifNumber: event.target.value })} /></label>
          <label><span>Téléphone</span><input inputMode="tel" value={draft.phone} onChange={event => patch({ phone: event.target.value })} /></label>
          <label><span>Email</span><input type="email" value={draft.email} onChange={event => patch({ email: event.target.value })} /></label>
        </div>
        {error && <p className="client-form-error">{error}</p>}
        <div className="client-form-actions">
          <button onClick={onClose}>Annuler</button>
          <button className="client-form-save" disabled={busy} onClick={() => void save()}>{busy ? 'Enregistrement…' : 'Mémoriser le client'}</button>
        </div>
      </section>
    </div>
  )
}

function NumberField({ label, value, step = '1', onChange, compact = false, disabled = false }: { label: string; value: number; step?: string; onChange: (value: number) => void; compact?: boolean; disabled?: boolean }) {
  return <label className={compact ? 'compact-number-field' : 'field'}>{label && <span>{label}</span>}<input disabled={disabled} type="number" inputMode="decimal" min="0" step={step} value={Number.isFinite(value) ? value : 0} onChange={event => onChange(Math.max(0, Number(event.target.value) || 0))} /></label>
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.5 20v-6h5v6"/></>, history: <><path d="M4.7 5.5A9 9 0 1 1 3 12"/><path d="M3 5v5h5"/><path d="M12 7.5V12l3 2"/></>, plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>, settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    search: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></>, file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h6M9 16h6"/></>, invoice: <><path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z"/><path d="M9 8h6M9 12h6M9 16h4"/></>, truck: <><path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>, order: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5"/></>, chevron: <path d="m9 5 7 7-7 7"/>, back: <path d="m15 5-7 7 7 7"/>, save: <><path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></>, eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>, trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>, more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>, check: <path d="m5 12 4 4L19 6"/>
  }
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
