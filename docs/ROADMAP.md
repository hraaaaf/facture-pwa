# Facture PWA — Roadmap canonique

Dernière mise à jour : 27 août 2026

> Ordre de reprise : `docs/HANDOVER.md` → ce fichier → `docs/VOICE_INPUT_V1.md` → `docs/MOBILE_RUNTIME_AUDIT.md` → `docs/PDF_RUNTIME_CERTIFICATION.md` → `docs/PDF_ORIGINAL_REFERENCE.md` → `docs/PDF_ORIGINAL_GEOMETRY.md` → `docs/PDF_PREMIUM_VALIDATION.md` → `docs/UI_V1_MOBILE_SPEC.md` → `docs/mockups/MOCKUPS_LOCK.md`.

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

# FEATURE — Input → Devis

**État core F1–F4 : CLOSED — 37/37 critères validés**

## F1 — JSON canonique + normalisation — 10/10

- [x] schéma canonique versionné ;
- [x] normalisation champs client/devis/lignes ;
- [x] nombres FR/EN ;
- [x] dates ISO et DD/MM/YYYY ;
- [x] unités normalisées ;
- [x] dictionnaire exact sans fuzzy dangereux ;
- [x] devise MAD normalisée, devise non supportée fail-closed ;
- [x] doublons signalés sans suppression automatique ;
- [x] unité/TVA absentes fail-closed sauf défaut société explicite ;
- [x] bridge READY → `CommercialDocument` seulement.

Preuve : PR #2, F1 mergé via `0f6dc787b3dc18b785639caaeee35b92b29f7966`.

## F2 — Extracteurs locaux — 11/11

- [x] Excel ;
- [x] Word ;
- [x] PDF texte ;
- [x] image/screenshot OCR ;
- [x] PDF scanné OCR ;
- [x] reconstruction de tableaux structurés ;
- [x] extraction → RawQuotePayload ;
- [x] fixtures binaires réelles ;
- [x] 5 formats → canonical READY ;
- [x] tests + build exact-head ;
- [x] Chromium runtime réel, 0 erreur navigateur.

Preuve : PR #4, run exact-head `33051422061`, merge F2 `9132f913…`.

## F3 — UX Import → Devis — 10/10

- [x] BEFORE 390 / 430 / 768 ;
- [x] Goal visuel écrit ;
- [x] mockup 390 verrouillé avant code ;
- [x] Importer → devis + Photo/PDF/Excel/Word ;
- [x] traitement local explicite ;
- [x] revue limitée aux champs incertains ;
- [x] création DEVIS DRAFT via bridge F1 ;
- [x] erreur / annuler / réessayer fail-closed ;
- [x] AFTER 390 / 430 / 768, 0 overflow / 0 erreur console ;
- [x] E2E réel import → revue → devis modifiable + score visuel.

Preuve finale : PR #5, HEAD certifié `cd5b0cf4e61e3ef43ef3bc3bb2cf791bef925d1a`, run `33057697395` SUCCESS, artifact `9640352345`, merge `656c919da7e4dd7f59087bc3839533026cb0ffff`.

Runtime final F3 : XLSX réel → exactement 2 champs incertains → READY → DEVIS brouillon éditable 2 lignes ; 390/430/768 avec `scrollWidth === viewport` ; 0 erreur console.

**Score visuel F3 : 9,4/10.**

## F4 — Dictionnaire déterministe import — 6/6

- [x] BEFORE runtime avec BC fictif fautif figé ;
- [x] corrections lexicales explicites sur désignations ;
- [x] correction lexicale explicite de l'objet ;
- [x] unités déjà normalisées conservées ;
- [x] mots inconnus inchangés, aucun fuzzy/Levenshtein silencieux ;
- [x] AFTER runtime : même BC → devis corrigé, 34/34 tests, build, 0 erreur console.

Preuves : BEFORE run `33061683923`, artifact `9641980643`; AFTER PR #6, HEAD `4ed30a6803762e3c2a4e60d8b5a817ffd9acc9f6`, run `33064440749` SUCCESS, artifact `9643135193`, merge `9ca67186e1d79822e82bb64e1245ce0b7ffccc60`.

Corrections runtime certifiées : `Renouvelement linge hotellerie` → `Renouvellement linge hôtellerie`, `Drapp` → `Drap`, `bainn` → `bain`, `rectangulair` → `rectangulaire`; unités `pcs/unite/metres` → `Pièce/Unité/m`.

**Score visuel F4 : 9,5/10.** Le flow et les totaux restent identiques ; seules les corrections lexicales ciblées changent visiblement.

**Avancement core Input → Devis : 37/37 = 100 %.**

## V1 — Input vocal → Devis — 10/11

**État : WEB CERTIFIÉ, MICRO IPHONE RÉEL RESTANT**

- [x] Goal visuel + baseline BEFORE + mockup cible ;
- [x] cinquième source `Vocal` alignée Visual Polish V1 ;
- [x] dictée progressive avec fallback texte ;
- [x] transcription visible et modifiable ;
- [x] extraction déterministe client / lignes / PU / TVA sans LLM ;
- [x] réutilisation F4 + normalisation + revue canonique ;
- [x] tests 35/35 + build ;
- [x] runtime 390 / 430 / 768, zéro overflow / erreur console ;
- [x] touch targets : fermer 45×45, actions Vocal >=48 px ;
- [x] E2E Vocal → une revue date → DEVIS brouillon 2 lignes ;
- [ ] permission / dictée micro réelle sur iPhone + human gate.

Preuve web : PR #7, commit certifié `35c1fc6352ea6a0c3c98134891ae9786889fd424`, run `33104675409` SUCCESS, artifact `9659978460`.

**Score visuel web V1 : 9,6/10.**

Le core F1–F4 reste historiquement `37/37`. V1 est une extension séparée et ne modifie pas rétroactivement ce dénominateur.

---

# NEXT EXACT

1. Gate V1 : tester permission + dictée micro réelle sur iPhone quand un build accessible sur appareil sera disponible sans contourner la règle de déploiement.
2. Sur appareil réel : installation iPhone/Android puis fermeture/réouverture sans perte.
3. Tester partage PDF iOS/Android et partage/téléchargement/impression navigateur réel.
4. Human gate final de la PWA complète.
5. Merge global uniquement après validation humaine si encore requis par la branche de release.

## Avancement mécanique historique PWA

**110 critères implémentés/observés sur 116 = 94,8 %.**

> Ce pourcentage historique ne comprend pas les 37 critères séparés de la feature Input → Devis ni l'extension V1 Vocal. Il reste inchangé tant que le périmètre mécanique historique n'est pas officiellement recalculé.

## Définition de DONE PWA globale

Le chantier PWA global reste dépendant des gates appareil réel/partage/human gate ci-dessus. Le core Input → Devis F1–F4 est CLOSED et mergé. L'extension V1 Vocal est web-certifiée mais reste ouverte sur le gate micro iPhone réel et le human gate. Aucun Vercel sans autorisation explicite.