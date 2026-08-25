# Facture PWA — UI V1 Mobile Target

## Goal

Créer une PWA mobile-first, utilisable sur iPhone et Android, avec une interface simple, tactile et premium. Le mockup validé sert de cible visuelle.

## Direction visuelle verrouillée

- mobile-first ;
- navigation basse de type app native ;
- bouton central + flottant ;
- bottom bars et actions en glassmorphism ;
- surfaces blanches / translucides, blur léger, ombres diffuses ;
- accent principal vert ;
- boutons et champs tactiles >= 44 px ;
- safe areas iOS respectées ;
- aucune surcharge fonctionnelle visible ;
- animations courtes 150–220 ms ;
- priorité à la lisibilité et à la vitesse de saisie.

## État d’implémentation

### E1 — Accueil

- [x] header tableau de bord ;
- [x] recherche rapide ;
- [x] 4 cartes statistiques Devis / Facture / BL / BC ;
- [x] liste des documents récents ;
- [x] indicateur local / hors ligne ;
- [x] bottom navigation glassmorphism ;
- [x] bouton central + flottant ;
- [ ] revue réelle 390 / 430 / 768.

Score cible : UI 9.5 / UX 9.7

### E2 — Nouveau document

- [x] bottom sheet mobile ;
- [x] choix Devis / Facture / BL / BC ;
- [x] code couleur et icône par type ;
- [x] fermeture backdrop + bouton ;
- [x] choix en un tap ;
- [ ] revue réelle 390 / 430 / 768.

Score cible : UI 9.4 / UX 9.8

### E3 — Éditeur document

Déjà fonctionnel : client, objet, articles, unité, quantité, PU HT, TVA, calculs live, BL sans prix, conversion Devis → Facture / BL, sauvegarde locale et bottom actions sticky.

À faire : refonte premium complète de l’écran, client picker, catalogue / autocomplétion, statut brouillon / finalisé, numérotation irréversible.

Score cible : UI 9.4 / UX 9.8 / moteur 9.8

### E4 — Aperçu / PDF

Déjà fonctionnel : A4, HT / TVA / TTC, montant en lettres, BL avec / sans prix, footer, signature, pagination de base.

À faire : aperçu mobile, modèle Original >= 9.5, modèle Premium >= 9.5, partage natif, impression et pagination finale Page X/Y.

Score cible : UI 9.5 / PDF Original 9.5+ / PDF Premium 9.5+

### E5 — Historique

- [x] recherche locale ;
- [x] liste des documents ;
- [x] montant / date / type ;
- [x] bottom navigation glass ;
- [ ] filtres rapides ;
- [ ] duplication ;
- [ ] revue réelle 390 / 430 / 768.

Score cible : UI 9.3 / UX 9.6

### E6 — Réglages

Déjà fonctionnel : entreprise, marque, adresse, mentions légales, ville, TVA, logo et signature.

À faire : refonte premium, numérotation, choix PDF Original / Premium, sauvegarde / restauration et installation PWA.

Score cible : UI 9.2 / UX 9.5

## Design system V1 implémenté

### Navigation

Accueil | + | Historique

- barre flottante radius 28 px ;
- backdrop blur élevé ;
- surface translucide ;
- reflet intérieur ;
- ombre diffuse ;
- CTA central vert 58 px ;
- feedback press ;
- safe-area bottom iOS.

### Couleurs

- fond principal : #EEF3EF ;
- texte : #111713 ;
- accent : #18C86F ;
- accent fort : #0FB862 ;
- Devis : vert ;
- Facture : bleu ;
- BL : violet ;
- BC : orange.

### Tactile

- minimum 44 × 44 px ;
- champs >= 50 px ;
- CTA principal >= 52 px ;
- interactions utilisables sans hover.

### Glassmorphism

- surfaces blanches translucides ;
- backdrop blur ;
- fine bordure claire ;
- ombre faible ;
- contraste texte conservé.

## Ordre d’implémentation

1. [x] Design tokens + bottom navigation glassmorphism.
2. [x] E1 Accueil premium.
3. [x] E2 Nouveau document.
4. [ ] E3 Éditeur premium + moteur métier durci.
5. [ ] E4 Aperçu PDF mobile + Original / Premium.
6. [ ] E5 Historique avancé.
7. [ ] E6 Réglages premium.
8. [ ] Audit 390 / 430 / 768.
9. [ ] Audit tactile >= 44 px.
10. [ ] Offline + reprise après fermeture.
11. [ ] Partage / téléchargement / impression PDF.
12. [ ] Certification finale.

## Gates de certification V1

- 390 / 430 / 768 sans overflow ;
- 0 erreur console ;
- 0 contrôle critique < 44 px ;
- création → sauvegarde → réouverture → PDF validée ;
- offline validé ;
- Original PDF >= 9.5 ;
- Premium PDF >= 9.5 ;
- UI globale >= 9.3 ;
- aucune GitHub Action automatique ;
- aucun déploiement Vercel sans autorisation explicite.
