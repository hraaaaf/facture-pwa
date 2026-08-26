# Facture PWA — Roadmap canonique

Dernière mise à jour : 26 août 2026

> Ordre de reprise : `docs/HANDOVER.md` → ce fichier → `docs/MOBILE_RUNTIME_AUDIT.md` → `docs/PDF_RUNTIME_CERTIFICATION.md` → `docs/PDF_ORIGINAL_REFERENCE.md` → `docs/PDF_ORIGINAL_GEOMETRY.md` → `docs/PDF_PREMIUM_VALIDATION.md` → `docs/UI_V1_MOBILE_SPEC.md` → `docs/mockups/MOCKUPS_LOCK.md`.

## Goal global

Créer une PWA mobile-first, installable sur iPhone et Android, très simple à utiliser, permettant de produire **Devis, Factures, Bons de livraison et Bons de commande**, avec calculs fiables, stockage local, mémoire clients/catalogue et PDF A4 professionnels.

## Doctrine de preuve

- `[x]` = implémentation ou comportement vérifié par code, donnée, source, runtime ou inspection visuelle disponible ;
- `[ ]` = gate de certification encore ouverte ;
- un lot candidat n'est pas DONE tant que ses gates critiques ne sont pas prouvées ;
- GitHub Actions reste manuel et rare ;
- aucun Vercel sans autorisation explicite.

---

# LOT 0 — Fondation / PWA

**État : RUNTIME WEB PROUVÉ, appareil réel non certifié**

- [x] React + TypeScript + Vite ;
- [x] PWA / service worker ;
- [x] IndexedDB local ;
- [x] 4 types de documents ;
- [x] calculs HT / TVA / TTC ;
- [x] montant TTC en lettres ;
- [x] historique / recherche ;
- [x] E0 onboarding société ;
- [x] identité société structurée ;
- [x] logo + signature locaux ;
- [x] export / restauration JSON ;
- [x] choix PDF Original/Premium ;
- [x] surface d'installation PWA : prompt + fallback iOS/Android + PNG 180/192/512 + manifest/iOS branchés ;
- [x] workflow GitHub `workflow_dispatch` uniquement ;
- [x] safe-area CSS prévue.

Preuves runtime cumulées : runs `32956883264`, `32959150633`, `32973432147`, `32977943138`. Le run `32977943138` a confirmé 15/15 tests, build, manifest/SW, 0 vulnérabilité critique, backup/restore et reload offline avant sa seule réserve tactile.

Gates :

- [ ] `npm test` HEAD exact final ;
- [ ] `npm run build` HEAD exact final ;
- [ ] installation réelle iPhone/Android ;
- [x] offline réel ;
- [ ] fermeture/réouverture sans perte sur appareil réel.

---

# UI V1 — E0 à E6 + Visual Polish

**État : RUNTIME AUDITÉ**

- [x] E0 premier démarrage 5 étapes ;
- [x] E1 dashboard ;
- [x] E2 nouveau document ;
- [x] E3 éditeur ;
- [x] E4 aperçu PDF ;
- [x] E5 historique/lifecycle ;
- [x] E6 réglages ;
- [x] Visual Polish V1 : glass, bottom bar, FAB, cartes et surfaces harmonisées.

Preuve : `docs/MOBILE_RUNTIME_AUDIT.md`, run `32959150633`, artifact `9603634672`.

Gates :

- [x] vraie capture runtime 390 px ;
- [x] vraie capture runtime 430 px ;
- [x] vraie capture runtime 768 px ;
- [x] zéro overflow / erreur console ;
- [x] score UI global officiel >= 9,3/10.

**Score visuel runtime : 9,3/10.**

---

# LOT 1 — Moteur métier production-grade

**État : RUNTIME PROUVÉ, exact-head final encore ouvert**

- [x] brouillon sans numéro définitif ;
- [x] séquence indépendante type + année ;
- [x] préfixes configurables ;
- [x] réservation du numéro dans la transaction de finalisation ;
- [x] numéro finalisé non réutilisable ;
- [x] statuts DRAFT / FINALIZED / PAID / CANCELLED ;
- [x] seul FACTURE peut être PAYÉ ;
- [x] document finalisé non supprimable ;
- [x] validation client/objet/lignes/TVA/prix/remises ;
- [x] remise ligne puis remise globale puis TVA ;
- [x] arrondi monétaire déterministe ;
- [x] traçabilité conversion via `sourceDocumentId`.

Durcissements : suppression brouillon atomique, stale draft protégé, préfixes non vides et distincts, restauration refusée si collision de numéro final.

Gates :

- [x] `001 → 002` runtime ;
- [x] annulation puis `003` ;
- [x] séquences Devis/Facture/BL/BC indépendantes ;
- [x] reset annuel ;
- [x] double tap Finaliser ;
- [x] stale draft ;
- [x] migration legacy ;
- [ ] tests/build HEAD exact final.

Preuves cumulées : runs `32963581880`, `32966380813`, `32973432147`, `32977943138`.

---

# LOT 2 — Clients & catalogue rapide

**État : RUNTIME PROUVÉ, revue mobile dédiée restante**

- [x] IndexedDB DB v3 `clients` + `catalog` ;
- [x] fiche client locale ;
- [x] autocomplétion/recherche ;
- [x] snapshot historique adresse/ICE/IF ;
- [x] prestations apprises après finalisation ;
- [x] dernier PU HT / TVA / unité ;
- [x] déduplication casse/accents/espaces ;
- [x] backup v2 + restore v1 compatible.

Gates :

- [x] créer/retrouver client runtime ;
- [x] snapshot inchangé après modification ;
- [x] prestation retrouvée après finalisation ;
- [x] fréquence/déduplication runtime ;
- [x] backup v2 réel ;
- [x] restore v1 réel ;
- [ ] revue mobile 390/430/768 des suggestions/sheets.

Le run `32977943138` a confirmé avant le contrôle tactile : conservation adresse/ICE/IF lors d'une déduplication canonique, dernier PU = 100 après seconde finalisation, backup v2, restore v1/v2 et rejet d'un numéro final dupliqué sans mutation.

---

# LOT 3 — PDF Original

**État : RUNTIME MULTI-PAGE PROUVÉ, fidélité à polir**

Sources : `docs/PDF_RUNTIME_CERTIFICATION.md`, `docs/PDF_ORIGINAL_REFERENCE.md`, `docs/PDF_ORIGINAL_GEOMETRY.md`, `src/referenceFixture.ts`.

- [x] données source verrouillées depuis les PDF fournis ;
- [x] fixture facture `#0107-2026` ;
- [x] fixture BL détaillé `#0107-2026` ;
- [x] fixture BL simple `#06-07-2026` sans client/prix ;
- [x] géométrie en-tête rapprochée de la source ;
- [x] objet gras + souligné ;
- [x] tableau tarifé + totals dans le même cadre ;
- [x] BL simple 3 colonnes placé plus bas ;
- [x] snapshot client conditionnel ;
- [x] remises conditionnelles ;
- [x] footer légal reconstruit depuis champs structurés.

Gates :

- [x] génération jsPDF sur les blobs produit au HEAD ;
- [x] rendu PNG du PDF généré à 180 dpi ;
- [x] comparaison source → généré effectuée ;
- [x] test multi-page réel ;
- [ ] tests/build HEAD exact final ;
- [ ] score officiel Original >= 9,5/10.

**Score runtime actuel Original : 9,3/10.**
Le stress multi-page réel produit 4 pages propres sans chevauchement visible.

---

# LOT 4 — PDF Premium

**État : RUNTIME MULTI-PAGE PROUVÉ, finition à polir**

- [x] second template Premium ;
- [x] hiérarchie document/société/date ;
- [x] snapshot client adresse/ICE/IF ;
- [x] remise ligne visible sous désignation ;
- [x] remise globale séparée ;
- [x] résumé HT/TVA/TTC dynamique ;
- [x] footer légal structuré ;
- [x] aperçu HTML aligné sur les mêmes règles ;
- [x] rendu jsPDF sur les blobs produit au HEAD.

Gates :

- [x] multi-page réel ;
- [ ] partage/téléchargement/impression navigateur réel ;
- [x] revue aperçu Premium 390/430/768 ;
- [ ] tests/build exact HEAD final ;
- [ ] score officiel Premium >= 9,5/10.

**Score runtime actuel Premium : 9,4/10.**
Le stress multi-page réel produit 3 pages propres sans chevauchement visible.

---

# LOT 5 — Certification finale mobile / PWA

**État : RUNTIME WEB FORTEMENT PROUVÉ, appareil réel + run exact HEAD restants**

- [x] E0 stockage vierge → onboarding → données persistées après reload ;
- [x] parcours document complet avec finalisation ;
- [x] finalisation + réouverture ;
- [x] historique/lifecycle complet réel ;
- [ ] gates LOT1 ;
- [ ] gates LOT2 ;
- [x] PDF Original runtime ;
- [x] PDF Premium runtime ;
- [x] 390 / 430 / 768 ;
- [x] zéro overflow ;
- [x] contrôles critiques >=44 px ;
- [x] offline ;
- [x] backup / restore ;
- [ ] partage PDF iOS/Android ;
- [ ] un seul run GitHub Actions final si utile ;
- [ ] human gate ;
- [ ] merge uniquement après preuves.

Autosave : **récupéré après reload sur 390 / 430 / 768** dans l'artifact `9603634672`.

Preuve tactile :
- BEFORE runtime run `32977943138` : `.sheet-close` = `43,34×43,34` pendant l'animation du sheet ;
- cause : `44 px × scale(.985) = 43,34 px` ;
- correctif produit `c4b7618ad0ab454f5d437c64b4495f1d49a6a75f` : 45 px ;
- contre-preuve Chromium indépendante sur 390/430/768 : `44,325 px` pendant `scale(.985)` et actions Historique = `45 px`.

---

# NEXT EXACT

1. Obtenir un run GitHub exact HEAD du correctif tactile ; le connecteur actuel ne déclenche pas les workflows sur ses propres écritures.
2. Revue mobile dédiée suggestions/client sheet 390/430/768.
3. PDF : partage/téléchargement/impression réel + polish Original 9,3→9,5 et Premium 9,4→9,5.
4. Installation + fermeture/réouverture sur iPhone/Android réel.
5. Human gate → merge.

## Avancement mécanique

**99 critères implémentés/observés sur 116 = 85,3 %.**

## Définition de DONE

Le chantier est DONE uniquement quand : onboarding fiable, moteur métier prouvé, données restaurables, mobile 390/430/768 propre avec cibles >=44 px, Original/Premium >=9,5, parcours téléphone complet, un run final exact HEAD et validation humaine avant merge. Aucun Vercel sans autorisation explicite.
