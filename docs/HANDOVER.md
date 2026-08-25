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

## Contraintes utilisateur à respecter

- ne pas utiliser Replit ;
- GitHub Actions sont limités : workflow manuel seulement, éviter tout run inutile ;
- ne pas lancer Vercel sans autorisation explicite ;
- mobile-first iPhone + Android ;
- objectif visuel premium, pas une app administrative basique ;
- conserver l’app simple pour l’utilisateur final ;
- fournir des preuves avant de déclarer un lot fermé.

## Direction visuelle verrouillée

Le mockup validé sert de cible.

- glassmorphism ;
- accent vert ;
- surfaces claires/translucides ;
- gros contrôles tactiles ;
- bottom navigation `Accueil | + | Historique` ;
- bouton + central flottant ;
- safe areas iOS ;
- interactions type app native moderne ;
- pas de surcharge fonctionnelle visible.

Mockup canonique : `docs/mockups/UI_V1_MASTER.jpg`
Règles de lock : `docs/mockups/MOCKUPS_LOCK.md`
Spec UI : `docs/UI_V1_MOBILE_SPEC.md`

## État produit au handover

### E1 Accueil

CANDIDAT ✅

Dashboard premium, recherche, cartes statistiques, récents, bottom nav glass et bouton +.

### E2 Nouveau document

CANDIDAT ✅

Bottom sheet avec Devis / Facture / BL / BC en un tap.

### E3 Éditeur

CANDIDAT ✅ côté UI et moteur de base.

Fonctionnel : client, objet, lignes, unité, quantité, PU HT, TVA, calculs live, BL avec/sans prix, montant en lettres, conversion Devis → Facture/BL, sauvegarde locale, bottom action bar.

Non production-grade : numérotation irréversible, statuts, remises, validations, autosave/recovery, traçabilité renforcée.

### E4 Aperçu / PDF

CANDIDAT ✅ fonctionnel.

- aperçu dans l’app ;
- modèles Original / Premium ;
- partage ;
- téléchargement ;
- impression ;
- pagination Page X/Y ;
- métadonnées ;
- overlay qui conserve le brouillon en mémoire.

Important : aucun score 9,5 n’est certifié tant que les PDF n’ont pas été comparés visuellement aux références.

### E5 Historique

CANDIDAT ✅

Recherche, filtres, cartes premium, ouverture, duplication, Devis → Facture, Devis → BL, suppression confirmée.

Les statuts comptables n’ont volontairement pas été simulés.

### E6 Réglages

NEXT EXACT ⏭️

À faire : refonte premium, choix template PDF, numérotation, export/restore local, installation PWA et consolidation des réglages société.

## Moteur métier actuel

Déjà présent :

- Total ligne HT = quantité × PU HT ;
- somme des lignes ;
- TVA ligne par ligne ;
- total HT ;
- total TVA ;
- total TTC ;
- montant en lettres ;
- conversions Devis → Facture / BL.

Risque connu à corriger : la numérotation actuelle repose encore sur le nombre de documents existants + 1. Une suppression peut donc créer un risque de réutilisation future d’un numéro. Ne pas considérer la numérotation actuelle comme production-grade.

Cible : brouillon sans numéro définitif, numéro réservé à finalisation, numéro final jamais réutilisé.

## PDF

Deux familles :

### Original

Doit reproduire les documents source avec une fidélité >= 9,5/10.

### Premium

Doit être clairement plus haut de gamme visuellement, tout en conservant les mêmes données métier, >= 9,5/10.

Les deux moteurs existent mais restent à certifier visuellement.

## Références fonctionnelles importantes

- BL sans prix ;
- BL avec prix ;
- Facture à 5 colonnes ;
- TVA source 20 % mais configurable ;
- total TTC en lettres ;
- identité société modifiable ;
- logo et signature modifiables.

## GitHub / CI

Workflow `.github/workflows/ci.yml` configuré en `workflow_dispatch` uniquement.

Ne pas multiplier les runs. La stratégie est de faire **un run final utile** sur le candidat prêt à certifier.

Un ancien run rouge n’a exécuté aucune étape et n’a alloué aucun runner. Il ne doit pas être interprété comme une preuve d’échec produit.

## Gates avant merge

- build/test sur HEAD exact ;
- screenshots 390 / 430 / 768 ;
- 0 overflow horizontal ;
- 0 erreur console ;
- 0 contrôle critique < 44 px ;
- création → sauvegarde → réouverture → aperçu → PDF ;
- offline réel ;
- partage iOS + Android ;
- Original comparé aux références ;
- Premium scoré >= 9,5 ;
- human gate ;
- aucun Vercel sans autorisation explicite.

## NEXT EXACT

**E6 — Réglages premium**.

Ensuite :

1. backup/restore local ;
2. moteur métier production-grade ;
3. clients & catalogue ;
4. PDF Original fidelity ;
5. PDF Premium polish ;
6. audit mobile ;
7. certification finale ;
8. run GitHub Actions unique si utile ;
9. human gate puis merge.

## Prompt de reprise conseillé

`Reprends Facture PWA depuis docs/HANDOVER.md et docs/ROADMAP.md sur la branche m0/pwa-foundation. Respecte le mockup verrouillé dans docs/mockups. Commence exactement par le NEXT EXACT, sans lancer d’Actions GitHub inutilement et sans Vercel.`
