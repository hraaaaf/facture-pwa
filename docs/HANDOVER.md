# Facture PWA — HANDOVER CANONIQUE

Date : 26 août 2026

## Reprise

Lire dans cet ordre :

1. `docs/HANDOVER.md`
2. `docs/ROADMAP.md`
3. `docs/PDF_ORIGINAL_REFERENCE.md`
4. `docs/PDF_ORIGINAL_GEOMETRY.md`
5. `docs/PDF_PREMIUM_VALIDATION.md`
6. `docs/UI_V1_MOBILE_SPEC.md`
7. `docs/mockups/MOCKUPS_LOCK.md`
8. `docs/VISUAL_POLISH_V1.md`

## Goal

PWA mobile-first Devis / Factures / BL / BC, très simple en surface, local-first, avec numérotation robuste, mémoire clients/catalogue et PDF Original/Premium.

## Repo

- repository : `hraaaaf/facture-pwa`
- branche : `m0/pwa-foundation`
- PR : `#1 — M0 — Fondation PWA facturation`
- base : `main`
- aucun merge avant preuves
- GitHub Actions manuel uniquement et à économiser
- aucun Vercel sans autorisation explicite

## Avancement global

Roadmap canonique actuelle : **62 critères implémentés/observés sur 116 critères et gates = 53,4 %**.

Ce pourcentage est mécanique, calculé depuis les checkboxes de `docs/ROADMAP.md`. Il ne transforme pas un lot candidat en lot certifié.

## UI

E0 → E6 candidats fonctionnels. Visual Polish V1 : **9,2/10 candidat**, non certifié runtime 390/430/768.

## LOT 1 — moteur métier

**CANDIDAT TECHNIQUE, runtime non certifié.**

Implémenté : brouillon sans numéro, séquences type+année, préfixes, finalisation atomique, numéro irréversible, lifecycle, validations, remises, arrondis, conversions tracées.

Reste : `001→002→annulation→003`, séquences indépendantes, reset annuel, double tap, stale draft, migration legacy, tests/build exact HEAD.

## LOT 2 — Clients & catalogue

**CANDIDAT TECHNIQUE, runtime non certifié.**

DB v3, clients réutilisables, autocomplétion, snapshot adresse/ICE/IF, catalogue appris après finalisation, dernier PU/TVA/unité, backup v2 + restore v1.

Reste : preuves runtime client/snapshot/catalogue/déduplication/backup et revue mobile.

## LOT 3 — PDF Original

**CANDIDAT GÉOMÉTRIQUE FORT, runtime jsPDF exact HEAD non certifié.**

Sources utilisateur vérifiées :

- facture `#0107-2026` : 10 × 800, HT 8 000, TVA 1 600, TTC 9 600 ;
- BL détaillé `#0107-2026` avec prix/totaux ;
- BL simple `#06-07-2026` sans client visible et sans prix.

Code : géométrie source-like, tableau et totals dans le même cadre, BL simple 3 colonnes placé plus bas, snapshot client conditionnel, remises, footer légal structuré, aucune signature manuscrite fabriquée.

### Blocage exact

Le runtime local n'a pas les dépendances npm disponibles. Les tentatives de récupération réseau ont échoué/bloqué. Après deux stratégies réseau similaires, le chantier a changé de voie conformément à la règle d'exécution. **Aucun GitHub Action n'a été consommé pour contourner ce blocage.**

La gate restante est donc : exécuter le jsPDF du HEAD réel dès qu'un runtime avec dépendances est disponible, rendre en PNG et comparer définitivement aux sources.

## LOT 4 — PDF Premium

**CANDIDAT TECHNIQUE + ORACLE VISUEL, runtime jsPDF non certifié.**

Derniers changements :

- footer Original/Premium dérivé directement des champs légaux structurés ;
- snapshot client adresse/ICE/IF dans Premium ;
- remise ligne visible sous désignation ;
- remise globale distincte ;
- résumé dynamique HT/TVA/TTC ;
- aperçu HTML aligné sur le PDF ;
- fond/footer Premium gérés sur pages AutoTable supplémentaires.

Oracle visuel indépendant inspecté :

- cas normal : TTC 9 600 ;
- cas stress : remise ligne 10 %, remise globale 5 %, HT 6 840, TVA 1 368, TTC 8 208, snapshot client visible ;
- aucun chevauchement observé sur ces deux cas.

**Score oracle Premium : 9,4/10 candidat.** Ce n'est pas le score final runtime.

Référence : `docs/PDF_PREMIUM_VALIDATION.md`.

## NEXT EXACT

Le blocage jsPDF ne doit pas immobiliser le chantier.

1. Audit mobile/runtime E0→E6 en 390 / 430 / 768 dès qu'un navigateur app peut être exécuté.
2. Gates runtime LOT1 / LOT2 / backup / offline indépendantes.
3. Dès qu'un runtime npm/jsPDF est disponible : Original + Premium exact HEAD → PNG → comparaison → corrections → score >=9,5.
4. Un seul run GitHub Actions final si réellement nécessaire.
5. Human gate → merge.

## Prompt de reprise

`Reprends Facture PWA depuis docs/HANDOVER.md et docs/ROADMAP.md sur m0/pwa-foundation. Avancement checklist 62/116 = 53,4 %. LOT1/2 candidats techniques non certifiés. LOT3 candidat géométrique fort mais rendu jsPDF exact HEAD bloqué par dépendances/réseau local. LOT4 candidat technique + oracle visuel 9,4. Continue tout travail indépendant avant d'envisager un unique run Actions final. Aucun Vercel sans autorisation.`
