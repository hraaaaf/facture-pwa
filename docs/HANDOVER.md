# Facture PWA — HANDOVER CANONIQUE

Date : 25 août 2026

## À lire en premier dans une nouvelle fenêtre

1. `docs/HANDOVER.md`
2. `docs/ROADMAP.md`
3. `docs/UI_V1_MOBILE_SPEC.md`
4. `docs/mockups/MOCKUPS_LOCK.md`

## Projet

PWA mobile-first de création de Devis, Factures, BL et BC, destinée à rester extrêmement simple en surface tout en ayant un moteur de calcul et une génération PDF robustes.

Repository : `hraaaaf/facture-pwa`
Branche active : `m0/pwa-foundation`
PR active : `#1 — M0 — Fondation PWA facturation`
Base : `main`

## Contraintes à respecter

- ne pas utiliser Replit ;
- GitHub Actions limités : workflow manuel seulement, éviter tout run inutile ;
- ne pas lancer Vercel sans autorisation explicite ;
- mobile-first iPhone + Android ;
- objectif visuel premium ;
- conserver l’app simple pour l’utilisateur final ;
- fournir des preuves avant de déclarer un lot fermé.

## Direction visuelle verrouillée

Le mockup validé sert de cible : glassmorphism, accent vert, surfaces claires/translucides, gros contrôles tactiles, bottom navigation `Accueil | + | Historique`, bouton + central flottant, safe areas iOS et aucune surcharge visible.

Mockup canonique : `docs/mockups/UI_V1_MASTER.jpg`
Règles de lock : `docs/mockups/MOCKUPS_LOCK.md`
Spec UI : `docs/UI_V1_MOBILE_SPEC.md`

## État produit au handover

### E0 Premier démarrage

CANDIDAT ✅ fonctionnel, non certifié visuellement.

Fresh install : l’application ne montre pas le dashboard tant que la société n’est pas configurée.

Parcours en 5 étapes :

1. identité : raison sociale, marque, logo ;
2. coordonnées : adresse, ville, téléphone, fax, email ;
3. identifiants : ICE, IF, RC, Patente, CNSS ;
4. banque : banque, RIB ;
5. documents : TVA par défaut, PDF Original/Premium, signature.

Règles : nom + adresse requis, TVA 0..100, `onboardingCompleted` persisté. Les anciennes installations déjà configurées sont migrées sans être rebloquées. Tous ces champs restent modifiables dans E6.

Les champs juridiques structurés régénèrent automatiquement `legalLine` pour préserver les PDF et la compatibilité des anciennes données.

### E1 Accueil

CANDIDAT ✅ : dashboard premium, recherche, cartes statistiques, récents, bottom nav glass et bouton +.

### E2 Nouveau document

CANDIDAT ✅ : bottom sheet Devis / Facture / BL / BC en un tap.

### E3 Éditeur

CANDIDAT ✅ côté UI et moteur de base.

Fonctionnel : client, objet, lignes, unité, quantité, PU HT, TVA, calculs live, BL avec/sans prix, montant en lettres, conversion Devis → Facture/BL, sauvegarde locale, bottom action bar.

Non production-grade : numérotation irréversible, statuts, remises, validations, autosave/recovery, traçabilité renforcée.

### E4 Aperçu / PDF

CANDIDAT ✅ fonctionnel : aperçu dans l’app, Original/Premium, modèle par défaut persistant, partage, téléchargement, impression, Page X/Y, métadonnées et overlay conservant le brouillon.

Aucun score 9,5 n’est certifié tant que les PDF n’ont pas été comparés visuellement aux références.

### E5 Historique

CANDIDAT ✅ : recherche, filtres, cartes premium, ouverture, duplication, Devis → Facture, Devis → BL, suppression confirmée.

Les statuts comptables n’ont volontairement pas été simulés.

### E6 Réglages

CANDIDAT ✅ fonctionnel, non certifié visuellement.

Implémenté : identité société structurée, adresse, ville, TEL, FAX, email, ICE, IF, RC, Patente, CNSS, banque, RIB, TVA, logo, signature, préférence PDF, compteur documents, export/restore JSON et installation PWA.

Décision importante : la configuration de numérotation n’est pas exposée comme un réglage cosmétique. Elle passe au LOT 1 et devra être réellement connectée à des séquences persistantes irréversibles.

## Moteur métier actuel

Déjà présent : Total ligne HT = quantité × PU HT, somme des lignes, TVA ligne par ligne, total HT/TVA/TTC, montant en lettres et conversions Devis → Facture / BL.

Risque connu : la numérotation repose encore sur le nombre de documents existants + 1. Une suppression peut entraîner une réutilisation future. Ne pas considérer cette numérotation comme production-grade.

Cible : brouillon sans numéro définitif, numéro réservé à finalisation, numéro final jamais réutilisé.

## Stockage / backup

IndexedDB reste la source locale.

Le backup contient version, date d’export, tous les documents et tous les réglages société structurés. La restauration refuse un format inconnu, valide les documents/lignes, normalise les réglages et remplace documents + société dans une transaction multi-store.

À certifier sur runtime réel : export → modification/suppression locale → restauration → réouverture.

## PDF

Deux familles : Original, fidèle aux documents source, et Premium, plus haut de gamme. Les deux moteurs existent mais restent à certifier visuellement >= 9,5.

## GitHub / CI

Workflow `.github/workflows/ci.yml` en `workflow_dispatch` uniquement. Ne pas multiplier les runs. Stratégie : un run final utile sur le candidat prêt à certifier.

Un ancien run rouge n’a exécuté aucune étape et n’a alloué aucun runner. Il ne prouve pas un échec produit.

## Gates avant merge

- E0 réel sur stockage vierge ;
- E0 ne réapparaît plus après validation/réouverture ;
- build/test sur HEAD exact ;
- screenshots 390 / 430 / 768 ;
- 0 overflow horizontal ;
- 0 erreur console ;
- 0 contrôle critique < 44 px ;
- création → sauvegarde → réouverture → aperçu → PDF ;
- backup export → restore réel ;
- offline réel ;
- installation iOS + Android ;
- partage iOS + Android ;
- Original comparé aux références ;
- Premium scoré >= 9,5 ;
- human gate ;
- aucun Vercel sans autorisation explicite.

## NEXT EXACT

**LOT 1 — Moteur métier production-grade.**

Ordre :

1. remplacer la numérotation `count + 1` par des séquences persistantes irréversibles ;
2. brouillon sans numéro final puis finalisation ;
3. statuts Brouillon / Finalisé / Payé / Annulé ;
4. validations métier et règles d’arrondi ;
5. remises ;
6. préfixes / format configurables réellement branchés au moteur ;
7. tests unitaires moteur ;
8. clients & catalogue ;
9. PDF Original fidelity ;
10. PDF Premium polish ;
11. audit mobile incluant E0/E6 + certification finale ;
12. un seul run GitHub Actions si utile ;
13. human gate puis merge.

## Prompt de reprise conseillé

`Reprends Facture PWA depuis docs/HANDOVER.md et docs/ROADMAP.md sur la branche m0/pwa-foundation. Respecte le mockup verrouillé dans docs/mockups. E0 à E6 sont des candidats fonctionnels non certifiés. Commence exactement par LOT 1 — moteur métier production-grade, sans lancer d’Actions GitHub inutilement et sans Vercel.`
