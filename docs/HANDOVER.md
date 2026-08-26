# Facture PWA — HANDOVER CANONIQUE

Date : 26 août 2026

## Reprise

Lire : `docs/HANDOVER.md` → `docs/ROADMAP.md` → `docs/MOBILE_RUNTIME_AUDIT.md` → `docs/PDF_RUNTIME_CERTIFICATION.md` → références PDF/UI.

## Goal

PWA mobile-first Devis / Factures / BL / BC, local-first, simple en surface, avec moteur métier robuste, mémoire clients/catalogue, autosave et PDF Original/Premium.

## Repo

- repository : `hraaaaf/facture-pwa`
- branche : `m0/pwa-foundation`
- PR : `#1 — M0 — Fondation PWA facturation`
- base : `main`
- produit tactile corrigé : `c4b7618ad0ab454f5d437c64b4495f1d49a6a75f`
- aucun merge avant human gate
- workflow lourd remis en `workflow_dispatch`
- aucun Vercel sans autorisation explicite

## Avancement global

**99 critères implémentés/observés sur 116 = 85,3 %.**

Le pourcentage est mécanique depuis `docs/ROADMAP.md`. Le chantier n'est pas DONE.

## Preuves principales

### Mobile/UI

Run `32959150633`, artifact `9603634672` :
- 24 captures E0→E6 en 390 / 430 / 768 ;
- 0 overflow ;
- 0 erreur page/console ;
- autosave récupéré après reload sur les 3 tailles ;
- aperçu E4 revu aux 3 tailles ;
- score UI runtime : **9,3/10**.

### PDF

Run `32956883264`, artifact `9602313604` :
- tests/build/PWA ;
- 5 PDF runtime ;
- Original **9,3/10** ;
- Premium **9,4/10**.

Runs ultérieurs avec jsPDF `4.2.1` + AutoTable `5.0.8` :
- `npm audit --omit=dev` : 0 vulnérabilité ;
- 15/15 tests sur `d03d38a...` ;
- build + manifest/SW ;
- Original multi-page : 4 pages propres ;
- Premium multi-page : 3 pages propres.

### Métier / backup / offline

Les runs `32963581880`, `32966380813`, `32973432147`, `32977943138` ont prouvé cumulativement :
- `F-2026-001 → 002 → annulation → 003` ;
- séquences Devis/Facture/BL/BC indépendantes ;
- reset annuel ;
- double finalisation sans trou ;
- réouverture d'un finalisé ;
- lifecycle PAYÉ/CANCELLED ;
- stale draft incapable d'écraser un finalisé ;
- création/recherche client, snapshot historique et catalogue appris ;
- dernier PU/TVA/unité ;
- déduplication canonique sans effacer adresse/ICE/IF ;
- backup v2 ;
- restore v1 + migration legacy ;
- restore v2 ;
- rejet d'un backup à numéro final dupliqué sans mutation ;
- reload offline via service worker.

Artifact ciblé : run `32977943138`, artifact `9610256507`.

## Correctif tactile final

BEFORE exact runtime, run `32977943138` :
- `.sheet-close` = `43,34 × 43,34 px` pendant l'animation.

Cause exacte :
- la cible CSS était 44 px ;
- le sheet entre avec `scale(.985)` ;
- `44 × .985 = 43,34`.

Correctif produit :
- commit `c4b7618ad0ab454f5d437c64b4495f1d49a6a75f`;
- `.sheet-close` = 45 px ;
- actions Historique `min-height` = 45 px.

Validation croisée Chromium indépendante :
- 390 / 430 / 768 : `.sheet-close` = **44,325 px** pendant `scale(.985)` ;
- actions Historique = **45 px**.

Le connecteur GitHub n'a pas déclenché un nouveau workflow sur ses propres écritures. La gate `tests/build HEAD exact final` reste donc ouverte malgré ce correctif CSS trivial.

## État par lot

- LOT0 : runtime web prouvé ; installation/reopen appareil réel + exact-head final ouverts.
- UI V1 : runtime audité, 9,3/10.
- LOT1 : moteur runtime prouvé ; exact-head final ouvert.
- LOT2 : runtime prouvé ; revue mobile dédiée suggestions/client sheet ouverte.
- LOT3 Original : multi-page prouvé, score 9,3 ; polish 9,5 ouvert.
- LOT4 Premium : multi-page + preview mobile prouvés, score 9,4 ; partage + polish 9,5 ouverts.
- LOT5 : backup/offline/parcours/tactile prouvés ; appareil réel, partage et run exact HEAD ouverts.

## NEXT EXACT

1. Déclencher manuellement **une seule** `Final Runtime Certification` sur le HEAD courant quand le run exact-head devient nécessaire.
2. Revue mobile dédiée suggestions/client sheet 390/430/768.
3. Partage/téléchargement/impression PDF réel + polish Original/Premium jusqu'à >=9,5.
4. Installation et fermeture/réouverture sur iPhone/Android réel.
5. Human gate.
6. Merge uniquement après preuves.

## Prompt de reprise

`Reprends Facture PWA depuis docs/HANDOVER.md et docs/ROADMAP.md. État vérifié : 99/116 = 85,3 %. Produit tactile corrigé c4b7618a… ; run 32977943138/artifact 9610256507 a prouvé backup v1/v2, déduplication, catalogue, rejet doublon et offline avant d'échouer uniquement sur sheet-close 43,34 px. Cause = animation scale(.985) sur 44 px ; correctif = 45 px, contre-preuve Chromium 44,325 px sur 390/430/768. Restent exact-head final, revue mobile client/suggestions, partage PDF réel, Original 9,3→9,5, Premium 9,4→9,5, appareil réel, human gate. Aucun Vercel sans autorisation.`
