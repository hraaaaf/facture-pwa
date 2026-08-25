import { useEffect, useState, type ChangeEvent } from 'react'
import { createLocalBackup, getCompany, getDocuments, restoreLocalBackup, saveCompany } from './storage'
import type { CompanySettings, DocumentType } from './types'
import { defaultCompany } from './types'
import './settings-premium.css'

export type InstallOutcome = 'accepted' | 'dismissed'

export interface PwaInstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>
}

type SettingsScreenProps = {
  onBack: () => void
  onDataChanged: () => void
  installPrompt: PwaInstallPrompt | null
  onInstallConsumed: () => void
}

const backupFileName = () => `facture-pwa-backup-${new Date().toISOString().slice(0, 10)}.json`
const isStandalone = () => {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

export default function SettingsScreen({ onBack, onDataChanged, installPrompt, onInstallConsumed }: SettingsScreenProps) {
  const [draft, setDraft] = useState<CompanySettings>(defaultCompany)
  const [documentsCount, setDocumentsCount] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [installed, setInstalled] = useState(isStandalone())

  useEffect(() => {
    void Promise.all([getCompany(), getDocuments()]).then(([company, documents]) => {
      setDraft(company)
      setDocumentsCount(documents.length)
    })
  }, [])

  useEffect(() => {
    const onInstalled = () => setInstalled(true)
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [])

  const patch = (next: Partial<CompanySettings>) => setDraft(current => ({ ...current, ...next }))
  const patchPrefix = (type: DocumentType, value: string) => {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    patch({ numberingPrefixes: { ...draft.numberingPrefixes, [type]: normalized } })
  }
  const showFeedback = (message: string) => {
    setFeedback(message)
    window.setTimeout(() => setFeedback(''), 2600)
  }

  const imageChanged = (key: 'logoDataUrl' | 'managerSignatureDataUrl') => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => patch({ [key]: String(reader.result ?? '') })
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const save = async () => {
    if (Object.values(draft.numberingPrefixes).some(prefix => !prefix.trim())) {
      showFeedback('Chaque type de document doit avoir un préfixe.')
      return
    }
    await saveCompany({ ...draft, onboardingCompleted: true })
    onDataChanged()
    showFeedback('Réglages enregistrés')
  }

  const exportBackup = async () => {
    const backup = await createLocalBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = backupFileName()
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    showFeedback(`${backup.documents.length} document${backup.documents.length > 1 ? 's' : ''} sauvegardé${backup.documents.length > 1 ? 's' : ''}`)
  }

  const restoreBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!window.confirm('Restaurer cette sauvegarde ? Les données locales actuelles seront remplacées.')) return
    try {
      const raw = JSON.parse(await file.text()) as unknown
      await restoreLocalBackup(raw)
      const [company, documents] = await Promise.all([getCompany(), getDocuments()])
      setDraft(company)
      setDocumentsCount(documents.length)
      onDataChanged()
      showFeedback('Sauvegarde restaurée avec succès')
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : 'Sauvegarde invalide')
    }
  }

  const install = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    onInstallConsumed()
    if (choice.outcome === 'accepted') {
      setInstalled(true)
      showFeedback('Installation lancée')
    }
  }

  return (
    <main className="premium-settings-screen">
      {feedback && <div className="settings-feedback">{feedback}</div>}
      <header className="settings-topbar">
        <button className="settings-back" onClick={onBack} aria-label="Retour">‹</button>
        <div><span>FACTURE PWA</span><h1>Réglages</h1></div><span className="settings-top-spacer" />
      </header>

      <section className="settings-hero">
        <div className="settings-brand-mark">{draft.logoDataUrl ? <img src={draft.logoDataUrl} alt="Logo société" /> : <span>{draft.brand.slice(0, 1) || 'F'}</span>}</div>
        <div><span className="settings-kicker">Identité active</span><strong>{draft.name || 'Votre entreprise'}</strong><small>{draft.brand || 'Marque à renseigner'}</small></div>
        <span className="settings-local-chip">Local</span>
      </section>

      <SettingsSection eyebrow="Entreprise" title="Identité & coordonnées">
        <div className="settings-form-grid">
          <SettingsField label="Nom / raison sociale"><input value={draft.name} onChange={event => patch({ name: event.target.value })} /></SettingsField>
          <SettingsField label="Marque"><input value={draft.brand} onChange={event => patch({ brand: event.target.value })} /></SettingsField>
          <SettingsField label="Adresse" wide><textarea rows={3} value={draft.address} onChange={event => patch({ address: event.target.value })} /></SettingsField>
          <SettingsField label="Ville"><input value={draft.cityLabel} onChange={event => patch({ cityLabel: event.target.value })} /></SettingsField>
          <SettingsField label="Téléphone"><input inputMode="tel" value={draft.phone} onChange={event => patch({ phone: event.target.value })} /></SettingsField>
          <SettingsField label="Fax"><input inputMode="tel" value={draft.fax} onChange={event => patch({ fax: event.target.value })} /></SettingsField>
          <SettingsField label="Email"><input type="email" inputMode="email" value={draft.email} onChange={event => patch({ email: event.target.value })} /></SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection eyebrow="Légal" title="Identifiants entreprise">
        <div className="settings-form-grid">
          <SettingsField label="ICE"><input inputMode="numeric" value={draft.ice} onChange={event => patch({ ice: event.target.value })} /></SettingsField>
          <SettingsField label="IF"><input inputMode="numeric" value={draft.ifNumber} onChange={event => patch({ ifNumber: event.target.value })} /></SettingsField>
          <SettingsField label="RC"><input value={draft.rc} onChange={event => patch({ rc: event.target.value })} /></SettingsField>
          <SettingsField label="Patente"><input inputMode="numeric" value={draft.patente} onChange={event => patch({ patente: event.target.value })} /></SettingsField>
          <SettingsField label="CNSS"><input inputMode="numeric" value={draft.cnss} onChange={event => patch({ cnss: event.target.value })} /></SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection eyebrow="Paiement" title="Coordonnées bancaires">
        <div className="settings-form-grid">
          <SettingsField label="Banque"><input value={draft.bankName} onChange={event => patch({ bankName: event.target.value })} /></SettingsField>
          <SettingsField label="RIB" wide><input inputMode="numeric" value={draft.rib} onChange={event => patch({ rib: event.target.value })} /></SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection eyebrow="Documents" title="Fiscalité & rendu PDF">
        <div className="settings-form-grid">
          <SettingsField label="TVA par défaut %">
            <input type="number" inputMode="decimal" min="0" max="100" step="0.01" value={draft.defaultVatRate} onChange={event => patch({ defaultVatRate: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })} />
          </SettingsField>
        </div>

        <div className="settings-choice-block">
          <div><strong>Modèle PDF par défaut</strong><small>Tu pourras toujours changer de modèle dans l’aperçu.</small></div>
          <div className="pdf-choice" role="group" aria-label="Modèle PDF par défaut">
            <button className={draft.pdfTemplate === 'original' ? 'active' : ''} onClick={() => patch({ pdfTemplate: 'original' })}>Original</button>
            <button className={draft.pdfTemplate === 'premium' ? 'active' : ''} onClick={() => patch({ pdfTemplate: 'premium' })}>Premium</button>
          </div>
        </div>

        <div className="numbering-preview">
          <div>
            <span className="settings-kicker">Numérotation irréversible</span>
            <strong>{draft.numberingPrefixes.DEVIS}-2026-001 · {draft.numberingPrefixes.FACTURE}-2026-001 · {draft.numberingPrefixes.BL}-2026-001 · {draft.numberingPrefixes.BC}-2026-001</strong>
            <small>Le préfixe peut changer. Une séquence déjà consommée ne revient jamais en arrière.</small>
          </div>
          <span className="settings-local-chip">Actif</span>
        </div>
        <div className="settings-form-grid">
          <SettingsField label="Préfixe Devis"><input maxLength={8} value={draft.numberingPrefixes.DEVIS} onChange={event => patchPrefix('DEVIS', event.target.value)} /></SettingsField>
          <SettingsField label="Préfixe Facture"><input maxLength={8} value={draft.numberingPrefixes.FACTURE} onChange={event => patchPrefix('FACTURE', event.target.value)} /></SettingsField>
          <SettingsField label="Préfixe BL"><input maxLength={8} value={draft.numberingPrefixes.BL} onChange={event => patchPrefix('BL', event.target.value)} /></SettingsField>
          <SettingsField label="Préfixe BC"><input maxLength={8} value={draft.numberingPrefixes.BC} onChange={event => patchPrefix('BC', event.target.value)} /></SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection eyebrow="PDF" title="Logo & signature">
        <div className="asset-grid">
          <article className="asset-card">
            <div className="asset-preview logo-preview">{draft.logoDataUrl ? <img src={draft.logoDataUrl} alt="Logo actuel" /> : <span>Logo</span>}</div>
            <div className="asset-copy"><strong>Logo société</strong><small>PNG ou JPEG stocké uniquement sur cet appareil.</small></div>
            <label className="asset-upload"><input type="file" accept="image/png,image/jpeg" onChange={imageChanged('logoDataUrl')} />Remplacer</label>
            {draft.logoDataUrl && <button className="asset-remove" onClick={() => patch({ logoDataUrl: '' })}>Retirer</button>}
          </article>
          <article className="asset-card">
            <div className="asset-preview signature-preview">{draft.managerSignatureDataUrl ? <img src={draft.managerSignatureDataUrl} alt="Signature actuelle" /> : <span>Signature</span>}</div>
            <div className="asset-copy"><strong>Signature gérant</strong><small>Injectée dans les PDF quand elle est renseignée.</small></div>
            <label className="asset-upload"><input type="file" accept="image/png,image/jpeg" onChange={imageChanged('managerSignatureDataUrl')} />Remplacer</label>
            {draft.managerSignatureDataUrl && <button className="asset-remove" onClick={() => patch({ managerSignatureDataUrl: '' })}>Retirer</button>}
          </article>
        </div>
      </SettingsSection>

      <SettingsSection eyebrow="Sécurité locale" title="Sauvegarde & restauration">
        <div className="backup-summary"><div><strong>{documentsCount}</strong><span>document{documentsCount > 1 ? 's' : ''} sur cet appareil</span></div><span>JSON local</span></div>
        <div className="backup-actions">
          <button onClick={() => void exportBackup()}><strong>Exporter</strong><small>Créer une sauvegarde complète</small></button>
          <label><input type="file" accept="application/json,.json" onChange={event => void restoreBackup(event)} /><strong>Restaurer</strong><small>Remplacer les données locales</small></label>
        </div>
        <p className="backup-warning">Garde une copie de ce fichier hors du téléphone. Le navigateur n’est pas un coffre-fort, malgré son air très sûr de lui.</p>
      </SettingsSection>

      <SettingsSection eyebrow="PWA" title="Installation sur téléphone">
        <div className="install-card">
          <div className={`install-status ${installed ? 'installed' : ''}`}><span /><div><strong>{installed ? 'Application installée' : 'Prête à être installée'}</strong><small>Données locales, interface plein écran et accès depuis l’écran d’accueil.</small></div></div>
          {installed ? <span className="installed-badge">Installée</span> : installPrompt ? <button className="install-button" onClick={() => void install()}>Installer maintenant</button> : <div className="manual-install"><strong>iPhone / iPad</strong><span>Safari → Partager → Sur l’écran d’accueil.</span><strong>Android</strong><span>Menu du navigateur → Installer l’application / Ajouter à l’écran d’accueil.</span></div>}
        </div>
      </SettingsSection>

      <div className="settings-save-space" />
      <nav className="settings-save-bar"><button className="settings-secondary" onClick={onBack}>Fermer</button><button className="settings-primary" onClick={() => void save()}>Enregistrer les réglages</button></nav>
    </main>
  )
}

function SettingsSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="settings-section"><header><span className="settings-kicker">{eyebrow}</span><h2>{title}</h2></header><div className="settings-panel">{children}</div></section>
}

function SettingsField({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`settings-field ${wide ? 'wide' : ''}`}><span>{label}</span>{children}</label>
}
