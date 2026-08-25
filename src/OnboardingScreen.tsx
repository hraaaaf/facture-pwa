import { useState, type ChangeEvent } from 'react'
import type { CompanySettings } from './types'
import './onboarding.css'

type Props = {
  initialValue: CompanySettings
  onComplete: (company: CompanySettings) => Promise<void>
}

const steps = ['Identité', 'Coordonnées', 'Identifiants', 'Banque', 'Documents'] as const

export default function OnboardingScreen({ initialValue, onComplete }: Props) {
  const [draft, setDraft] = useState<CompanySettings>(initialValue)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const patch = (next: Partial<CompanySettings>) => setDraft(current => ({ ...current, ...next }))

  const imageChanged = (key: 'logoDataUrl' | 'managerSignatureDataUrl') => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => patch({ [key]: String(reader.result ?? '') })
    reader.readAsDataURL(file)
  }

  const validateStep = () => {
    if (step === 0 && !draft.name.trim()) return 'Renseigne le nom ou la raison sociale.'
    if (step === 1 && !draft.address.trim()) return 'Renseigne l’adresse de l’entreprise.'
    if (draft.defaultVatRate < 0 || draft.defaultVatRate > 100) return 'La TVA doit être comprise entre 0 et 100 %.'
    return ''
  }

  const next = () => {
    const message = validateStep()
    if (message) {
      setError(message)
      return
    }
    setError('')
    setStep(current => Math.min(steps.length - 1, current + 1))
  }

  const finish = async () => {
    const message = validateStep()
    if (message) {
      setError(message)
      return
    }
    setBusy(true)
    setError('')
    try {
      await onComplete({ ...draft, onboardingCompleted: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible d’enregistrer les informations.')
      setBusy(false)
    }
  }

  return (
    <main className="onboarding-screen">
      <div className="onboarding-glow onboarding-glow-one" />
      <div className="onboarding-glow onboarding-glow-two" />

      <section className="onboarding-shell">
        <header className="onboarding-header">
          <div className="onboarding-logo-mark">F</div>
          <div>
            <span>FACTURE PWA</span>
            <h1>Configure ton entreprise</h1>
            <p>Ces informations seront utilisées automatiquement sur tes devis, factures, BL et BC.</p>
          </div>
        </header>

        <div className="onboarding-progress" aria-label={`Étape ${step + 1} sur ${steps.length}`}>
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              className={`${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`}
              onClick={() => index < step && setStep(index)}
              aria-current={index === step ? 'step' : undefined}
            >
              <span>{index < step ? '✓' : index + 1}</span>
              <small>{label}</small>
            </button>
          ))}
        </div>

        <section className="onboarding-card">
          {step === 0 && (
            <>
              <StepTitle eyebrow="Étape 1" title="Identité" copy="Le nom et le logo qui apparaîtront sur les documents." />
              <div className="onboarding-logo-row">
                <div className="onboarding-logo-preview">
                  {draft.logoDataUrl ? <img src={draft.logoDataUrl} alt="Logo société" /> : <span>{draft.brand.slice(0, 1) || draft.name.slice(0, 1) || 'F'}</span>}
                </div>
                <label className="onboarding-upload">
                  <input type="file" accept="image/png,image/jpeg" onChange={imageChanged('logoDataUrl')} />
                  {draft.logoDataUrl ? 'Remplacer le logo' : 'Ajouter le logo'}
                </label>
              </div>
              <Field label="Nom / raison sociale" required>
                <input autoFocus value={draft.name} onChange={event => patch({ name: event.target.value })} placeholder="Ex. Société Benmoussa" />
              </Field>
              <Field label="Nom commercial / marque">
                <input value={draft.brand} onChange={event => patch({ brand: event.target.value })} placeholder="Ex. TAPISTOR SABRE" />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <StepTitle eyebrow="Étape 2" title="Coordonnées" copy="Adresse et moyens de contact de l’entreprise." />
              <Field label="Adresse" required>
                <textarea autoFocus rows={3} value={draft.address} onChange={event => patch({ address: event.target.value })} placeholder="Adresse complète" />
              </Field>
              <div className="onboarding-grid two">
                <Field label="Ville">
                  <input value={draft.cityLabel} onChange={event => patch({ cityLabel: event.target.value })} />
                </Field>
                <Field label="Téléphone">
                  <input inputMode="tel" value={draft.phone} onChange={event => patch({ phone: event.target.value })} placeholder="+212 ..." />
                </Field>
                <Field label="Fax">
                  <input inputMode="tel" value={draft.fax} onChange={event => patch({ fax: event.target.value })} placeholder="+212 ..." />
                </Field>
                <Field label="Email">
                  <input inputMode="email" type="email" value={draft.email} onChange={event => patch({ email: event.target.value })} placeholder="contact@entreprise.ma" />
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <StepTitle eyebrow="Étape 3" title="Identifiants légaux" copy="Renseigne uniquement les identifiants dont ton entreprise dispose." />
              <div className="onboarding-grid two">
                <Field label="ICE">
                  <input autoFocus inputMode="numeric" value={draft.ice} onChange={event => patch({ ice: event.target.value })} />
                </Field>
                <Field label="IF">
                  <input inputMode="numeric" value={draft.ifNumber} onChange={event => patch({ ifNumber: event.target.value })} />
                </Field>
                <Field label="RC">
                  <input value={draft.rc} onChange={event => patch({ rc: event.target.value })} />
                </Field>
                <Field label="Patente">
                  <input inputMode="numeric" value={draft.patente} onChange={event => patch({ patente: event.target.value })} />
                </Field>
                <Field label="CNSS">
                  <input inputMode="numeric" value={draft.cnss} onChange={event => patch({ cnss: event.target.value })} />
                </Field>
              </div>
              <p className="onboarding-hint">Ces champs alimentent automatiquement le pied de page des PDF. Plus besoin d’une grosse ligne juridique bricolée à la main.</p>
            </>
          )}

          {step === 3 && (
            <>
              <StepTitle eyebrow="Étape 4" title="Coordonnées bancaires" copy="Optionnel. Elles pourront être affichées sur les documents quand nécessaire." />
              <Field label="Banque">
                <input autoFocus value={draft.bankName} onChange={event => patch({ bankName: event.target.value })} placeholder="Nom de la banque" />
              </Field>
              <Field label="RIB">
                <input inputMode="numeric" value={draft.rib} onChange={event => patch({ rib: event.target.value })} placeholder="RIB" />
              </Field>
            </>
          )}

          {step === 4 && (
            <>
              <StepTitle eyebrow="Étape 5" title="Documents" copy="Choisis les valeurs par défaut. Elles resteront modifiables dans Réglages." />
              <Field label="TVA par défaut %">
                <input
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.01"
                  value={draft.defaultVatRate}
                  onChange={event => patch({ defaultVatRate: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })}
                />
              </Field>

              <div className="onboarding-choice-block">
                <span>Modèle PDF par défaut</span>
                <div role="group" aria-label="Modèle PDF par défaut">
                  <button type="button" className={draft.pdfTemplate === 'original' ? 'active' : ''} onClick={() => patch({ pdfTemplate: 'original' })}>Original</button>
                  <button type="button" className={draft.pdfTemplate === 'premium' ? 'active' : ''} onClick={() => patch({ pdfTemplate: 'premium' })}>Premium</button>
                </div>
              </div>

              <div className="onboarding-signature-row">
                <div className="onboarding-signature-preview">
                  {draft.managerSignatureDataUrl ? <img src={draft.managerSignatureDataUrl} alt="Signature gérant" /> : <span>Signature</span>}
                </div>
                <label className="onboarding-upload">
                  <input type="file" accept="image/png,image/jpeg" onChange={imageChanged('managerSignatureDataUrl')} />
                  {draft.managerSignatureDataUrl ? 'Remplacer la signature' : 'Ajouter la signature'}
                </label>
              </div>

              <div className="onboarding-summary">
                <span>Prêt</span>
                <strong>{draft.name || 'Entreprise'}</strong>
                <small>{draft.address || 'Adresse à renseigner'} · TVA {draft.defaultVatRate}% · PDF {draft.pdfTemplate === 'premium' ? 'Premium' : 'Original'}</small>
              </div>
            </>
          )}

          {error && <div className="onboarding-error" role="alert">{error}</div>}
        </section>

        <nav className="onboarding-actions">
          <button type="button" className="secondary" disabled={step === 0 || busy} onClick={() => { setError(''); setStep(current => Math.max(0, current - 1)) }}>
            Retour
          </button>
          {step < steps.length - 1 ? (
            <button type="button" className="primary" onClick={next}>Continuer</button>
          ) : (
            <button type="button" className="primary" disabled={busy} onClick={() => void finish()}>{busy ? 'Enregistrement…' : 'Terminer la configuration'}</button>
          )}
        </nav>

        <p className="onboarding-local-note">🔒 Tout reste stocké localement sur cet appareil.</p>
      </section>
    </main>
  )
}

function StepTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <header className="onboarding-step-title">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </header>
  )
}

function Field({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="onboarding-field">
      <span>{label}{required && <b> *</b>}</span>
      {children}
    </label>
  )
}
