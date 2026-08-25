# Facture PWA — Roadmap canonique

Dernière mise à jour : 25 août 2026

> Source de vérité du projet. Nouvelle fenêtre : `docs/HANDOVER.md` → ce fichier → `docs/E0_ONBOARDING.md` → `docs/UI_V1_MOBILE_SPEC.md` → `docs/mockups/MOCKUPS_LOCK.md`.

## Goal

Créer une PWA mobile-first iPhone + Android, extrêmement simple, pour **Devis, Factures, BL et BC**, avec moteur fiable, mémoire locale rapide et PDF A4 professionnels.

## Principes verrouillés

- local-first, sans compte obligatoire ;
- IndexedDB pour données métier, clients et catalogue ;
- E0 onboarding société au premier lancement ;
- UI française premium glassmorphism ;
- bottom navigation `Accueil | + | Historique` ;
- cibles tactiles critiques >= 44 px ;
- safe areas iOS ;
- Devis → Facture / BL sans ressaisie ;
- BL avec ou sans prix ;
- PDF **Original** et **Premium** ;
- GitHub Actions manuel uniquement, à économiser ;
- aucun Vercel sans autorisation explicite.

## Git canonique

- repo : `hraaaaf/facture-pwa`
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
- [x] identité société structurée
- [x] logo + signature
- [x] backup / restore JSON
- [x] préférence PDF Original / Premium
- [x] installation PWA : prompt + fallback iOS/Android
- [x] GitHub Actions en `workflow_dispatch` uniquement

### Reste à certifier

- [ ] `npm test` HEAD exact
- [ ] `npm run build` HEAD exact
- [ ] 390 / 430 / 768
- [ ] 0 overflow horizontal
- [ ] 0 erreur console

---

# UI V1 MOBILE

## E0 — Premier démarrage

**✅ candidat fonctionnel, non certifié visuellement**

Identité → Coordonnées → Identifiants → Banque → Documents. Société/adresse requises, TVA 0..100, logo/signature, `onboardingCompleted` persistant.

## E1 — Accueil

**✅ candidat** : dashboard, compteurs, récents, bottom nav glass, bouton +.

## E2 — Nouveau document

**✅ candidat** : Devis / Facture / BL / BC en un tap.

## E3 — Éditeur

**✅ candidat UI + LOT1 + LOT2 branchés**

- brouillon sans numéro final ;
- client / objet / articles ;
- quantité / PU / TVA / remises ;
- calculs live ;
- finalisation ;
- document final en lecture seule ;
- **autocomplétion clients** ;
- **fiche client rapide** ;
- **prestations fréquentes** ;
- **suggestions article avec dernier PU/TVA/unité** ;
- conversion Devis → Facture / BL.

## E4 — Aperçu / PDF

**✅ candidat technique, visuel non certifié** : Original/Premium, partage, téléchargement, impression, Page X/Y.

## E5 — Historique

**✅ candidat + lifecycle** : Brouillon / Finalisé / Payé / Annulé, duplication, conversion, suppression uniquement brouillon.

## E6 — Réglages

**✅ candidat** : identité société, TVA, logo/signature, PDF, backup/restore, PWA, préfixes de numérotation.

---

# LOT 1 — Moteur métier production-grade

**État : ✅ CANDIDAT TECHNIQUE, runtime non certifié**

### Implémenté

- [x] brouillon sans numéro définitif ;
- [x] séquence indépendante `type + année` ;
- [x] préfixes configurables ;
- [x] réservation atomique compteur + document ;
- [x] numéro jamais réutilisé après annulation ;
- [x] document finalisé non supprimable et lecture seule ;
- [x] statuts `DRAFT / FINALIZED / PAID / CANCELLED` ;
- [x] `PAID` réservé aux factures ;
- [x] validations métier ;
- [x] remise ligne + globale ;
- [x] arrondis 2 décimales ;
- [x] TVA après remises ;
- [x] `sourceDocumentId` pour conversions ;
- [x] migration anciens documents ;
- [x] protection stale draft ;
- [x] protection double finalisation ;
- [x] IndexedDB store `counters` ;
- [x] tests purs calculs / validations / numérotation.

### Gates LOT1

- [ ] runtime `F-2026-001 → 002` ;
- [ ] annulation 001 puis prochaine = 003 ;
- [ ] séquences indépendantes ;
- [ ] reset annuel ;
- [ ] double tap = un numéro ;
- [ ] stale draft rejeté ;
- [ ] migration legacy ;
- [ ] build/tests HEAD exact.

---

# LOT 2 — Clients & catalogue rapide

**État : ✅ CANDIDAT TECHNIQUE, runtime non certifié**

### Implémenté

- [x] IndexedDB DB v3 avec stores `clients` et `catalog` ;
- [x] clients réutilisables ;
- [x] fiche client : nom, société, adresse, ICE, IF, téléphone, email ;
- [x] recherche/autocomplétion locale ;
- [x] sélection client en un tap ;
- [x] snapshot client sur le document (`clientAddress`, `clientIce`, `clientIfNumber`) pour préserver l’historique ;
- [x] `clientId` local optionnel ;
- [x] prestations/articles appris après finalisation réussie ;
- [x] dernier PU HT mémorisé ;
- [x] dernière TVA mémorisée ;
- [x] unité mémorisée ;
- [x] prestations fréquentes proposées en raccourcis ;
- [x] suggestions pendant la saisie d’une désignation ;
- [x] duplication/conversion conserve le snapshot client ;
- [x] mémoire client/catalogue non critique : une erreur de mémoire ne peut pas annuler une finalisation réussie ;
- [x] backup JSON passé en **version 2** avec clients + catalogue ;
- [x] restauration des backups v1 toujours acceptée ;
- [x] déduplication locale insensible à casse/accents/espaces ;
- [x] cibles tactiles LOT2 >= 44 px.

### Règle produit

Le catalogue se nourrit **après finalisation**, pas sur chaque brouillon. Cela évite qu’une saisie incomplète ou erronée devienne une suggestion persistante.

### Gates LOT2 avant fermeture

- [ ] créer une fiche client puis la retrouver par autocomplétion ;
- [ ] modifier la fiche ensuite : un document finalisé garde son snapshot historique ;
- [ ] finaliser une prestation puis la retrouver dans un nouveau document avec PU/TVA/unité ;
- [ ] vérifier classement par fréquence ;
- [ ] éviter doublons `Client`, `client`, `Clïent` ;
- [ ] backup v2 export → restore clients + catalogue ;
- [ ] restore backup v1 ;
- [ ] 390 / 430 / 768 sans overflow des suggestions/sheet client ;
- [ ] build/tests HEAD exact.

---

# LOT 3 — PDF Original

**État : ⏭️ NEXT EXACT**

- [x] A4 / tableau / HT / TVA / TTC / montant en lettres ;
- [x] BL sans prix ;
- [x] footer / signatures / multi-page / Page X/Y ;
- [ ] afficher proprement snapshot client adresse/ICE/IF ;
- [ ] présenter explicitement les remises ;
- [ ] reproduction quasi exacte des références ;
- [ ] typographie / marges / géométrie ;
- [ ] logo exact ;
- [ ] comparaison golden ;
- [ ] score >= 9,5.

---

# LOT 4 — PDF Premium

**État : CANDIDAT TECHNIQUE, design à scorer**

- [x] second template ;
- [x] hiérarchie / tableau / totaux / signatures ;
- [x] partage / téléchargement / impression ;
- [ ] snapshot client premium ;
- [ ] présentation premium des remises ;
- [ ] revue visuelle ;
- [ ] score >= 9,5.

---

# LOT 5 — Mobile / PWA / certification finale

**État : À CERTIFIER**

- [ ] E0 stockage vierge + réouverture ;
- [ ] screenshots 390 / 430 / 768 ;
- [ ] zéro overflow / zéro contrôle critique <44 px ;
- [ ] clavier mobile ;
- [ ] iPhone / Android installation ;
- [ ] offline réel ;
- [ ] fermeture/réouverture sans perte ;
- [ ] backup/restore réel, incluant mémoire LOT2 ;
- [ ] partage PDF iOS/Android ;
- [ ] parcours création → finalisation → réouverture → PDF ;
- [ ] gates runtime LOT1 + LOT2 ;
- [ ] Original vs références ;
- [ ] Premium >= 9,5 ;
- [ ] un seul run Actions final si utile ;
- [ ] human gate ;
- [ ] aucun Vercel sans feu vert.

---

# Mockup / design lock

- `docs/mockups/UI_V1_MASTER.jpg`
- `docs/mockups/MOCKUPS_LOCK.md`
- `docs/UI_V1_MOBILE_SPEC.md`

---

# NEXT EXACT

1. **LOT 3 — PDF Original : fidélité source + snapshot client + remises**.
2. LOT 4 — PDF Premium : client/remises + polish.
3. Audit 390 / 430 / 768.
4. Gates runtime LOT1 + LOT2 + backup/offline/PWA/partage.
5. Un seul run Actions final si utile.
6. Human gate → merge.

## DONE

DONE exige : onboarding fiable, calculs/numérotation prouvés, mémoire client/catalogue fiable, backup restaurable, mobile propre, PDF Original/Premium >=9,5, parcours téléphone complet et validation humaine avant merge/déploiement.
