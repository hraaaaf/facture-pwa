# Facture PWA — Roadmap canonique

Dernière mise à jour : 26 août 2026

> Ordre de reprise : `docs/HANDOVER.md` → ce fichier → `docs/PDF_ORIGINAL_REFERENCE.md` → `docs/PDF_ORIGINAL_GEOMETRY.md` → `docs/PDF_PREMIUM_VALIDATION.md` → `docs/UI_V1_MOBILE_SPEC.md` → `docs/mockups/MOCKUPS_LOCK.md`.

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

**État : CANDIDAT, non certifié runtime**

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

Preuve statique PWA supplémentaire : `tests/pwa.test.ts` vérifie signature/dimensions PNG et références `index.html` / `vite.config.ts`. Le test n'est pas déclaré passé tant qu'un runtime npm n'a pas exécuté Vitest.

Gates :

- [ ] `npm test` HEAD exact ;
- [ ] `npm run build` HEAD exact ;
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

**État : CANDIDAT TECHNIQUE, runtime non certifié**

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

Gates :

- [ ] `001 → 002` runtime ;
- [ ] annulation puis `003` ;
- [ ] séquences Devis/Facture/BL/BC indépendantes ;
- [ ] reset annuel ;
- [ ] double tap Finaliser ;
- [ ] stale draft ;
- [ ] migration legacy ;
- [ ] tests/build HEAD exact.

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

**État : CANDIDAT GÉOMÉTRIQUE FORT, jsPDF exact-head non certifié**

Sources : `docs/PDF_ORIGINAL_REFERENCE.md`, `docs/PDF_ORIGINAL_GEOMETRY.md`, `src/referenceFixture.ts`.

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

Référence source principale : 10 × 800, HT 8 000, TVA 1 600, TTC 9 600. Les PDF source montrent bien cette structure et ces montants.

Gates :

- [ ] génération jsPDF exact HEAD ;
- [ ] rendu PNG du PDF généré ;
- [ ] comparaison finale source → généré ;
- [ ] test multi-page réel ;
- [ ] tests/build HEAD exact ;
- [ ] score officiel Original >= 9,5/10.

Blocage de preuve actuel : dépendances npm non présentes localement et accès réseau de récupération indisponible. Aucun run GitHub Action n'est consommé pour contourner ce point.

---

# LOT 4 — PDF Premium

**État : CANDIDAT TECHNIQUE + ORACLE VISUEL, runtime jsPDF non certifié**

Référence : `docs/PDF_PREMIUM_VALIDATION.md`.

- [x] second template Premium ;
- [x] hiérarchie document/société/date ;
- [x] snapshot client adresse/ICE/IF ;
- [x] remise ligne visible sous désignation ;
- [x] remise globale séparée ;
- [x] résumé HT/TVA/TTC dynamique ;
- [x] footer légal structuré ;
- [x] aperçu HTML aligné sur les mêmes règles.

Deux oracles indépendants ont été inspectés : cas normal 9 600 TTC et cas stress remises/snapshot 8 208 TTC. Aucun chevauchement observé sur ces deux compositions.

**Score oracle visuel : 9,4/10 candidat.**

Gates :

- [ ] rendu jsPDF exact HEAD ;
- [ ] multi-page réel ;
- [ ] partage/téléchargement/impression navigateur réel ;
- [ ] revue aperçu 390/430/768 ;
- [ ] tests/build exact HEAD ;
- [ ] score officiel Premium >= 9,5/10.

---

# LOT 5 — Certification finale mobile / PWA

**État : CANDIDAT INSTALLABILITÉ, runtime appareil à certifier**

Assets installables iOS/Android et branchement manifest présents. `public/mobile-install-notes.md` décrit exactement les preuves disponibles et les gates encore ouvertes.

Autosave/recovery reste ouvert : il ne sera pas poussé par réécriture complète d'`App.tsx` sans possibilité de build/test derrière.

- [ ] E0 stockage vierge → onboarding → réouverture ;
- [ ] parcours document complet ;
- [ ] finalisation + réouverture ;
- [ ] historique/lifecycle réel ;
- [ ] gates LOT1 ;
- [ ] gates LOT2 ;
- [ ] PDF Original runtime ;
- [ ] PDF Premium runtime ;
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

1. Dès qu'un runtime app/build est disponible : implémenter + tester autosave/recovery.
2. Audit/certification mobile 390 / 430 / 768 et parcours E0→E6.
3. Gates runtime LOT1 / LOT2 / backup / offline.
4. Dès qu'un runtime avec dépendances est disponible : rendre Original + Premium exact HEAD et fermer leurs gates visuelles.
5. Un seul run Actions final si nécessaire.
6. Human gate → merge.

## Définition de DONE

Le chantier est DONE uniquement quand : onboarding fiable, moteur métier prouvé, données restaurables, mobile 390/430/768 propre, Original/Premium >=9,5 avec rendu runtime, parcours téléphone complet, un run final si nécessaire et validation humaine avant merge. Aucun Vercel sans autorisation explicite.
