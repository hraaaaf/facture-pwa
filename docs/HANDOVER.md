# Facture PWA — HANDOVER CANONIQUE

Date : 26 août 2026

## À lire dans une nouvelle fenêtre

1. `docs/HANDOVER.md`
2. `docs/ROADMAP.md`
3. `docs/PDF_ORIGINAL_REFERENCE.md`
4. `docs/E0_ONBOARDING.md`
5. `docs/UI_V1_MOBILE_SPEC.md`
6. `docs/mockups/MOCKUPS_LOCK.md`
7. `docs/VISUAL_POLISH_V1.md`

## Projet

PWA mobile-first Devis / Factures / BL / BC, destinée à rester très simple en surface avec moteur local robuste.

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

**ACTIF. Référence source verrouillée.**

Lire `docs/PDF_ORIGINAL_REFERENCE.md`.

### Données réellement supportées par les PDF fournis

Société :
- Benmoussa Rachid ;
- TAPISTOR SABRE ;
- adresse `484, Cit Amal 5, 040 163, MASSIRA, CYM, RABAT` ;
- RC `82972 RABAT` ;
- Patente `26450045` ;
- CNSS `7121982` ;
- ICE `001806241000086` ;
- IF `35789182` ;
- RIB `181 810 21211 52654410108 03`.

TEL / FAX / email / banque ne sont pas présents dans les références et restent vides dans le fixture.

Cas source principal :
- Facture / BL détaillé `#0107-2026` ;
- date `06 Juillet 2026` ;
- client `SECRÉTARIAT D’ETAT CHARGÉ DE L’ARTISANAT ET DE L’ECONOMIE SOCIALE ET SOLIDAIRE` ;
- objet source conservé tel quel dans la fixture ;
- `Capitonnage de porte en similicuir` + `70cm/200cm` ;
- unité Pièce ; quantité 10 ; PU HT 800 ; TVA 20 % ; HT 8000 ; TVA 1600 ; TTC 9600.

BL simple : `#06-07-2026`, mêmes données non financières, sans colonnes prix ni totaux.

### Fixture

`src/referenceFixture.ts` contient ces cas et **n’est jamais injecté automatiquement dans IndexedDB**. Il sert uniquement aux tests et à la comparaison PDF.

Les tests purs utilisent désormais ce fixture pour ancrer le calcul `8000 / 1600 / 9600`.

### Logo temporaire

`src/brand.ts` contient un logo fictif temporaire : fond vert + canapé stylisé + initiales `TS`.

`defaultCompany.logoDataUrl` l’utilise tant que le vrai logo n’est pas chargé via E0/E6.

Ce logo n’est pas un actif de marque officiel et devra être remplacé dès que le vrai fichier est disponible.

### NEXT LOT3

1. rapprocher géométriquement le PDF Original de la référence ;
2. présenter correctement les remises quand elles existent ;
3. intégrer snapshot client quand disponible sans casser la fidélité source ;
4. générer le fixture source ;
5. render source et généré en PNG ;
6. comparer et corriger jusqu’à score >=9,5.

## PDF Premium

Existe techniquement, non certifié >=9,5. LOT4 après fermeture visuelle de LOT3.

## CI

Workflow Actions = `workflow_dispatch` uniquement. Ne pas lancer de run intermédiaire. Garder un run final utile quand le candidat complet est prêt.

## NEXT EXACT

**LOT 3 — PDF Original : géométrie/fidélité à la source verrouillée.**

Puis :

1. LOT4 PDF Premium ;
2. audit 390/430/768 ;
3. gates runtime LOT1 + LOT2 ;
4. backup/offline/installation/partage appareils réels ;
5. un run Actions final si utile ;
6. human gate puis merge.

## Prompt de reprise

`Reprends Facture PWA depuis docs/HANDOVER.md, docs/ROADMAP.md et docs/PDF_ORIGINAL_REFERENCE.md sur m0/pwa-foundation. LOT1/LOT2 sont candidats techniques non certifiés runtime. LOT3 est actif : reproduire le PDF Original à partir du fixture source exact dans src/referenceFixture.ts. Logo TS temporaire seulement. Aucun run GitHub Actions inutile et aucun Vercel sans autorisation.`
