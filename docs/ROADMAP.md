# Facture PWA — Roadmap canonique

Dernière mise à jour : 26 août 2026

> Ordre de reprise : `docs/HANDOVER.md` → ce fichier → `docs/PDF_RUNTIME_CERTIFICATION.md` → `docs/PDF_ORIGINAL_REFERENCE.md` → `docs/PDF_ORIGINAL_GEOMETRY.md` → `docs/PDF_PREMIUM_VALIDATION.md` → `docs/UI_V1_MOBILE_SPEC.md` → `docs/mockups/MOCKUPS_LOCK.md`.

## Goal global

Créer une PWA mobile-first, installable sur iPhone et Android, très simple à utiliser, permettant de produire **Devis, Factures, Bons de livraison et Bons de commande**, avec calculs fiables, stockage local, mémoire clients/catalogue et PDF A4 professionnels.

## Doctrine de preuve

- `[x]` = implémentation ou comportement vérifié par code, donnée, source ou inspection visuelle disponible ;
- `[ ]` = gate de certification encore ouverte ;
- un lot candidat n'est pas DONE tant que ses gates critiques ne sont pas prouvées ;
- GitHub Actions reste manuel et rare ;
- aucun Vercel sans autorisation explicite.

---

# LOT 0 — Fondation / PWA

**État : CANDIDAT, appareil réel non certifié**

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

Preuve runtime disponible : le run `32956883264` a passé **13/13 tests**, construit l'app avec `tsc -b && vite build`, généré manifest + service worker et produit les PDF runtime. Le HEAD courant ne relance pas ces gates car les commits suivants sont documentaires ; les cases « exact HEAD » restent volontairement ouvertes pour la certification finale.

Gates :

- [ ] `npm test` HEAD exact final ;
- [ ] `npm run build` HEAD exact final ;
- [ ] installation réelle iPhone/Android ;
- [ ] offline réel ;
- [ ] fermeture/réouverture sans perte.

---

# UI V1 — E0 à E6 + Visual Polish

**État : CANDIDAT VISUEL**

- [x] E0 premier démarrage 5 étapes ;
- [x] E1 dashboard ;
- [x] E2 nouveau document ;
- [x] E3 éditeur ;
- [x] E4 aperçu PDF ;
- [x] E5 historique/lifecycle ;
- [x] E6 réglages ;
- [x] Visual Polish V1 : glass, bottom bar, FAB, cartes et surfaces harmonisées.

Score intermédiaire accueil : **9,2/10 candidat**.

Gates :

- [ ] vraie capture runtime 390 px ;
- [ ] vraie capture runtime 430 px ;
- [ ] vraie capture runtime 768 px ;
- [ ] zéro overflow / erreur console ;
- [ ] score UI global officiel >= 9,3/10.

---

# LOT 1 — Moteur métier production-grade

**État : CANDIDAT TECHNIQUE, parcours runtime non certifié**

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

Durcissement supplémentaire vérifié par le build du run `32956883264` : suppression d'un brouillon atomique dans une seule transaction IndexedDB (`get` → contrôle `DRAFT` → `delete`).

Gates :

- [ ] `001 → 002` runtime ;
- [ ] annulation puis `003` ;
- [ ] séquences Devis/Facture/BL/BC indépendantes ;
- [ ] reset annuel ;
- [ ] double tap Finaliser ;
- [ ] stale draft ;
- [ ] migration legacy ;
- [ ] tests/build HEAD exact final.

---

# LOT 2 — Clients & catalogue rapide

**État : CANDIDAT TECHNIQUE, runtime non certifié**

- [x] IndexedDB DB v3 `clients` + `catalog` ;
- [x] fiche client locale ;
- [x] autocomplétion/recherche ;
- [x] snapshot historique adresse/ICE/IF ;
- [x] prestations apprises après finalisation ;
- [x] dernier PU HT / TVA / unité ;
- [x] déduplication casse/accents/espaces ;
- [x] backup v2 + restore v1 compatible.

Gates :

- [ ] créer/retrouver client runtime ;
- [ ] snapshot inchangé après modification ;
- [ ] prestation retrouvée après finalisation ;
- [ ] fréquence/déduplication runtime ;
- [ ] backup v2 réel ;
- [ ] restore v1 réel ;
- [ ] revue mobile 390/430/768.

---

# LOT 3 — PDF Original

**État : RUNTIME RENDU, fidélité à polir**

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

Référence source principale : 10 × 800, HT 8 000, TVA 1 600, TTC 9 600.

Gates :

- [x] génération jsPDF sur les blobs produit désormais au HEAD ;
- [x] rendu PNG du PDF généré à 180 dpi ;
- [x] comparaison finale source → généré effectuée ;
- [ ] test multi-page réel ;
- [ ] tests/build HEAD exact final ;
- [ ] score officiel Original >= 9,5/10.

**Score runtime actuel Original : 9,3/10.** Logo présent, montants/table/footer propres. Reste à réduire les écarts de taille du logo, typographie/espacements et à conserver l'absence de fausse signature manuscrite.

---

# LOT 4 — PDF Premium

**État : RUNTIME RENDU, finition à polir**

Références : `docs/PDF_RUNTIME_CERTIFICATION.md`, `docs/PDF_PREMIUM_VALIDATION.md`.

- [x] second template Premium ;
- [x] hiérarchie document/société/date ;
- [x] snapshot client adresse/ICE/IF ;
- [x] remise ligne visible sous désignation ;
- [x] remise globale séparée ;
- [x] résumé HT/TVA/TTC dynamique ;
- [x] footer légal structuré ;
- [x] aperçu HTML aligné sur les mêmes règles.

Runtime inspecté : cas normal TTC 9 600 et cas stress remise ligne 10 % + remise globale 5 %, HT 6 840, TVA 1 368, TTC 8 208. Aucun chevauchement observé. Les espaces monétaires sont corrigés dans Helvetica.

Gates :

- [x] rendu jsPDF sur les blobs produit désormais au HEAD ;
- [ ] multi-page réel ;
- [ ] partage/téléchargement/impression navigateur réel ;
- [ ] revue aperçu 390/430/768 ;
- [ ] tests/build exact HEAD final ;
- [ ] score officiel Premium >= 9,5/10.

**Score runtime actuel Premium : 9,4/10.** Reste surtout la finition des headers et la densité verticale.

---

# LOT 5 — Certification finale mobile / PWA

**État : CANDIDAT INSTALLABILITÉ + AUTOSAVE, appareil réel à certifier**

Assets installables iOS/Android et branchement manifest présents. `public/mobile-install-notes.md` décrit les preuves d'installabilité statiques.

Autosave brouillon **implémenté** : debounce 800 ms, annulation avant Enregistrer/Finaliser et garde stale-finalized via `saveDocument`. Le code a passé TypeScript/build dans le run `32956883264`, mais le comportement navigateur fermeture/réouverture reste à observer.

- [ ] E0 stockage vierge → onboarding → réouverture ;
- [ ] parcours document complet ;
- [ ] finalisation + réouverture ;
- [ ] historique/lifecycle réel ;
- [ ] gates LOT1 ;
- [ ] gates LOT2 ;
- [x] PDF Original runtime ;
- [x] PDF Premium runtime ;
- [ ] 390 / 430 / 768 ;
- [ ] zéro overflow ;
- [ ] contrôles critiques >=44 px ;
- [ ] offline ;
- [ ] backup / restore ;
- [ ] partage PDF iOS/Android ;
- [ ] un seul run GitHub Actions final si utile ;
- [ ] human gate ;
- [ ] merge uniquement après preuves.

---

# NEXT EXACT

1. Audit/certification runtime 390 / 430 / 768 et parcours E0→E6.
2. Certifier autosave par fermeture/réouverture et vérifier zéro perte.
3. Gates runtime LOT1 / LOT2 / backup / offline.
4. PDF : test multi-page + partage réel + micro-polish Original 9,3→9,5 et Premium 9,4→9,5.
5. Un seul run Actions final exact HEAD après ces derniers changements.
6. Human gate → merge.

## Avancement mécanique

**68 critères implémentés/observés sur 116 = 58,6 %.**

## Définition de DONE

Le chantier est DONE uniquement quand : onboarding fiable, moteur métier prouvé, données restaurables, mobile 390/430/768 propre, Original/Premium >=9,5 avec rendu runtime, parcours téléphone complet, un run final exact HEAD et validation humaine avant merge. Aucun Vercel sans autorisation explicite.
