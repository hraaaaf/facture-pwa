# Facture PWA — Roadmap canonique

Dernière mise à jour : 26 août 2026

> Ordre de reprise : `docs/HANDOVER.md` → ce fichier → `docs/MOBILE_RUNTIME_AUDIT.md` → `docs/PDF_RUNTIME_CERTIFICATION.md` → `docs/PDF_ORIGINAL_REFERENCE.md` → `docs/PDF_ORIGINAL_GEOMETRY.md` → `docs/PDF_PREMIUM_VALIDATION.md` → `docs/UI_V1_MOBILE_SPEC.md` → `docs/mockups/MOCKUPS_LOCK.md`.

## Goal global

Créer une PWA mobile-first, installable sur iPhone et Android, très simple à utiliser, permettant de produire **Devis, Factures, Bons de livraison et Bons de commande**, avec calculs fiables, stockage local, mémoire clients/catalogue et PDF A4 professionnels.

## Doctrine de preuve

- `[x]` = implémentation ou comportement vérifié par code, donnée, source, runtime ou inspection visuelle disponible ;
- `[ ]` = gate de certification encore ouverte ;
- un lot candidat n'est pas DONE tant que ses gates critiques ne sont pas prouvées ;
- GitHub Actions reste manuel et rare ;
- aucun Vercel sans autorisation explicite.

---

# LOT 0 — Fondation / PWA

**État : RUNTIME WEB EXACT-HEAD PROUVÉ, appareil réel non certifié**

- [x] React + TypeScript + Vite ;
- [x] PWA / service worker ;
- [x] IndexedDB local ;
- [x] 4 types de documents ;
- [x] calculs HT / TVA / TTC ;
- [x] montant TTC en lettres ;
- [x] historique / recherche ;
- [x] E0 onboarding société ;
- [x] identité société structurée ;
- [x] logo + signature locaux ;
- [x] export / restauration JSON ;
- [x] choix PDF Original/Premium ;
- [x] surface d'installation PWA : prompt + fallback iOS/Android + PNG 180/192/512 + manifest/iOS branchés ;
- [x] workflow GitHub `workflow_dispatch` uniquement ;
- [x] safe-area CSS prévue.

Preuve finale web : run `33007119765`, artifact `9621115970`, HEAD certifié `c2873b7c6ff6446aae8b797fb7e0233de4ea061d`.

Gates :

- [x] `npm test` HEAD exact final ;
- [x] `npm run build` HEAD exact final ;
- [ ] installation réelle iPhone/Android ;
- [x] offline réel ;
- [ ] fermeture/réouverture sans perte sur appareil réel.

---

# UI V1 — E0 à E6 + Visual Polish

**État : RUNTIME AUDITÉ**

- [x] E0 premier démarrage 5 étapes ;
- [x] E1 dashboard ;
- [x] E2 nouveau document ;
- [x] E3 éditeur ;
- [x] E4 aperçu PDF ;
- [x] E5 historique/lifecycle ;
- [x] E6 réglages ;
- [x] Visual Polish V1 : glass, bottom bar, FAB, cartes et surfaces harmonisées.

Preuves : run `32959150633`, artifact `9603634672`, complété par run final `33007119765`.

Gates :

- [x] vraie capture runtime 390 px ;
- [x] vraie capture runtime 430 px ;
- [x] vraie capture runtime 768 px ;
- [x] zéro overflow / erreur console ;
- [x] score UI global officiel >= 9,3/10.

**Score visuel runtime global : 9,3/10.**

---

# LOT 1 — Moteur métier production-grade

**État : EXACT-HEAD FINAL PROUVÉ**

- [x] brouillon sans numéro définitif ;
- [x] séquence indépendante type + année ;
- [x] préfixes configurables ;
- [x] réservation du numéro dans la transaction de finalisation ;
- [x] numéro finalisé non réutilisable ;
- [x] statuts DRAFT / FINALIZED / PAID / CANCELLED ;
- [x] seul FACTURE peut être PAYÉ ;
- [x] document finalisé non supprimable ;
- [x] validation client/objet/lignes/TVA/prix/remises ;
- [x] remise ligne puis remise globale puis TVA ;
- [x] arrondi monétaire déterministe ;
- [x] traçabilité conversion via `sourceDocumentId`.

Durcissements : suppression brouillon atomique, stale draft protégé, préfixes non vides et distincts, restauration refusée si collision de numéro final.

Gates :

- [x] `001 → 002` runtime ;
- [x] annulation puis `003` ;
- [x] séquences Devis/Facture/BL/BC indépendantes ;
- [x] reset annuel ;
- [x] double tap Finaliser ;
- [x] stale draft ;
- [x] migration legacy ;
- [x] tests/build HEAD exact final.

Preuves cumulées : runs `32963581880`, `32966380813`, `32977943138`, final exact-head `33007119765`.

---

# LOT 2 — Clients & catalogue rapide

**État : RUNTIME + REVUE MOBILE DÉDIÉE PROUVÉS**

- [x] IndexedDB DB v3 `clients` + `catalog` ;
- [x] fiche client locale ;
- [x] autocomplétion/recherche ;
- [x] snapshot historique adresse/ICE/IF ;
- [x] prestations apprises après finalisation ;
- [x] dernier PU HT / TVA / unité ;
- [x] déduplication casse/accents/espaces ;
- [x] backup v2 + restore v1 compatible.

Gates :

- [x] créer/retrouver client runtime ;
- [x] snapshot inchangé après modification ;
- [x] prestation retrouvée après finalisation ;
- [x] fréquence/déduplication runtime ;
- [x] backup v2 réel ;
- [x] restore v1 réel ;
- [x] revue mobile 390/430/768 des suggestions/sheets.

Run final `33007119765` : suggestions + fiche client sur 390/430/768, zéro overflow/erreur, bouton fermer 44×44 px.

---

# LOT 3 — PDF Original

**État : CERTIFIÉ WEB, appareil réel non requis pour le rendu**

Sources : `docs/PDF_RUNTIME_CERTIFICATION.md`, `docs/PDF_ORIGINAL_REFERENCE.md`, `docs/PDF_ORIGINAL_GEOMETRY.md`, `src/referenceFixture.ts`.

- [x] données source verrouillées depuis les PDF fournis ;
- [x] fixture facture `#0107-2026` ;
- [x] fixture BL détaillé `#0107-2026` ;
- [x] fixture BL simple `#06-07-2026` sans client/prix ;
- [x] géométrie en-tête rapprochée de la source ;
- [x] objet gras + souligné ;
- [x] tableau tarifé + totals dans le même cadre ;
- [x] BL simple 3 colonnes placé plus bas ;
- [x] snapshot client conditionnel ;
- [x] remises conditionnelles ;
- [x] footer légal reconstruit depuis champs structurés.

Gates :

- [x] génération jsPDF sur les blobs produit au HEAD ;
- [x] rendu PNG du PDF généré à 180 dpi ;
- [x] comparaison source → généré effectuée ;
- [x] test multi-page réel ;
- [x] tests/build HEAD exact final ;
- [x] score officiel Original >= 9,5/10.

**Score final Original : 9,5/10.**
Preuve post-run : rendu 200 dpi, comparaison visuelle source → artifact `9621115970`; multi-page = 4 pages propres sans chevauchement visible.

---

# LOT 4 — PDF Premium

**État : CERTIFIÉ WEB, partage navigateur réel restant**

- [x] second template Premium ;
- [x] hiérarchie document/société/date ;
- [x] snapshot client adresse/ICE/IF ;
- [x] remise ligne visible sous désignation ;
- [x] remise globale séparée ;
- [x] résumé HT/TVA/TTC dynamique ;
- [x] footer légal structuré ;
- [x] aperçu HTML aligné sur les mêmes règles ;
- [x] rendu jsPDF sur les blobs produit au HEAD.

Gates :

- [x] multi-page réel ;
- [ ] partage/téléchargement/impression navigateur réel ;
- [x] revue aperçu Premium 390/430/768 ;
- [x] tests/build exact HEAD final ;
- [x] score officiel Premium >= 9,5/10.

**Score final Premium : 9,5/10.**
Run `33007119765` : Premium explicite sur 390/430/768, zéro overflow/erreur, actions 56 px ; multi-page = 3 pages propres sans chevauchement visible.

---

# LOT 5 — Certification finale mobile / PWA

**État : WEB CERTIFIÉ, APPAREIL RÉEL + HUMAN GATE RESTANTS**

- [x] E0 stockage vierge → onboarding → données persistées après reload ;
- [x] parcours document complet avec finalisation ;
- [x] finalisation + réouverture ;
- [x] historique/lifecycle complet réel ;
- [x] gates LOT1 ;
- [x] gates LOT2 ;
- [x] PDF Original runtime ;
- [x] PDF Premium runtime ;
- [x] 390 / 430 / 768 ;
- [x] zéro overflow ;
- [x] contrôles critiques >=44 px ;
- [x] offline ;
- [x] backup / restore ;
- [ ] partage PDF iOS/Android ;
- [x] un seul run GitHub Actions final si utile ;
- [ ] human gate ;
- [ ] merge uniquement après preuves.

Run final `33007119765` / artifact `9621115970` : 15/15 tests, build, audit prod 0 vulnérabilité, v4 10 assertions, Premium/mobile 2 assertions, 0 page/console error, offline=true, cibles tactiles 44,325/45/56 px selon contrôle.

---

# NEXT EXACT

1. Sur appareil réel : installer sur iPhone/Android puis fermer/réouvrir sans perte.
2. Tester partage PDF iOS/Android et partage/téléchargement/impression navigateur réel.
3. Human gate final.
4. Merge uniquement après validation humaine.

## Avancement mécanique

**110 critères implémentés/observés sur 116 = 94,8 %.**

## Définition de DONE

Le chantier est DONE uniquement quand les 6 gates restantes sont prouvées : installation réelle iPhone/Android, fermeture/réouverture sans perte, partage/téléchargement/impression navigateur réel, partage PDF iOS/Android, human gate, puis merge. Aucun Vercel sans autorisation explicite.
