# Facture PWA — HANDOVER CANONIQUE

Date : 26 août 2026

## Reprise

Lire dans cet ordre :

1. `docs/HANDOVER.md`
2. `docs/ROADMAP.md`
3. `docs/PDF_RUNTIME_CERTIFICATION.md`
4. `docs/PDF_ORIGINAL_REFERENCE.md`
5. `docs/PDF_ORIGINAL_GEOMETRY.md`
6. `docs/PDF_PREMIUM_VALIDATION.md`
7. `docs/UI_V1_MOBILE_SPEC.md`
8. `docs/mockups/MOCKUPS_LOCK.md`
9. `docs/VISUAL_POLISH_V1.md`
10. `public/mobile-install-notes.md`

## Goal

PWA mobile-first Devis / Factures / BL / BC, très simple en surface, local-first, avec numérotation robuste, mémoire clients/catalogue, autosave et PDF Original/Premium.

## Repo

- repository : `hraaaaf/facture-pwa`
- branche : `m0/pwa-foundation`
- PR : `#1 — M0 — Fondation PWA facturation`
- base : `main`
- aucun merge avant preuves
- GitHub Actions revenu en `workflow_dispatch` manuel
- aucun Vercel sans autorisation explicite

## Avancement global

**68 critères implémentés/observés sur 116 = 58,6 %.**

Pourcentage mécanique depuis `docs/ROADMAP.md`. Il ne signifie pas DONE.

## Bypass runtime — preuve clé

Le runtime local reste incapable de résoudre `github.com`, mais ce blocage n'immobilise plus le chantier.

GitHub Actions a servi une fois comme runtime de preuve utile :

- run : `32956883264`
- job : `98140389945`
- 13/13 tests ✅
- `tsc -b && vite build` ✅
- manifest + service worker PWA ✅
- 5 PDF runtime générés ✅
- artifact : `9602313604 — exact-head-pdfs-fixed`
- commit produit vérifié : `b818ee14b35e54749fa8370971aea89945b8044f`

Le job apparaît rouge uniquement parce que l'étape finale de push a essayé de modifier `.github/workflows/ci.yml` avec un `GITHUB_TOKEN` sans permission `workflows`. Les étapes produit, tests, build et artifact sont vertes. Le commit `b818ee14…` a ensuite été matérialisé comme HEAD de la PR ; les commits suivants sont documentaires.

Référence canonique : `docs/PDF_RUNTIME_CERTIFICATION.md`.

## UI

E0 → E6 candidats. Visual Polish V1 : **9,2/10 candidat**. Vraies captures runtime 390/430/768 encore ouvertes.

## LOT 1 — moteur métier

**CANDIDAT TECHNIQUE, parcours runtime restant.**

Implémenté : brouillon sans numéro, séquences type+année, finalisation atomique, lifecycle, validations, remises/TVA/arrondis, conversions tracées.

Nouveau durcissement dans le commit produit testé :

- suppression brouillon atomique dans une seule transaction IndexedDB (`get` → contrôle `DRAFT` → `delete`).

Reste : `001→002→annulation→003`, séquences indépendantes, reset annuel, double tap, stale draft, migration legacy, certification finale exact HEAD.

## LOT 2 — clients & catalogue

**CANDIDAT TECHNIQUE, runtime non certifié.**

DB v3, clients réutilisables, autocomplete, snapshot adresse/ICE/IF, catalogue appris après finalisation, dernier PU/TVA/unité, backup v2 + restore v1.

Reste : preuves runtime client/snapshot/catalogue/déduplication/backup et revue mobile.

## LOT 3 — PDF Original

**RUNTIME RENDU — 9,3/10.**

Preuves : facture, BL détaillé et BL simple générés par jsPDF dans le runner, récupérés depuis l'artifact puis rendus PNG à 180 dpi et inspectés contre les PDF source.

Corrections visibles : logo source présent, montants propres, tableau/footer sans chevauchement.

Reste vers 9,5 : taille du logo, micro-écarts typo/espacements, test multi-page. Aucune fausse signature manuscrite n'est fabriquée.

## LOT 4 — PDF Premium

**RUNTIME RENDU — 9,4/10.**

Cas normal : TTC 9 600. Cas stress : remise ligne 10 %, remise globale 5 %, HT 6 840, TVA 1 368, TTC 8 208. Aucun chevauchement observé. Les espaces monétaires Helvetica sont corrigés.

Reste vers 9,5 : finition headers/densité, multi-page réel, partage/téléchargement/impression navigateur/appareil.

## LOT 5 — PWA / mobile

**CANDIDAT INSTALLABILITÉ + AUTOSAVE, appareil réel non certifié.**

Présent : icônes 180/192/512, manifest/iOS, test PWA, service worker buildé.

Autosave désormais implémenté et compilé : debounce 800 ms, annulation avant Enregistrer/Finaliser, stale-finalized protégé par `saveDocument`. Reste à observer fermeture/réouverture et récupération réelle.

## NEXT EXACT

1. Audit runtime 390 / 430 / 768 + parcours E0→E6.
2. Certifier autosave fermeture/réouverture.
3. Gates LOT1 / LOT2 / backup / offline.
4. PDF multi-page + partage réel + polish Original 9,3→9,5 / Premium 9,4→9,5.
5. Un seul run final exact HEAD après les derniers changements.
6. Human gate → merge.

## Prompt de reprise

`Reprends Facture PWA depuis docs/HANDOVER.md et docs/ROADMAP.md sur m0/pwa-foundation. Avancement 68/116 = 58,6 %. Le blocage DNS local a été bypassé : run 32956883264, 13/13 tests + build + 5 PDF artifact 9602313604. Commit produit testé b818ee14… ; docs après. Original runtime 9,3, Premium runtime 9,4. Autosave 800 ms et suppression brouillon atomique implémentés/compilés. Next : 390/430/768 + runtime E0→E6 + LOT1/2/backup/offline + multi-page/partage + polish PDF >=9,5. Workflow revenu manuel. Aucun Vercel sans autorisation.`
