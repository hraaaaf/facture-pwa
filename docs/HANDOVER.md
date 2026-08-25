# Facture PWA — HANDOVER CANONIQUE

Date : 25 août 2026

## À lire dans une nouvelle fenêtre

1. `docs/HANDOVER.md`
2. `docs/ROADMAP.md`
3. `docs/E0_ONBOARDING.md`
4. `docs/UI_V1_MOBILE_SPEC.md`
5. `docs/mockups/MOCKUPS_LOCK.md`

## Projet

PWA mobile-first de création de Devis, Factures, BL et BC. Surface très simple, moteur local robuste, PDF Original/Premium.

- repo : `hraaaaf/facture-pwa`
- branche : `m0/pwa-foundation`
- PR : `#1 — M0 — Fondation PWA facturation`
- base : `main`
- aucun merge tant que les gates ne sont pas prouvées.

## Contraintes verrouillées

- pas de Replit ;
- GitHub Actions manuel uniquement et à économiser ;
- aucun Vercel sans autorisation explicite ;
- mobile-first iPhone + Android ;
- mockup premium glassmorphism verrouillé ;
- preuves avant fermeture d’un lot.

## UI

**E0 → E6 sont candidats fonctionnels, non certifiés visuellement/runtime.**

### E0
Premier démarrage obligatoire : identité, adresse, TEL/FAX/email, ICE/IF/RC/Patente/CNSS, banque/RIB, logo, signature, TVA, PDF Original/Premium. `onboardingCompleted` est persistant.

### E1
Dashboard premium + récents + bottom nav `Accueil | + | Historique`.

### E2
Création Devis / Facture / BL / BC en un tap.

### E3
Éditeur mobile premium. LOT1 maintenant branché : brouillon sans numéro, remises, bouton Finaliser, document finalisé en lecture seule.

### E4
Aperçu PDF dans l’app, Original/Premium, partage, téléchargement, impression, Page X/Y. Visuel non encore certifié >=9,5.

### E5
Historique + recherche/filtres + duplication/conversion + statuts Brouillon/Finalisé/Payé/Annulé. Un finalisé n’est plus supprimable, il peut seulement être annulé. `Payé` est limité aux factures.

### E6
Réglages société complets + backup/restore + installation PWA + **préfixes de numérotation réellement branchés au moteur**.

## LOT 1 — moteur métier

**État : CANDIDAT TECHNIQUE, runtime non certifié.**

Implémenté :

- brouillon sans numéro définitif ;
- séquence indépendante par `type + année` ;
- IndexedDB passé en DB v2 avec store `counters` ;
- finalisation atomique : compteur + document final dans la même transaction ;
- format par défaut : `DEV/F/BL/BC-AAAA-NNN` ;
- préfixes configurables dans E6 ;
- numéro jamais réutilisé après finalisation/annulation ;
- suppression interdite après finalisation ;
- statuts `DRAFT / FINALIZED / PAID / CANCELLED` ;
- `PAID` réservé aux factures ;
- client, objet, date et désignation obligatoires à la finalisation ;
- quantité > 0 ; prix >= 0 ; TVA/remises 0..100 ;
- remise ligne % + remise globale % ;
- TVA calculée après remises ;
- arrondis déterministes à 2 décimales ;
- `sourceDocumentId` pour Devis → Facture / BL ;
- anciens documents numérotés migrés comme finalisés ;
- stale draft empêché d’écraser un document finalisé ;
- double finalisation empêchée avant consommation d’un nouveau numéro ;
- backup restaure les documents et reconstruit les compteurs depuis les numéros immuables ;
- tests purs ajoutés : facture référence, remises/multi-TVA, validations, numérotation, préfixes.

### Gates LOT1 encore ouvertes

- runtime `F-2026-001 → F-2026-002` ;
- annulation du 001 puis prochaine facture = 003 ;
- séquences indépendantes par type ;
- reset année ;
- double tap Finaliser = un seul numéro ;
- stale draft rejeté ;
- migration ancien document ;
- build TypeScript exact HEAD ;
- tests exact HEAD.

Ne pas fermer LOT1 définitivement avant ces preuves.

## Risques / reste produit

- autosave/recovery brouillon à ajouter ou certifier ;
- clients/catalogue absents ;
- les remises impactent correctement les totaux mais leur présentation explicite dans PDF Original/Premium reste à harmoniser ;
- PDF Original et Premium non certifiés visuellement ;
- audit 390/430/768 non fait ;
- backup/offline/installation/partage non certifiés sur appareils réels.

## NEXT EXACT

**LOT 2 — Clients & catalogue rapide.**

Ordre de construction :

1. clients réutilisables + autocomplétion ;
2. catalogue articles/prestations + dernier PU/TVA ;
3. PDF Original, fidélité + remises ;
4. PDF Premium, polish + remises ;
5. audit mobile E0→E6 ;
6. gates runtime LOT1 + PWA/offline/backup/partage ;
7. un seul run GitHub Actions final si utile ;
8. human gate puis merge.

## Prompt de reprise

`Reprends Facture PWA depuis docs/HANDOVER.md et docs/ROADMAP.md sur m0/pwa-foundation. LOT1 est candidat technique mais non certifié runtime. NEXT EXACT = LOT2 Clients & catalogue. Respecte les mockups, n’utilise pas d’Action GitHub inutilement et aucun Vercel sans autorisation.`
