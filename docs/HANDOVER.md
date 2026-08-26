# Facture PWA — HANDOVER CANONIQUE

Date : 26 août 2026

## À lire dans une nouvelle fenêtre

1. `docs/HANDOVER.md`
2. `docs/ROADMAP.md`
3. `docs/PDF_ORIGINAL_REFERENCE.md`
4. `docs/PDF_ORIGINAL_GEOMETRY.md`
5. `docs/E0_ONBOARDING.md`
6. `docs/UI_V1_MOBILE_SPEC.md`
7. `docs/mockups/MOCKUPS_LOCK.md`
8. `docs/VISUAL_POLISH_V1.md`

## Projet

PWA mobile-first Devis / Factures / BL / BC, très simple en surface avec moteur local robuste.

- repo : `hraaaaf/facture-pwa`
- branche : `m0/pwa-foundation`
- PR : `#1 — M0 — Fondation PWA facturation`
- base : `main`
- aucun merge avant preuves.

## Contraintes

- GitHub Actions manuel uniquement et à économiser ;
- aucun Vercel sans autorisation explicite ;
- mobile-first iPhone + Android ;
- mockup glassmorphism verrouillé ;
- cibles tactiles >=44 px ;
- preuves avant fermeture définitive d’un lot.

## UI E0 → E6

Tous sont candidats fonctionnels, non certifiés runtime/visuellement.

- **E0** : onboarding société 5 étapes.
- **E1** : dashboard + bottom nav `Accueil | + | Historique`.
- **E2** : Devis / Facture / BL / BC en un tap.
- **E3** : éditeur + moteur LOT1 + mémoire LOT2.
- **E4** : aperçu PDF Original/Premium, partage, téléchargement, impression.
- **E5** : historique + lifecycle Brouillon/Finalisé/Payé/Annulé.
- **E6** : identité société, backup, PWA, préfixes de numérotation.

## Visual Polish V1

Candidat visuel à **9,2/10**, non certifié runtime.

Couche `src/polish.css` : profondeur glass renforcée, bottom bar / FAB retravaillés, cartes / éditeur / historique / réglages harmonisés. Score officiel uniquement après 390/430/768 réels.

## LOT 1 — moteur métier

**CANDIDAT TECHNIQUE, runtime non certifié.**

Implémenté : brouillon sans numéro, séquences atomiques par type/année, préfixes, numéro irréversible, lifecycle, validations, remises, arrondis, conversion tracée, migration legacy, stale draft et double-finalisation protégés.

Gates ouvertes : `001→002`, annulation puis `003`, séquences indépendantes, reset annuel, double tap, stale draft, migration legacy, tests/build HEAD exact.

## LOT 2 — Clients & catalogue rapide

**CANDIDAT TECHNIQUE, runtime non certifié.**

IndexedDB DB v3 avec `clients` + `catalog`.

Clients : fiche locale, autocomplétion, bottom sheet rapide, snapshot historique `clientAddress/clientIce/clientIfNumber`.

Catalogue : apprentissage après finalisation uniquement, prestations fréquentes, dernier PU HT / TVA / unité, déduplication insensible à casse/accents/espaces.

Backup JSON v2 inclut documents + société + clients + catalogue. Restore v1 reste accepté.

## LOT 3 — PDF Original

**CANDIDAT GÉOMÉTRIQUE, rendu jsPDF exact-head non certifié.**

Sources :
- `docs/PDF_ORIGINAL_REFERENCE.md`
- `docs/PDF_ORIGINAL_GEOMETRY.md`
- `src/referenceFixture.ts`

### Données source verrouillées

Société : Benmoussa Rachid / TAPISTOR SABRE, adresse, RC, Patente, CNSS, ICE, IF, RIB. TEL / FAX / email / banque restent vides car absents des références.

Cas principal :
- Facture / BL détaillé `#0107-2026` ;
- `06 Juillet 2026` ;
- client Secrétariat d’État ;
- objet et désignation conservés depuis la source ;
- Pièce × 10 ; PU HT 800 ; TVA 20 % ; HT 8000 ; TVA 1600 ; TTC 9600.

BL simple : `#06-07-2026`, **aucun client visible dans la source**, tableau 3 colonnes, aucun prix/totaux/montant en lettres.

### Ce qui vient d’être implémenté dans `src/pdf.ts`

- en-tête Original repositionné selon la référence ;
- titre/numéro à gauche ;
- société/logo/date à droite ;
- objet gras + souligné ;
- snapshot client ajouté seulement quand il existe ;
- tableau tarifé avec colonnes source verrouillées ;
- zone `TOTAL HT / TVA / TOTAL TTC` intégrée dans le même grand cadre ;
- BL simple avec grand espace vertical et tableau démarrant vers 118 mm ;
- footer rapproché de la source ;
- `Page X / Y` masqué sur Original une page et conservé en multi-page ;
- remises prévues uniquement quand utilisées ;
- aucune signature manuscrite fabriquée : seule une vraie signature chargée dans E0/E6 peut être affichée.

### Logo temporaire

`src/brand.ts` contient un logo fictif temporaire vert + canapé stylisé + `TS`. `defaultCompany.logoDataUrl` l’utilise tant que le vrai logo n’est pas chargé. Ce n’est pas un actif officiel.

### Preuve disponible

Une prévisualisation géométrique indépendante a été rendue localement pour comparer les positions A4. Elle sert de contrôle de mise en page, **pas de certification du jsPDF runtime**.

### Gates LOT3 encore ouvertes

1. corriger les derniers micro-écarts de rendu ;
2. générer réellement les fixtures avec le moteur jsPDF exact HEAD ;
3. rendre les PDF générés en PNG ;
4. comparer source → généré ;
5. vérifier remises + snapshot client ;
6. vérifier multi-page ;
7. build/tests exact HEAD ;
8. score Original >= 9,5/10.

## PDF Premium

Existe techniquement, non certifié >=9,5. LOT4 après fermeture visuelle de LOT3.

## CI

Workflow Actions = `workflow_dispatch` uniquement. Ne pas lancer de run intermédiaire. Garder un run final utile quand le candidat complet est prêt.

## NEXT EXACT

**LOT 3 — rendre réellement le PDF Original jsPDF exact HEAD et faire la comparaison source → généré.**

Puis :

1. corrections LOT3 jusqu’à >=9,5 ;
2. LOT4 PDF Premium ;
3. audit 390/430/768 ;
4. gates runtime LOT1 + LOT2 ;
5. backup/offline/installation/partage appareils réels ;
6. un run Actions final si utile ;
7. human gate puis merge.

## Prompt de reprise

`Reprends Facture PWA depuis docs/HANDOVER.md, docs/ROADMAP.md, docs/PDF_ORIGINAL_REFERENCE.md et docs/PDF_ORIGINAL_GEOMETRY.md sur m0/pwa-foundation. LOT3 est candidat géométrique mais non certifié jsPDF runtime. NEXT EXACT = générer les fixtures Original exact HEAD, rendre en PNG et comparer aux sources. Logo TS temporaire seulement. Aucun run GitHub Actions inutile et aucun Vercel sans autorisation.`
