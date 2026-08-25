# facture-pwa

PWA mobile-first pour créer rapidement :

- des devis ;
- des factures ;
- des bons de livraison, avec ou sans prix ;
- des bons de commande.

## M0

La fondation contient :

- React + TypeScript + Vite ;
- PWA installable et utilisable hors ligne ;
- stockage local IndexedDB, sans compte ni base externe ;
- calcul automatique HT / TVA / TTC ;
- montant TTC en lettres ;
- historique et recherche ;
- conversion Devis → Facture / BL sans ressaisie ;
- génération PDF A4 basée sur les modèles de référence ;
- réglages société, logo, mentions légales et signature ;
- GitHub Actions pour tests et build.

Voir `docs/ROADMAP.md` pour les étapes de certification et de fidélité PDF.

## Déploiement

Aucun déploiement Vercel n'est configuré. Le projet doit rester sur GitHub / GitHub Actions jusqu'à autorisation explicite de déployer.
