import { useState } from 'react'
import { amountToFrenchDirhams, documentLabel, documentTotals, lineSubtotalHT, lineTotalHT } from './lib'
import { downloadPdf, printPdf, sharePdf, type PdfTemplate } from './pdf'
import { companyLegalLine } from './types'
import type { CommercialDocument, CompanySettings } from './types'
import './preview.css'

const money = (value: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)

const formattedDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    .format(new Date(`${iso}T12:00:00`))

const brandInitials = (brand: string, name: string) => {
  const source = brand.trim() || name.trim()
  const parts = source.split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2)).toUpperCase() || 'TS'
}

const vatLabel = (document: CommercialDocument) => {
  const rates = [...new Set(document.lines.map(line => line.vatRate))]
  return rates.length === 1 ? `TVA ${String(rates[0]).replace('.', ',')}%` : 'TVA'
}

const stoppedAtLabel = (document: CommercialDocument) => {
  if (document.type === 'FACTURE') return 'ARRÊTÉE LA PRÉSENTE FACTURE À LA SOMME DE'
  if (document.type === 'DEVIS') return 'ARRÊTÉ LE PRÉSENT DEVIS À LA SOMME DE'
  if (document.type === 'BL') return 'ARRÊTÉ LE PRÉSENT BON DE LIVRAISON À LA SOMME DE'
  return 'ARRÊTÉ LE PRÉSENT BON DE COMMANDE À LA SOMME DE'
}

const lineDiscountTotal = (document: CommercialDocument) =>
  Math.max(0, document.lines.reduce((sum, line) => sum + lineSubtotalHT(line) - lineTotalHT(line), 0))

export default function PdfPreviewScreen({
  document,
  company,
  initialTemplate = 'premium',
  onBack
}: {
  document: CommercialDocument
  company: CompanySettings
  initialTemplate?: PdfTemplate
  onBack: () => void
}) {
  const [template, setTemplate] = useState<PdfTemplate>(initialTemplate)
  const pricingVisible = document.type !== 'BL' || document.blShowPrices
  const totals = documentTotals(document)

  return (
    <main className="preview-screen">
      <header className="preview-header">
        <button className="preview-back" onClick={onBack} aria-label="Retour">‹</button>
        <div>
          <span>Aperçu PDF</span>
          <strong>{documentLabel(document.type)} #{document.number}</strong>
        </div>
        <span className="preview-header-space" />
      </header>

      <div className="template-switch" role="group" aria-label="Modèle PDF">
        <button className={template === 'original' ? 'active' : ''} onClick={() => setTemplate('original')}>
          Original
        </button>
        <button className={template === 'premium' ? 'active' : ''} onClick={() => setTemplate('premium')}>
          Premium
        </button>
      </div>

      <div className="paper-stage">
        <article className={`pdf-paper ${template}`}>
          {template === 'original' ? (
            <OriginalPreview document={document} company={company} pricingVisible={pricingVisible} />
          ) : (
            <PremiumPreview document={document} company={company} pricingVisible={pricingVisible} />
          )}
        </article>
      </div>

      <nav className="preview-actions" aria-label="Actions PDF">
        <button onClick={() => void sharePdf(document, company, template)}>
          <ActionIcon kind="share" />
          <span>Partager</span>
        </button>
        <button className="download" onClick={() => downloadPdf(document, company, template)}>
          <ActionIcon kind="download" />
          <span>PDF</span>
        </button>
        <button onClick={() => printPdf(document, company, template)}>
          <ActionIcon kind="print" />
          <span>Imprimer</span>
        </button>
      </nav>

      <p className="preview-note">
        {template === 'original'
          ? 'Original reprend la structure des documents de référence.'
          : 'Premium modernise la présentation sans changer les données.'}
      </p>

      <span className="sr-only">Total TTC {money(totals.totalTTC)} MAD</span>
    </main>
  )
}

function OriginalPreview({
  document,
  company,
  pricingVisible
}: {
  document: CommercialDocument
  company: CompanySettings
  pricingVisible: boolean
}) {
  const totals = documentTotals(document)
  const lineDiscount = lineDiscountTotal(document)
  return (
    <>
      <div className="original-top">
        <div className="original-title">
          <h1>{documentLabel(document.type).toUpperCase()}</h1>
          <strong>#{document.number}</strong>
        </div>
        <CompanyMark company={company} compact />
      </div>

      {document.client && (
        <div className="original-client">
          <strong>Client :</strong> {document.client}
          {document.clientAddress && <small>{document.clientAddress}</small>}
          {document.clientIce && <small>ICE : {document.clientIce}</small>}
          {document.clientIfNumber && <small>IF : {document.clientIfNumber}</small>}
        </div>
      )}
      <div className="original-meta">
        <p><strong>OBJET :</strong> {document.object || '—'}</p>
        <p><strong>{company.cityLabel} LE :</strong><br />{formattedDate(document.date)}</p>
      </div>

      <PreviewTable document={document} pricingVisible={pricingVisible} variant="original" />

      {pricingVisible && (
        <div className="original-totals">
          {lineDiscount > 0 && <span>REMISES LIGNES : <strong>{money(lineDiscount)}</strong></span>}
          {totals.globalDiscount > 0 && <span>REMISE GLOBALE : <strong>{money(totals.globalDiscount)}</strong></span>}
          <span>TOTAL HT : <strong>{money(totals.totalHT)}</strong></span>
          <span>{vatLabel(document)} : <strong>{money(totals.totalVAT)}</strong></span>
          <span>TOTAL TTC : <strong>{money(totals.totalTTC)}</strong></span>
        </div>
      )}

      {pricingVisible && (
        <p className="original-words">
          {stoppedAtLabel(document)} {amountToFrenchDirhams(totals.totalTTC)} TTC
        </p>
      )}

      <PreviewSignatures company={company} />
      <PreviewFooter company={company} />
    </>
  )
}

function PremiumPreview({
  document,
  company,
  pricingVisible
}: {
  document: CommercialDocument
  company: CompanySettings
  pricingVisible: boolean
}) {
  const totals = documentTotals(document)
  const lineDiscount = lineDiscountTotal(document)
  return (
    <>
      <div className="premium-top">
        <CompanyMark company={company} />
        <div className="premium-doc-id">
          <span>{documentLabel(document.type)}</span>
          <h1>#{document.number}</h1>
          <small>{formattedDate(document.date)}</small>
        </div>
      </div>

      <div className="premium-rule" />

      <div className="premium-info-grid">
        <section>
          <span>FACTURÉ À</span>
          <strong>{document.client || 'Client à renseigner'}</strong>
          {document.clientAddress && <small>{document.clientAddress}</small>}
          {document.clientIce && <small>ICE : {document.clientIce}</small>}
          {document.clientIfNumber && <small>IF : {document.clientIfNumber}</small>}
        </section>
        <section>
          <span>OBJET</span>
          <strong>{document.object || 'Objet du document'}</strong>
        </section>
      </div>

      <PreviewTable document={document} pricingVisible={pricingVisible} variant="premium" />

      {pricingVisible && (
        <div className="premium-summary-wrap">
          <div className="premium-words">
            <span>Montant en lettres</span>
            <p>{amountToFrenchDirhams(totals.totalTTC)}</p>
          </div>
          <div className="premium-summary">
            {lineDiscount > 0 && <div><span>Remises lignes</span><strong>- {money(lineDiscount)}</strong></div>}
            {totals.globalDiscount > 0 && <div><span>Remise globale</span><strong>- {money(totals.globalDiscount)}</strong></div>}
            <div><span>Total HT</span><strong>{money(totals.totalHT)}</strong></div>
            <div><span>{vatLabel(document)}</span><strong>{money(totals.totalVAT)}</strong></div>
            <div className="premium-summary-total"><span>Total TTC</span><strong>{money(totals.totalTTC)} MAD</strong></div>
          </div>
        </div>
      )}

      <PreviewSignatures company={company} premium />
      <PreviewFooter company={company} premium />
    </>
  )
}

function PreviewTable({
  document,
  pricingVisible,
  variant
}: {
  document: CommercialDocument
  pricingVisible: boolean
  variant: PdfTemplate
}) {
  return (
    <div className={`preview-table ${variant}`}>
      <div className="preview-table-head">
        <span>Désignation</span>
        <span>Unité</span>
        <span>Qté</span>
        {pricingVisible && <span>PU HT</span>}
        {pricingVisible && <span>Total HT</span>}
      </div>
      {document.lines.map(line => (
        <div className="preview-table-row" key={line.id}>
          <span>
            {line.designation || '—'}
            {(line.discountPercent ?? 0) > 0 && <small>Remise {line.discountPercent}%</small>}
          </span>
          <span>{line.unit || '—'}</span>
          <span>{line.quantity}</span>
          {pricingVisible && <span>{money(line.unitPriceHT)}</span>}
          {pricingVisible && <span>{money(lineTotalHT(line))}</span>}
        </div>
      ))}
    </div>
  )
}

function CompanyMark({ company, compact = false }: { company: CompanySettings; compact?: boolean }) {
  return (
    <div className={`company-mark ${compact ? 'compact' : ''}`}>
      {company.logoDataUrl
        ? <img src={company.logoDataUrl} alt="Logo société" />
        : <span className="logo-placeholder">{brandInitials(company.brand, company.name)}</span>}
      <div>
        <strong>{company.name}</strong>
        <small>{company.brand}</small>
      </div>
    </div>
  )
}

function PreviewSignatures({ company, premium = false }: { company: CompanySettings; premium?: boolean }) {
  return (
    <div className={`preview-signatures ${premium ? 'premium' : ''}`}>
      <div><span>Le Client</span><i /></div>
      <div>
        <span>Le gérant</span>
        {company.managerSignatureDataUrl && <img src={company.managerSignatureDataUrl} alt="Signature gérant" />}
        <i />
      </div>
    </div>
  )
}

function PreviewFooter({ company, premium = false }: { company: CompanySettings; premium?: boolean }) {
  const legalLine = companyLegalLine(company)
  return (
    <footer className={`preview-footer ${premium ? 'premium' : ''}`}>
      <strong>{company.address}</strong>
      <span>{legalLine}</span>
      <small>Page 1 / 1</small>
    </footer>
  )
}

function ActionIcon({ kind }: { kind: 'share' | 'download' | 'print' }) {
  if (kind === 'share') {
    return <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.3 10.8 7.4-4.4M8.3 13.2l7.4 4.4"/></svg>
  }
  if (kind === 'download') {
    return <svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>
  }
  return <svg viewBox="0 0 24 24"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5h18v5a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/></svg>
}
