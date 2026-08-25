# Facture PWA — HANDOVER CANONIQUE

Date : 25 août 2026

## À lire dans une nouvelle fenêtre

1. `docs/HANDOVER.md`
2. `docs/ROADMAP.md`
3. `docs/E0_ONBOARDING.md`
4. `docs/UI_V1_MOBILE_SPEC.md`
5. `docs/mockups/MOCKUPS_LOCK.md`

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

## LOT 1 — moteur métier

**CANDIDAT TECHNIQUE, runtime non certifié.**

Implémenté : brouillon sans numéro, séquences atomiques par type/année, préfixes, numéro irréversible, lifecycle, validations, remises, arrondis, conversion tracée, migration legacy, stale draft et double-finalisation protégés.

Gates ouvertes : `001→002`, annulation puis `003`, séquences indépendantes, reset annuel, double tap, stale draft, migration legacy, tests/build HEAD exact.

## LOT 2 — Clients & catalogue rapide

**CANDIDAT TECHNIQUE, runtime non certifié.**

### Stockage

IndexedDB est maintenant en **DB v3** avec :

- `documents`
- `settings`
- `counters`
- `clients`
- `catalog`

### Clients

`ClientProfile` contient :

- nom ;
- société ;
- adresse ;
- ICE ;
- IF ;
- téléphone ;
- email ;
- usageCount ;
- timestamps.

Dans E3 :

- saisie client avec suggestions locales ;
- recherche par nom / société / ICE / téléphone ;
- fiche client rapide en bottom sheet ;
- sélection en un tap ;
- édition d’une fiche existante ;
- déduplication insensible à casse, accents et espaces.

### Snapshot client historique

Le document conserve :

- `clientId`
- `clientAddress`
- `clientIce`
- `clientIfNumber`

Ces données sont copiées au moment de la sélection et restent dans le document. Une modification future de la fiche client ne doit donc pas modifier l’historique du document finalisé.

### Catalogue

Après **finalisation réussie uniquement**, l’app apprend les lignes utilisées :

- désignation ;
- unité ;
- dernier PU HT ;
- dernière TVA ;
- fréquence d’utilisation.

Dans E3 :

- bloc « Prestations fréquentes » ;
- tap pour insérer une prestation ;
- suggestions pendant la saisie ;
- sélection d’une suggestion remplit désignation + unité + PU + TVA.

La mémoire LOT2 est un confort non critique : une erreur de mémorisation ne peut jamais annuler une finalisation déjà réussie.

### Backup

Backup JSON passé en **version 2** :

- documents ;
- société ;
- clients ;
- catalogue.

Les backups version 1 restent acceptés. Leur restauration crée simplement clients/catalogue vides.

### Gates LOT2 ouvertes

- créer puis retrouver une fiche client ;
- vérifier snapshot inchangé après modification de la fiche ;
- finaliser une prestation puis la retrouver avec PU/TVA/unité ;
- vérifier fréquence et déduplication ;
- export/restore backup v2 ;
- restore backup v1 ;
- 390/430/768 sans overflow ;
- tests/build HEAD exact.

## PDF

Original et Premium existent mais restent non certifiés >=9,5.

Prochaine correction : exploiter les snapshots client adresse/ICE/IF et présenter proprement les remises, puis comparer Original aux références fournies.

## CI

Workflow Actions = `workflow_dispatch` uniquement. Ne pas lancer de run intermédiaire. Garder un run final utile quand le candidat complet est prêt.

## NEXT EXACT

**LOT 3 — PDF Original : fidélité source + snapshot client + remises.**

Puis :

1. LOT4 PDF Premium ;
2. audit 390/430/768 ;
3. gates runtime LOT1 + LOT2 ;
4. backup/offline/installation/partage appareils réels ;
5. un run Actions final si utile ;
6. human gate puis merge.

## Prompt de reprise

`Reprends Facture PWA depuis docs/HANDOVER.md et docs/ROADMAP.md sur m0/pwa-foundation. LOT1 et LOT2 sont candidats techniques non certifiés runtime. NEXT EXACT = LOT3 PDF Original, fidélité aux sources + snapshot client + remises. Respecte les mockups. Aucun run GitHub Actions inutile et aucun Vercel sans autorisation.`
