# Facture PWA — Visual Polish V1

Date : 26 août 2026

## Goal

Faire passer l'UI mobile actuelle d'un niveau visuel d'environ **8,3/10** vers la cible verrouillée **>= 9,3/10**, sans modifier l'architecture produit ni le moteur métier.

Références :

- `docs/mockups/UI_V1_MASTER.jpg`
- `docs/mockups/MOCKUPS_LOCK.md`
- `docs/UI_V1_MOBILE_SPEC.md`

## Implémentation

La couche `src/polish.css` est chargée **en dernier** depuis `src/main.tsx` afin de conserver les composants et le moteur existants tout en renforçant systématiquement le design.

### Accueil

- fond plus profond avec halos doux et texture extrêmement légère ;
- hiérarchie typographique renforcée ;
- recherche plus vitrée et plus lisible ;
- cartes statistiques avec reflet interne, gradient discret par famille documentaire et ombre diffuse ;
- icônes et badges mieux hiérarchisés ;
- listes et état vide harmonisés.

### Navigation mobile

- bottom bar flottante retravaillée dans la direction glassmorphism type WhatsApp moderne ;
- blur/saturation renforcés ;
- réflexion interne haute ;
- ombre flottante plus réaliste ;
- état actif traité comme une surface vitrée ;
- FAB central porté à 60-62 px selon viewport, avec reflet, relief et halo vert ;
- safe area conservée.

### Éditeur

- panneaux, articles et totaux plus profonds ;
- champs plus propres ;
- action principale verte harmonisée avec le FAB ;
- bottom action bar alignée sur la nouvelle bottom nav ;
- contrôle overflow visuellement masqué tant qu'aucune action réelle n'y est branchée, afin d'éviter un faux affordance.

### Historique / Clients / Catalogue

- filtres et cartes harmonisés ;
- suggestions client/prestation plus vitrées ;
- snapshots client cohérents avec le langage visuel global ;
- cibles tactiles LOT2 maintenues >= 44 px.

### Réglages / Onboarding / Overlays

- profondeur et rayon des surfaces harmonisés ;
- actions primaires uniformisées ;
- overlays plus proches d'un sheet natif mobile.

## Preuve disponible

Un rendu AFTER 390 px a été produit localement à partir de la structure actuelle de l'Accueil et de la couche de styles V1.

Ce rendu sert de **preuve visuelle intermédiaire**, pas de certification runtime complète.

## Score candidat

- hiérarchie / lisibilité : **9,4**
- glassmorphism / profondeur : **9,2**
- bottom navigation / FAB : **9,4**
- cohérence premium : **9,1**
- global candidat : **9,2/10**

Le score officiel reste **non certifié** tant que les captures réelles 390 / 430 / 768 du runtime complet n'ont pas été inspectées.

## Gates encore ouvertes

- [ ] vraie capture runtime 390 px ;
- [ ] vraie capture runtime 430 px ;
- [ ] vraie capture runtime 768 px ;
- [ ] comparaison BEFORE → mockup → AFTER ;
- [ ] zéro overflow horizontal ;
- [ ] zéro contrôle critique < 44 px ;
- [ ] clavier mobile / safe area ;
- [ ] score global officiel >= 9,3/10.

## Décision

Cette passe ne change ni la navigation, ni les fonctionnalités, ni les calculs. Elle reste compatible avec le design lock approuvé et constitue la nouvelle base visuelle candidate pour les lots PDF et la certification mobile finale.
