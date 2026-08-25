# Facture PWA — Roadmap canonique

Dernière mise à jour : 25 août 2026

> Ce fichier est la source de vérité du projet. En cas de nouvelle fenêtre ChatGPT, lire dans cet ordre : `docs/HANDOVER.md` → ce fichier → `docs/UI_V1_MOBILE_SPEC.md` → `docs/mockups/MOCKUPS_LOCK.md`.

## Goal

Créer une PWA mobile-first, installable sur iPhone et Android, extrêmement simple à utiliser, permettant de créer des **Devis, Factures, Bons de livraison (BL) et Bons de commande (BC)**, avec calculs fiables, stockage local et PDF A4 professionnels.

## Principes verrouillés

- mobile-first, iPhone + Android ;
- local-first, sans compte obligatoire ;
- IndexedDB pour les données métier ;
- fonctionnement hors ligne à certifier ;
- interface française ;
- design premium glassmorphism inspiré des interactions mobiles modernes ;
- bottom navigation `Accueil | + | Historique` ;
- cibles tactiles critiques >= 44 px ;
- safe areas iOS ;
- Devis → Facture / BL sans ressaisie ;
- BL disponible sans prix ou avec prix ;
- deux modèles PDF : **Original** et **Premium** ;
- GitHub Actions **manuel uniquement** et à utiliser avec parcimonie ;
- aucun déploiement Vercel sans autorisation explicite.

## État Git canonique

- repository : `hraaaaf/facture-pwa`
- branche de travail : `m0/pwa-foundation`
- PR : `#1 — M0 — Fondation PWA facturation`
- base : `main`
- PR non mergée tant que les gates de certification ne sont pas franchies.

---

# LOT 0 — Fondation PWA

**État : CANDIDAT, non certifié**

### Fait

- [x] React + TypeScript + Vite
- [x] PWA / service worker
- [x] IndexedDB local
- [x] 4 types de documents
- [x] calculs quantité × prix unitaire
- [x] somme des lignes HT
- [x] TVA ligne par ligne
- [x] Total HT / TVA / TTC
- [x] montant TTC en lettres
- [x] historique local
- [x] recherche locale
- [x] réglages société premium
- [x] génération PDF A4
- [x] GitHub Actions passé en `workflow_dispatch` uniquement
- [x] safe areas iOS
- [x] cibles tactiles principales >= 44 px
- [x] export / restauration JSON locale
- [x] préférence PDF Original / Premium persistée
- [x] section installation PWA avec prompt natif quand disponible + instructions iOS/Android

### Reste à certifier

- [ ] `npm test` sur HEAD exact
- [ ] `npm run build` sur HEAD exact
- [ ] revue réelle 390 / 430 / 768
- [ ] 0 overflow horizontal
- [ ] 0 erreur console

---

# UI V1 MOBILE

## E1 — Accueil

**État : ✅ candidat**

- dashboard premium ;
- compteurs Devis / Factures / BL / BC ;
- recherche ;
- récents ;
- bottom nav glassmorphism ;
- bouton central + flottant ;
- indicateur données locales / offline.

**Score cible : UI 9,5 / UX 9,7**

## E2 — Nouveau document

**État : ✅ candidat**

- bottom sheet mobile ;
- Devis / Facture / BL / BC en un tap ;
- code couleur + icône par type ;
- ouverture directe de l’éditeur.

**Score cible : UI 9,4 / UX 9,8**

## E3 — Éditeur

**État : ✅ candidat UI / moteur de base**

- client ;
- objet ;
- lignes articles ;
- unité ;
- quantité ;
- PU HT ;
- TVA ;
- calculs live ;
- BL avec/sans prix ;
- montant en lettres ;
- conversion Devis → Facture / BL ;
- bottom action bar glass.

**Encore à faire dans le moteur :** statuts réels, numérotation irréversible, remises, validations métier, autosave/recovery, traçabilité renforcée.

**Score cible : UI 9,4 / UX 9,8 / moteur 9,8**

## E4 — Aperçu / PDF

**État : ✅ candidat fonctionnel, non certifié visuellement**

- aperçu A4 dans l’app ;
- bascule Original / Premium ;
- préférence de modèle par défaut persistée dans les réglages ;
- partage Web Share avec fallback ;
- téléchargement PDF ;
- impression ;
- métadonnées ;
- Page X/Y ;
- preview ouverte en overlay pour ne pas perdre le brouillon.

**Important :** ne pas considérer les PDF à 9,5 tant qu’une comparaison visuelle réelle n’a pas été faite.

**Score cible : Original >= 9,5 / Premium >= 9,5**

## E5 — Historique

**État : ✅ candidat**

- recherche locale instantanée ;
- filtres Tous / Factures / Devis / BL / BC ;
- cartes premium ;
- ouvrir ;
- dupliquer vers un nouveau brouillon ;
- Devis → Facture ;
- Devis → BL ;
- suppression confirmée.

**Statuts comptables volontairement non simulés tant que le moteur métier n’est pas implémenté.**

**Score cible : UI 9,3 / UX 9,6**

## E6 — Réglages

**État : ✅ CANDIDAT FONCTIONNEL, non certifié visuellement**

### Implémenté

- [x] refonte premium de l’écran ;
- [x] identité société ;
- [x] adresse + mentions légales ;
- [x] TVA par défaut 0..100 côté UI ;
- [x] logo avec aperçu / remplacement / retrait ;
- [x] signature avec aperçu / remplacement / retrait ;
- [x] choix PDF Original / Premium persisté ;
- [x] export JSON de toutes les données locales ;
- [x] restauration JSON avec validation et remplacement transactionnel IndexedDB ;
- [x] compteur de documents locaux ;
- [x] section installation PWA ;
- [x] prompt d’installation natif quand le navigateur l’expose ;
- [x] instructions manuelles iPhone / Android en fallback.

### Décision d’architecture

La **configuration de numérotation** n’est pas exposée comme un faux réglage tant que le moteur irréversible n’existe pas. Elle est montrée comme « prochain lot » dans E6 et déplacée dans **LOT 1**, où elle sera réellement reliée à des séquences persistantes et non réutilisables.

**Score cible : UI 9,2 / UX 9,5**

---

# LOT 1 — Moteur métier production-grade

**État : ⏭️ NEXT EXACT**

- [ ] brouillon sans consommation d’un numéro définitif ;
- [ ] séquence indépendante Facture / Devis / BL / BC ;
- [ ] préfixes / format de numérotation configurables réellement reliés au moteur ;
- [ ] numéro réservé à la finalisation ;
- [ ] numéro finalisé jamais réutilisé, même après annulation ;
- [ ] statuts Brouillon / Finalisé / Payé / Annulé ;
- [ ] validation quantité > 0 ;
- [ ] validation prix >= 0 ;
- [ ] validation TVA 0..100 ;
- [ ] remises ligne / globale en % ou MAD ;
- [ ] règles d’arrondi déterministes ;
- [ ] traçabilité Devis → Facture → BL ;
- [ ] tests unitaires calculs / numérotation / conversions.

**Note actuelle :** la numérotation existante utilise encore le nombre de documents + 1. Elle doit être remplacée avant validation production.

---

# LOT 2 — Clients & catalogue rapide

**État : À FAIRE**

- [ ] clients réutilisables ;
- [ ] nom / société / adresse / ICE / IF optionnels ;
- [ ] recherche et autocomplétion ;
- [ ] articles/prestations mémorisés ;
- [ ] dernier PU HT et TVA réutilisables ;
- [ ] duplication rapide ;
- [ ] aucune complexité ERP visible à l’utilisateur.

---

# LOT 3 — PDF Original

**État : CANDIDAT TECHNIQUE, fidélité à certifier**

- [x] A4 ;
- [x] tableau ;
- [x] HT / TVA / TTC ;
- [x] montant en lettres ;
- [x] BL sans prix ;
- [x] footer ;
- [x] signatures ;
- [x] multi-page de base ;
- [x] Page X/Y ;
- [ ] reproduction quasi exacte des références fournies ;
- [ ] typographie / marges / géométrie ;
- [ ] logo exact ;
- [ ] comparaison visuelle golden ;
- [ ] score >= 9,5.

---

# LOT 4 — PDF Premium

**État : CANDIDAT TECHNIQUE, design à scorer**

- [x] second moteur/template ;
- [x] hiérarchie visuelle modernisée ;
- [x] tableau premium ;
- [x] bloc totaux premium ;
- [x] montant en lettres ;
- [x] signatures / footer ;
- [x] partage / téléchargement / impression ;
- [ ] revue visuelle réelle ;
- [ ] corrections après screenshot ;
- [ ] score >= 9,5.

---

# LOT 5 — Mobile / PWA / certification finale

**État : À CERTIFIER**

- [ ] screenshots réels 390 px ;
- [ ] screenshots réels 430 px ;
- [ ] screenshots réels 768 px ;
- [ ] zéro overflow ;
- [ ] zéro contrôle critique < 44 px ;
- [ ] clavier mobile ne masque pas l’action utile ;
- [ ] installation iPhone ;
- [ ] installation Android ;
- [ ] offline réel ;
- [ ] fermeture / réouverture sans perte ;
- [ ] export puis restauration d’un backup réel ;
- [ ] partage PDF réel iOS ;
- [ ] partage PDF réel Android ;
- [ ] test création → sauvegarde → réouverture → aperçu → PDF ;
- [ ] comparaison Original vs références ;
- [ ] scoring Premium ;
- [ ] un seul run GitHub Actions de certification sur candidat final si nécessaire ;
- [ ] human gate avant merge ;
- [ ] aucun Vercel sans feu vert explicite.

---

# Mockup / design lock

Le mockup approuvé est verrouillé dans :

- `docs/mockups/UI_V1_MASTER.jpg`
- `docs/mockups/MOCKUPS_LOCK.md`
- spec détaillée : `docs/UI_V1_MOBILE_SPEC.md`

Le mockup est une **cible**, pas une décoration. Toute modification majeure de navigation, densité, couleurs, glassmorphism ou architecture d’écran doit être comparée à cette cible.

---

# NEXT EXACT

1. **LOT 1 — Moteur métier production-grade** : numérotation irréversible + statuts + validations + remises.
2. Clients & catalogue rapide.
3. Revue PDF Original vs références.
4. Revue PDF Premium et corrections jusqu’à >= 9,5.
5. Audit 390 / 430 / 768, incluant E6.
6. Certification backup/restore + PWA iOS / Android / offline.
7. Un seul run Actions final si utile.
8. Human gate → merge.

## Définition de DONE

Le projet n’est pas DONE parce qu’il compile ou parce qu’un mockup est joli. Il est DONE quand :

- le calcul est juste et couvert par tests ;
- la numérotation ne peut pas être corrompue ;
- les données survivent à la fermeture et peuvent être sauvegardées/restaurées ;
- l’app est confortable à 390/430/768 ;
- les PDF Original et Premium sont >= 9,5 ;
- le parcours complet fonctionne sur téléphone ;
- les gates sont prouvés ;
- l’utilisateur valide avant merge/déploiement.
