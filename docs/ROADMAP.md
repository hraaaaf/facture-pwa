# Facture PWA — Roadmap canonique

Dernière mise à jour : 26 août 2026

> Source de vérité du projet. En cas de nouvelle fenêtre : `docs/HANDOVER.md` → ce fichier → `docs/PDF_ORIGINAL_REFERENCE.md` → `docs/E0_ONBOARDING.md` → `docs/UI_V1_MOBILE_SPEC.md` → `docs/mockups/MOCKUPS_LOCK.md`.

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

**Important :** les remises sont déjà intégrées aux totaux moteur. Leur présentation PDF détaillée sera harmonisée lors des LOT 3/4.

**Score cible : Original >= 9,5 / Premium >= 9,5**

## E5 — Historique

**État : ✅ candidat + lifecycle branché**

- recherche / filtres ;
- ouvrir / dupliquer ;
- Devis → Facture / BL ;
- statuts **Brouillon / Finalisé / Payé / Annulé** ;
- seule une facture peut être marquée payée ;
- document finalisé non supprimable ;
- annulation conserve définitivement le numéro ;
- seul un brouillon peut être supprimé.

**Score cible : UI 9,3 / UX 9,6**

## E6 — Réglages

**État : ✅ candidat fonctionnel**

- identité complète ;
- TVA ;
- logo / signature ;
- Original / Premium ;
- backup / restore ;
- installation PWA ;
- **préfixes de numérotation configurables** pour Devis / Facture / BL / BC ;
- préfixes réellement connectés au moteur LOT1.

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

### Implémenté

- [x] brouillon sans consommation d’un numéro définitif ;
- [x] séquence indépendante par `type + année` ;
- [x] préfixes configurables réellement reliés au moteur ;
- [x] numéro réservé dans la même transaction IndexedDB que la finalisation ;
- [x] numéro finalisé jamais réutilisé après annulation ;
- [x] suppression interdite après finalisation ;
- [x] document finalisé verrouillé en lecture seule ;
- [x] statuts `DRAFT / FINALIZED / PAID / CANCELLED` ;
- [x] `PAID` limité aux factures ;
- [x] validation client / objet / date / désignation ;
- [x] validation quantité > 0 ;
- [x] prix >= 0 ;
- [x] TVA 0..100 ;
- [x] remise ligne 0..100 % ;
- [x] remise globale 0..100 % ;
- [x] arrondi monétaire déterministe à 2 décimales ;
- [x] TVA calculée après remises ;
- [x] traçabilité conversion via `sourceDocumentId` ;
- [x] migration des anciens documents vers le lifecycle ;
- [x] protection contre un brouillon obsolète qui tenterait d’écraser un document finalisé ;
- [x] protection contre double finalisation / double consommation de numéro ;
- [x] compteurs IndexedDB `counters` DB v2 ;
- [x] restauration backup : compteurs reconstruits depuis les numéros immuables ;
- [x] tests purs : facture référence, remises/multi-TVA, validation, numérotation, préfixes.

### Gates LOT1 avant fermeture définitive

- [ ] test runtime `F-2026-001 → F-2026-002` ;
- [ ] suppression/annulation du 001 puis prochaine facture = 003, jamais 001 ;
- [ ] Devis / Facture / BL / BC ont des séquences indépendantes ;
- [ ] reset annuel vérifié ;
- [ ] double tap Finaliser ne réserve qu’un numéro ;
- [ ] stale draft ne peut pas écraser un finalisé ;
- [ ] migration d’un ancien document numéroté ;
- [ ] build TypeScript exact HEAD ;
- [ ] tests exact HEAD.

---

# LOT 2 — Clients & catalogue rapide

**État : ✅ CANDIDAT TECHNIQUE, runtime non certifié**

- [x] IndexedDB DB v3 : stores `clients` + `catalog` ;
- [x] clients réutilisables ;
- [x] nom / société / adresse / ICE / IF / téléphone / email ;
- [x] recherche et autocomplétion ;
- [x] snapshot client conservé sur le document ;
- [x] articles/prestations mémorisés après finalisation ;
- [x] dernier PU HT / TVA / unité réutilisables ;
- [x] prestations fréquentes ;
- [x] déduplication casse/accents/espaces ;
- [x] backup v2 clients + catalogue ; restore v1 accepté ;
- [x] aucune complexité ERP visible à l’utilisateur.

### Gates LOT2

- [ ] créer/retrouver une fiche client ;
- [ ] modifier fiche sans changer snapshot finalisé ;
- [ ] finaliser prestation puis la retrouver ;
- [ ] fréquence + déduplication ;
- [ ] backup v2 + restore v1 ;
- [ ] 390/430/768 ;
- [ ] build/tests exact HEAD.

---

# LOT 3 — PDF Original

**État : 🔄 ACTIF — référence source verrouillée**

Référence canonique : `docs/PDF_ORIGINAL_REFERENCE.md` + `src/referenceFixture.ts`.

Données source désormais figées dans la fixture :
- Benmoussa Rachid / TAPISTOR SABRE ;
- adresse / RC / Patente / CNSS / ICE / IF / RIB ;
- client du Secrétariat d’État ;
- objet et désignation source ;
- quantité 10 ; PU HT 800 ; TVA 20 % ; HT 8000 ; TTC 9600 ;
- Facture/BL détaillé `0107-2026` ; BL simple `06-07-2026`.

TEL / FAX / email / banque restent vides car non présents dans les références.

### Logo temporaire

- [x] logo fictif temporaire dans `src/brand.ts` : fond vert + canapé stylisé + `TS` ;
- [x] utilisé comme logo par défaut tant que le vrai logo n’est pas chargé dans E0/E6 ;
- [x] le logo temporaire n’est pas présenté comme actif officiel.

### PDF Original

- [x] A4 / tableau / HT / TVA / TTC / montant en lettres ;
- [x] BL sans prix ;
- [x] footer / signatures / multi-page / Page X/Y ;
- [x] fixture de référence source ;
- [x] tests calculs ancrés sur 8000 / 1600 / 9600 ;
- [ ] présentation explicite des remises quand utilisées ;
- [ ] snapshot client dans la sortie quand disponible ;
- [ ] reproduction quasi exacte des références ;
- [ ] typographie / marges / géométrie ;
- [ ] comparaison render source → render généré ;
- [ ] score >= 9,5.

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

Le mockup est une **cible**, pas une décoration.

---

# NEXT EXACT

1. **LOT 3 — rapprocher géométriquement PDF Original des références verrouillées**.
2. Intégrer snapshot client + remises dans PDF.
3. Rendre et comparer source vs généré jusqu’à >=9,5.
4. LOT 4 — PDF Premium + remises + polish.
5. Audit 390 / 430 / 768, E0 à E6.
6. Gates runtime LOT1/LOT2 + backup + offline + installation + partage.
7. Un seul run Actions final si utile.
8. Human gate → merge.

## Définition de DONE

Le projet est DONE quand : onboarding fiable, calculs prouvés, numérotation incorruptible, données sauvegardables/restaurables, mobile 390/430/768 propre, PDF Original/Premium >= 9,5, parcours téléphone complet, gates prouvés et validation humaine avant merge/déploiement.
