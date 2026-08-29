import { useMemo, useState } from 'react'
import type { CatalogItem, ClientProfile } from './types'
import { clientDisplayName } from './types'
import './entity-manager.css'

type Tab = 'clients' | 'catalog'

const canonical = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim()
const money = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' }).format(value)
const now = () => new Date().toISOString()

const blankClient = (): ClientProfile => ({ id: crypto.randomUUID(), name: '', company: '', address: '', ice: '', ifNumber: '', phone: '', email: '', usageCount: 0, createdAt: now(), updatedAt: now() })
const blankItem = (): CatalogItem => ({ id: crypto.randomUUID(), designation: '', unit: 'Pièce', lastUnitPriceHT: 0, vatRate: 20, usageCount: 0, createdAt: now(), updatedAt: now() })

export function EntityManager({ clients, catalog, onBack, onSaveClient, onDeleteClient, onSaveItem, onDeleteItem }: {
  clients: ClientProfile[]
  catalog: CatalogItem[]
  onBack: () => void
  onSaveClient: (value: ClientProfile) => Promise<void>
  onDeleteClient: (id: string) => Promise<void>
  onSaveItem: (value: CatalogItem) => Promise<void>
  onDeleteItem: (id: string) => Promise<void>
}) {
  const [tab, setTab] = useState<Tab>('clients')
  const [query, setQuery] = useState('')
  const [clientEdit, setClientEdit] = useState<ClientProfile | null>(null)
  const [itemEdit, setItemEdit] = useState<CatalogItem | null>(null)
  const [error, setError] = useState('')
  const q = canonical(query)

  const shownClients = useMemo(() => clients.filter(client => !q || canonical([clientDisplayName(client), client.name, client.company, client.ice, client.ifNumber, client.phone, client.email, client.address].join(' ')).includes(q)), [clients, q])
  const shownCatalog = useMemo(() => catalog.filter(item => !q || canonical([item.designation, item.unit, String(item.lastUnitPriceHT), String(item.vatRate)].join(' ')).includes(q)), [catalog, q])

  const saveClient = async () => {
    if (!clientEdit) return
    try { setError(''); await onSaveClient(clientEdit); setClientEdit(null) } catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible') }
  }
  const saveItem = async () => {
    if (!itemEdit) return
    try { setError(''); await onSaveItem(itemEdit); setItemEdit(null) } catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible') }
  }

  return <main className="screen entity-manager-screen">
    <header className="entity-manager-header">
      <button className="entity-back" onClick={onBack} aria-label="Retour">‹</button>
      <div><span className="section-kicker">Mémoire locale</span><h1>Clients & catalogue</h1><p>Vos fiches réutilisables, hors ligne.</p></div>
    </header>

    <div className="entity-tabs" role="tablist">
      <button className={tab === 'clients' ? 'active' : ''} onClick={() => { setTab('clients'); setQuery('') }}>Clients <span>{clients.length}</span></button>
      <button className={tab === 'catalog' ? 'active' : ''} onClick={() => { setTab('catalog'); setQuery('') }}>Catalogue <span>{catalog.length}</span></button>
    </div>

    <div className="entity-search-row">
      <input aria-label="Rechercher dans la mémoire" value={query} onChange={e => setQuery(e.target.value)} placeholder={tab === 'clients' ? 'Nom, ICE, téléphone…' : 'Désignation, unité, prix…'} />
      <button onClick={() => tab === 'clients' ? setClientEdit(blankClient()) : setItemEdit(blankItem())}>+ Ajouter</button>
    </div>

    {tab === 'clients' ? <section className="entity-list" aria-label="Liste des clients">
      {shownClients.length === 0 ? <div className="entity-empty">Aucun client correspondant.</div> : shownClients.map(client => <article className="entity-card" key={client.id}>
        <div className="entity-main"><strong>{clientDisplayName(client)}</strong><small>{[client.ice && `ICE ${client.ice}`, client.phone, client.address].filter(Boolean).join(' · ') || 'Client local'}</small></div>
        <div className="entity-actions"><button onClick={() => setClientEdit(structuredClone(client))}>Modifier</button><button className="danger" onClick={() => { if (confirm('Supprimer cette fiche client ? Les documents existants resteront inchangés.')) void onDeleteClient(client.id) }}>Supprimer</button></div>
      </article>)}
    </section> : <section className="entity-list" aria-label="Liste du catalogue">
      {shownCatalog.length === 0 ? <div className="entity-empty">Aucun article correspondant.</div> : shownCatalog.map(item => <article className="entity-card" key={item.id}>
        <div className="entity-main"><strong>{item.designation}</strong><small>{money(item.lastUnitPriceHT)} HT · {item.unit} · TVA {item.vatRate}%</small></div>
        <div className="entity-actions"><button onClick={() => setItemEdit(structuredClone(item))}>Modifier</button><button className="danger" onClick={() => { if (confirm('Supprimer cet article du catalogue ? Les documents existants resteront inchangés.')) void onDeleteItem(item.id) }}>Supprimer</button></div>
      </article>)}
    </section>}

    {clientEdit && <div className="entity-sheet-layer" role="presentation"><section className="entity-sheet" role="dialog" aria-label="Fiche client">
      <header><div><span className="section-kicker">Client</span><h2>{clients.some(c => c.id === clientEdit.id) ? 'Modifier la fiche' : 'Nouveau client'}</h2></div><button onClick={() => setClientEdit(null)}>×</button></header>
      <div className="entity-form-grid">
        <label><span>Nom</span><input value={clientEdit.name} onChange={e => setClientEdit({ ...clientEdit, name: e.target.value })} /></label>
        <label><span>Société</span><input value={clientEdit.company} onChange={e => setClientEdit({ ...clientEdit, company: e.target.value })} /></label>
        <label><span>ICE</span><input value={clientEdit.ice} onChange={e => setClientEdit({ ...clientEdit, ice: e.target.value })} /></label>
        <label><span>IF</span><input value={clientEdit.ifNumber} onChange={e => setClientEdit({ ...clientEdit, ifNumber: e.target.value })} /></label>
        <label><span>Téléphone</span><input value={clientEdit.phone} onChange={e => setClientEdit({ ...clientEdit, phone: e.target.value })} /></label>
        <label><span>Email</span><input value={clientEdit.email} onChange={e => setClientEdit({ ...clientEdit, email: e.target.value })} /></label>
        <label className="wide"><span>Adresse</span><textarea rows={2} value={clientEdit.address} onChange={e => setClientEdit({ ...clientEdit, address: e.target.value })} /></label>
      </div>
      {error && <p className="entity-error">{error}</p>}<button className="entity-primary" onClick={() => void saveClient()}>Enregistrer</button>
    </section></div>}

    {itemEdit && <div className="entity-sheet-layer" role="presentation"><section className="entity-sheet" role="dialog" aria-label="Fiche article">
      <header><div><span className="section-kicker">Catalogue</span><h2>{catalog.some(i => i.id === itemEdit.id) ? 'Modifier l’article' : 'Nouvel article'}</h2></div><button onClick={() => setItemEdit(null)}>×</button></header>
      <div className="entity-form-grid">
        <label className="wide"><span>Désignation</span><input value={itemEdit.designation} onChange={e => setItemEdit({ ...itemEdit, designation: e.target.value })} /></label>
        <label><span>Unité</span><input value={itemEdit.unit} onChange={e => setItemEdit({ ...itemEdit, unit: e.target.value })} /></label>
        <label><span>Prix HT</span><input type="number" min="0" step="0.01" value={itemEdit.lastUnitPriceHT} onChange={e => setItemEdit({ ...itemEdit, lastUnitPriceHT: Number(e.target.value) })} /></label>
        <label><span>TVA %</span><input type="number" min="0" max="100" step="0.01" value={itemEdit.vatRate} onChange={e => setItemEdit({ ...itemEdit, vatRate: Number(e.target.value) })} /></label>
      </div>
      {error && <p className="entity-error">{error}</p>}<button className="entity-primary" onClick={() => void saveItem()}>Enregistrer</button>
    </section></div>}
  </main>
}
