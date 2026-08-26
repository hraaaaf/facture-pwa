# Facture PWA — Roadmap canonique

Dernière mise à jour : 26 août 2026

> Source de vérité du projet. En cas de nouvelle fenêtre : `docs/HANDOVER.md` → ce fichier → `docs/PDF_ORIGINAL_REFERENCE.md` → `docs/PDF_ORIGINAL_GEOMETRY.md` → `docs/E0_ONBOARDING.md` → `docs/UI_V1_MOBILE_SPEC.md` → `docs/mockups/MOCKUPS_LOCK.md`.

## Goal

Créer une PWA mobile-first, installable sur iPhone et Android, extrêmement simple à utiliser, permettant de créer des **Devis, Factures, Bons de livraison (BL) et Bons de commande (BC)**, avec calculs fiables, stockage local et PDF A4 professionnels.

## Principes verrouillés

- mobile-first, iPhone + Android ;
- local-first, sans compte obligatoire ;
- IndexedDB pour les données métier ;
- premier lancement = onboarding société E0 obligatoire ;
- interface française, premium glassmorphism ;
- bottom navigation `Accueil | + | Historique` ;
- cibles tactiles critiques >= 44 px ;
- safe areas iOS ;
- Devis → Facture / BL sans ressaisie ;
- BL sans prix ou avec prix ;
- deux modèles PDF : **Original** et **Premium** ;
- GitHub Actions **manuel uniquement**, à utiliser avec parcimonie ;
- aucun déploiement Vercel sans autorisation explicite.

## État Git canonique

- repository : `hraaaaf/facture-pwa`
- branche : `m0/pwa-foundation`
- PR : `#1 — M0 — Fondation PWA facturation`
- base : `main`
- pas de merge avant les gates de certification.

---

# LOT 0 — Fondation PWA

**État : CANDIDAT, non certifié**

- [x] React + TypeScript + Vite
- [x] PWA / service worker
- [x] IndexedDB local
- [x] 4 types de documents
- [x] calculs HT / TVA / TTC
- [x] montant TTC en lettres
- [x] historique / recherche
- [x] E0 onboarding premier lancement
- [x] E1 à E6 candidats fonctionnels
- [x] identité société structurée : adresse / TEL / FAX / email / ICE / IF / RC / Patente / CNSS / banque / RIB
- [x] logo + signature locaux
- [x] export / restauration JSON locale
- [x] préférence PDF Original / Premium
- [x] installation PWA : prompt natif + fallback iOS/Android
- [x] GitHub Actions en `workflow_dispatch` uniquement

### Reste à certifier

- [ ] `npm test` sur HEAD exact
- [ ] `npm run build` sur HEAD exact
- [ ] revue réelle 390 / 430 / 768
- [ ] 0 overflow horizontal
- [ ] 0 erreur console

---

# UI V1 MOBILE

## E0 — Premier démarrage / société

**État : ✅ candidat fonctionnel, non certifié visuellement**

5 étapes : Identité → Coordonnées → Identifiants → Banque → Documents.

- raison sociale + adresse requises ;
- TEL / FAX / email ;
- ICE / IF / RC / Patente / CNSS ;
- banque / RIB ;
- logo / signature ;
- TVA ;
- modèle PDF ;
- `onboardingCompleted` persisté ;
- anciennes installations configurées non rebloquées.

**Score cible : UI 9,4 / UX 9,8**

## E1 — Accueil

**État : ✅ candidat**

Dashboard premium, compteurs, recherche, récents, bottom nav glass, bouton +.

**Score cible : UI 9,5 / UX 9,7**

## E2 — Nouveau document

**État : ✅ candidat**

Bottom sheet Devis / Facture / BL / BC en un tap.

**Score cible : UI 9,4 / UX 9,8**

## E3 — Éditeur

**État : ✅ candidat UI + moteur LOT1 branché**

- client / objet / articles ;
- quantité / PU HT / TVA ;
- remise ligne % ;
- remise globale % ;
- calculs live ;
- BL avec/sans prix ;
- montant en lettres ;
- brouillon sans numéro final ;
- bouton **Finaliser** ;
- document finalisé en lecture seule ;
- conversion Devis → Facture / BL avec `sourceDocumentId` ;
- bottom action bar glass.

**Reste :** autosave/recovery à ajouter ou certifier avant DONE.

**Score cible : UI 9,4 / UX 9,8 / moteur 9,8**

## E4 — Aperçu / PDF

**État : ✅ candidat fonctionnel, non certifié visuellement**

- aperçu A4 ;
- Original / Premium ;
- partage / téléchargement / impression ;
- Page X/Y ;
- métadonnées ;
- préférence de modèle persistée.

**Score cible : Original >= 9,5 / Premium >= 9,5**

## E5 — Historique

**État : ✅ candidat + lifecycle branché**

Recherche/filtres, duplication/conversion, statuts Brouillon/Finalisé/Payé/Annulé, annulation sans réutilisation du numéro.

**Score cible : UI 9,3 / UX 9,6**

## E6 — Réglages

**État : ✅ candidat fonctionnel**

Identité complète, TVA, logo/signature, Original/Premium, backup/restore, installation PWA, préfixes de numérotation reliés au moteur.

**Score cible : UI 9,2 / UX 9,5**

---

# Visual Polish V1

**État : ✅ CANDIDAT VISUEL, runtime non certifié**

- [x] couche `src/polish.css` chargée en dernier ;
- [x] profondeur glass renforcée ;
- [x] bottom nav / FAB retravaillés ;
- [x] cartes, recherche, listes, éditeur, historique, réglages harmonisés ;
- [x] faux bouton overflow de l’éditeur neutralisé ;
- [x] cibles tactiles >=44 px conservées.

Score candidat intermédiaire : **9,2/10**. Score officiel seulement après runtime 390/430/768.

---

# LOT 1 — Moteur métier production-grade

**État : ✅ CANDIDAT TECHNIQUE, runtime non certifié**

Implémenté : brouillon sans numéro, séquences atomiques type+année, préfixes, numéro irréversible, lifecycle, validations, remises, arrondis, conversions tracées, migration legacy, stale draft et double-finalisation protégés.

### Gates LOT1

- [ ] `F-2026-001 → F-2026-002` ;
- [ ] annulation puis prochain = 003 ;
- [ ] séquences indépendantes ;
- [ ] reset annuel ;
- [ ] double tap ;
- [ ] stale draft ;
- [ ] migration legacy ;
- [ ] build/tests exact HEAD.

---

# LOT 2 — Clients & catalogue rapide

**État : ✅ CANDIDAT TECHNIQUE, runtime non certifié**

- [x] DB v3 `clients` + `catalog` ;
- [x] fiches clients et autocomplétion ;
- [x] snapshot client historique ;
- [x] prestations apprises après finalisation ;
- [x] dernier PU HT / TVA / unité ;
- [x] prestations fréquentes ;
- [x] déduplication ;
- [x] backup v2 + restore v1.

### Gates LOT2

- [ ] créer/retrouver client ;
- [ ] snapshot inchangé après modification ;
- [ ] prestation retrouvée après finalisation ;
- [ ] fréquence + déduplication ;
- [ ] backup v2 + restore v1 ;
- [ ] 390/430/768 ;
- [ ] build/tests exact HEAD.

---

# LOT 3 — PDF Original

**État : ✅ CANDIDAT GÉOMÉTRIQUE, jsPDF exact-head non certifié**

Sources :
- `docs/PDF_ORIGINAL_REFERENCE.md` ;
- `docs/PDF_ORIGINAL_GEOMETRY.md` ;
- `src/referenceFixture.ts`.

Données source verrouillées : Benmoussa Rachid / TAPISTOR SABRE, adresse, RC, Patente, CNSS, ICE, IF, RIB, facture/BL détaillé `0107-2026`, BL simple `06-07-2026`, 10 × 800, TVA 20 %, 8000 HT / 1600 TVA / 9600 TTC.

TEL / FAX / email / banque restent vides car absents des références.

### Logo temporaire

- [x] logo fictif TS dans `src/brand.ts` ;
- [x] utilisé par défaut jusqu’au vrai logo E0/E6 ;
- [x] jamais présenté comme actif officiel.

### Géométrie Original implémentée

- [x] en-tête source : titre/numéro gauche, société/logo/date droite ;
- [x] objet gras + souligné ;
- [x] tableau tarifé avec séparations de colonnes calées sur la source ;
- [x] zone HT/TVA/TTC intégrée dans le grand cadre ;
- [x] BL simple : tableau 3 colonnes placé vers 118 mm ;
- [x] BL simple source sans client reflété dans le fixture ;
- [x] snapshot client rendu seulement s’il existe ;
- [x] footer rapproché de la source ;
- [x] signatures non fabriquées ;
- [x] Page X/Y seulement si Original multi-page ;
- [x] remises prévues uniquement lorsqu’elles existent ;
- [x] fallback multi-lignes/multi-page conservé.

### Gates LOT3

- [ ] générer les fixtures avec le **moteur jsPDF exact HEAD** ;
- [ ] rendre PDF générés en PNG ;
- [ ] comparaison source → généré ;
- [ ] corriger micro-écarts typographiques/logo ;
- [ ] vérifier remises ;
- [ ] vérifier snapshot client ;
- [ ] vérifier multi-page ;
- [ ] build/tests exact HEAD ;
- [ ] score Original >= 9,5.

---

# LOT 4 — PDF Premium

**État : CANDIDAT TECHNIQUE, design à scorer**

- [x] second template ;
- [x] hiérarchie, tableau, totaux, montant en lettres, signatures/footer ;
- [x] partage / téléchargement / impression ;
- [ ] présentation premium des remises ;
- [ ] revue visuelle réelle ;
- [ ] corrections ;
- [ ] score >= 9,5.

---

# LOT 5 — Mobile / PWA / certification finale

**État : À CERTIFIER**

- [ ] E0 stockage vierge puis réouverture ;
- [ ] screenshots 390 / 430 / 768 ;
- [ ] zéro overflow ;
- [ ] zéro contrôle critique < 44 px ;
- [ ] clavier mobile ;
- [ ] installation iPhone / Android ;
- [ ] offline réel ;
- [ ] fermeture / réouverture sans perte ;
- [ ] backup export / restore réel ;
- [ ] partage PDF iOS / Android ;
- [ ] création → sauvegarde → finalisation → réouverture → PDF ;
- [ ] gates runtime LOT1/LOT2 ;
- [ ] Original vs références ;
- [ ] Premium >= 9,5 ;
- [ ] un seul run GitHub Actions final si utile ;
- [ ] human gate ;
- [ ] aucun Vercel sans feu vert explicite.

---

# Mockup / design lock

- `docs/mockups/UI_V1_MASTER.jpg`
- `docs/mockups/MOCKUPS_LOCK.md`
- `docs/UI_V1_MOBILE_SPEC.md`

---

# NEXT EXACT

1. **LOT 3 — générer réellement le PDF Original avec jsPDF exact HEAD et comparer source → généré.**
2. Corriger LOT3 jusqu’à >=9,5.
3. LOT4 PDF Premium.
4. Audit 390 / 430 / 768.
5. Gates runtime LOT1/LOT2 + PWA/offline/backup/partage.
6. Un seul run Actions final si utile.
7. Human gate → merge.

## Définition de DONE

Onboarding fiable, calculs prouvés, numérotation incorruptible, données sauvegardables/restaurables, mobile 390/430/768 propre, PDF Original/Premium >= 9,5, parcours téléphone complet, gates prouvés et validation humaine avant merge/déploiement.
