# Factea

PWA mobile-first pour créer rapidement :

- des devis ;
- des factures ;
- des bons de livraison, avec ou sans prix ;
- des bons de commande.

## Fondation

La fondation contient :

- React + TypeScript + Vite ;
- configuration PWA avec service worker, manifest et icônes iOS/Android ;
- identité installable **Factea** avec icône bleu saphir / platine ;
- stockage local IndexedDB, sans compte ni base externe ;
- calcul automatique HT / TVA / TTC ;
- montant TTC en lettres ;
- historique et recherche ;
- conversion Devis → Facture / BL sans ressaisie ;
- génération PDF A4 basée sur les modèles de référence ;
- réglages société, logo, mentions légales et signature ;
- GitHub Actions manuel pour tests et build.

L'installation réelle iPhone/Android, l'offline réel et la fermeture/réouverture sans perte restent des **gates runtime à certifier**. Voir `public/mobile-install-notes.md`.

## Déploiement

Projet Vercel canonique : `facture-pwa`, relié au repo `hraaaaf/facture-pwa`. La branche de travail canonique est `vercel/latest`.

Tout nouveau déploiement ou promotion Vercel reste **manuel et soumis à autorisation explicite**. Un commit GitHub n'implique donc pas qu'il soit déjà en production.
