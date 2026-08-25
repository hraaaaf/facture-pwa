# Facture PWA — Roadmap

## Goal

Une PWA mobile-first, installable sur iPhone et Android, permettant de créer en quelques secondes des devis, factures, bons de livraison et bons de commande, puis de générer un PDF A4 fidèle aux modèles de référence.

## Principes verrouillés

- local-first, sans compte obligatoire ;
- aucune base externe requise ;
- aucune dépendance à Vercel pour développer ou tester ;
- aucun déploiement Vercel sans autorisation explicite ;
- interface française, tactile, sobre et rapide ;
- Devis → Facture / BL sans ressaisie ;
- BL disponible sans prix ou avec prix ;
- paramètres société, logo, mentions légales et signature modifiables.

## M0 — Fondation PWA

- [x] React + TypeScript + Vite
- [x] PWA installable / cache applicatif
- [x] stockage IndexedDB local
- [x] quatre types de documents
- [x] calculs HT / TVA / TTC
- [x] montant TTC en lettres
- [x] génération PDF A4 initiale
- [x] réglages société locaux
- [x] historique / recherche
- [x] CI test + build
- [ ] CI verte sur HEAD exact
- [ ] revue mobile 390 / 430 / 768

## M1 — Fidélité PDF

- reproduire précisément les deux références fournies ;
- figer typographies, espacements, tableau, signatures et pied de page ;
- gérer pagination multi-lignes / multi-pages ;
- tests golden PDF et comparaison visuelle.

## M2 — Flux métier

- clients réutilisables ;
- duplication d'un document ;
- Devis → Facture / BL avec traçabilité ;
- numérotation configurable par type ;
- statut brouillon / finalisé ;
- export / import de sauvegarde locale.

## M3 — Mobile / PWA

- icônes PNG iOS + Android ;
- installation Add to Home Screen ;
- partage natif du PDF quand disponible ;
- audit tactile ≥ 44 px ;
- offline réel et reprise après fermeture.

## M4 — Certification

- screenshots 390 / 430 / 768 ;
- 0 overflow horizontal ;
- 0 erreur console ;
- test création → sauvegarde → réouverture → PDF ;
- comparaison finale PDF vs références ;
- human gate avant tout déploiement.
