# Factea — Functional Audit Remediation

Date de départ : 29 août 2026

## Goal global

Faire passer Factea de l’audit fonctionnel initial **8,6/10** à un niveau >= 9/10 sur les usages réels, sans sacrifier simplicité mobile, local-first, fiabilité métier ni preuve.

## Doctrine

- une étape est close uniquement avec code + tests + comportement observé + closeout cohérent ;
- UI/UX : BEFORE → Goal → implémentation → AFTER mêmes viewports → comparaison + tests + score visuel ;
- aucun déploiement Vercel manuel sans autorisation explicite ;
- une CI en cours n’arrête pas le travail indépendant.

## Séquence 1 → 7

1. **Dashboard annuel fiable** — CLOS
2. **Continuité / sauvegarde** — CLOS
3. **Cycle facture / encaissement** — CLOS
4. **Recherche / filtres** — CLOS
5. **Clients / Catalogue** — CLOS
6. **Garde-fous OCR / imports lourds** — CLOS
7. **Actions mortes / cohérence UX** — CLOS

## Étape 1 — Dashboard annuel fiable

**État : CLOS.**

Preuve :
- PR `#11` MERGED ; main `cdf8306483e7749fffefc406e3e97782b7f04306` ;
- run `33274002642` SUCCESS ; `102/102` tests ; navigateur `7/7` ;
- artefact `9720952874`, SHA-256 `766d8287196bebab96646b510c1c4ef856bf97fd9254efe1832f3b00e1c9d58e` ;
- production `dpl_EZWXTGhnXfDPPTCQY1vNrHuT2iJ2` READY ; HTTP 200.

## Étape 2 — Continuité / sauvegarde

**État : CLOS.**

Preuve :
- PR `#12` MERGED ; main `ee14680c4637370ac253ca907e4e8fb64c64e721` ;
- run `33274757981` SUCCESS ; `107/107` tests ; navigateur `7/7` ;
- numérotation `33274757955` SUCCESS ;
- artefact `9721171861`, SHA-256 `9f32f21e854dc00380dc3c5ef7270ce7bf23cc60004b3c34f689f651850d2ab5` ;
- production `dpl_4dSoPNeDURi3wwujXZbMq54umuLi` READY ; HTTP 200.

## Étape 3 — Cycle facture / encaissement

**État : CLOS.**

Fonctionnel : échéance, règlements partiels/acompte, mode, reste dû, retard, surpaiement refusé, historique append-only, compatibilité anciennes factures payées.

Preuve :
- PR `#13` MERGED ; merge `2d948ef1fa500eff9b2c42c73467733bf724a328` ;
- HEAD certifié `9a2c95a92a2744bbaa78d8034cee9891f1aa60da` ;
- Payment `33276330633`, Dashboard `33276330638`, Numbering `33276330645` SUCCESS ;
- `114/114` tests ; navigateur paiement `10/10` ;
- artefact `9721508962`, SHA-256 `96383f57681d763bcfc569dab0acdc5f1f2956b8ce56f390173f8ff5da5ca1e4` ;
- visuel **9,7/10** ; production `dpl_7qUeA92X8A8XnHAJtnABKknV8oQD` READY ; HTTP 200.

## Étape 4 — Recherche / filtres

**État : CLOS.**

Fonctionnel : recherche numéro/client/adresse/ICE/IF/objet/type/statut/désignation/unité, accents/casse, période, TTC min/max, BL sans prix = 0.

Preuve :
- PR `#14` MERGED ; merge `3f4b1405b91ccd4a6da753de4d5723d51e345981` ;
- HEAD produit certifié `3f9f2daa6e3147d3530c7310702ffa84575439ff` ;
- Search `33280408651`, Payment `33280408637`, Dashboard `33280408697` SUCCESS ;
- `121/121` tests ; navigateur Search `6/6` ;
- artefact `9722768087`, SHA-256 `598e369e587f6653e027c38d69d92524271935ea5528e236de221b53fbd68c1a` ;
- visuel **9,6/10** ; production `dpl_GMMvKZH1gnfcTQmdJJaQjCdSumwq` READY ; HTTP 200.

## Étape 5 — Clients / Catalogue

**État : CLOS.**

Fonctionnel : gestion dédiée clients/catalogue, recherche/création/édition/suppression, snapshots historiques finalisés immuables, IndexedDB local-first.

Preuve :
- PR `#15` MERGED ; merge `52d83c768b868a19c7bc70e83daa8a48df4fe93e` ;
- HEAD produit certifié `3c938d23e5ad4d8db293a21f1252b13261c356f9` ;
- Client Catalog `33281911403`, Search `33281911465`, Payment `33281911366`, Dashboard `33281911386` SUCCESS ;
- `125/125` tests ; navigateur `8/8` ;
- artefact `9723281876`, SHA-256 `73eb757f9a91da47031779b4f17c63b596d6be6afefc1f5d2bebf8e35153cd43` ;
- visuel **9,6/10** ; production `dpl_8De76g1SCeezHoXGeVrCdBWeL4hZ` READY ; HTTP 200.

## Étape 6 — Garde-fous OCR / imports lourds

**État : CLOS.**

Fonctionnel : 15 MiB max, PDF 20 pages max avant rendu/OCR, timeout 45 s, annulation réelle, erreurs distinctes, flux normal conservé.

Preuve :
- PR `#16` MERGED ; merge `1220599ae0d63fb17891ffcc4ff1f642e09fcf89` ;
- HEAD certifié `31bcf01c62fee24176e0522ba6862e221615d231` ;
- Import Guards `33307434951`, Client Catalog `33307434930` SUCCESS ;
- `130/130` tests ; navigateur Step 6 `8/8` ; régressions Dashboard `7/7`, Search `6/6`, Payment `10/10`, Client Catalog `8/8` ;
- artefact `9730935808`, SHA-256 `efb59fbdc264e0aa16ee61411280e32a6e1463e22d4a7b008196ea8473ef99af` ;
- visuel **9,7/10** ; production merge `dpl_5gZmu76QvwcZwhyXPP2QYUZTJ5yE` READY ; HTTP 200 ;
- closeout main `bcb5693829d8310c3653883b6d63f525ed0a5084` ; déploiement closeout `dpl_H6UiiCeuP5c4QLRhZBrYcBNxRred` READY.

## Étape 7 — Actions mortes / cohérence UX

**Goal** : supprimer les affordances visibles sans action, sans inventer de menu ni dupliquer les fonctions existantes.

**État : CLOS — PR #17 mergée et production READY.**

Fonctionnel vérifié :
- `Plus d’options` de l’éditeur n’est plus visible ;
- actions `Aperçu PDF`, `Enregistrer`, `Finaliser` conservées ;
- titre éditeur centré exactement à 390 / 430 / 768 / 1280 ;
- bouton dashboard `Réglages` vérifié fonctionnel et ouvre `SettingsScreen` ;
- zéro overflow, erreur page ou erreur console aux 4 viewports ;
- changement runtime limité à un CSS ciblé `.editor-more { display: none !important; }` et son import ;
- contrat historique Backup réaligné sur la baseline Step 2 sans modification runtime.

Preuve canonique :
- PR `#17` MERGED le 30 août 2026 ;
- HEAD certifié `92426a3282bf9291d8da3e8ade8654eb57dc8697` ;
- HEAD final branche `10c8af9839f29f37fca92c6256afbc6ea088250c` ;
- delta HEAD certifié → HEAD final : uniquement `docs/FUNCTIONAL_AUDIT_REMEDIATION.md` ;
- merge `main` `2b3ecabb6b58f09a65b92c160d007231d41d9149` ;
- compare HEAD final → merge : `0` fichier différent ;
- Action Coherence `33308786300`, Backup Continuity `33308786307`, Numbering Baseline `33308786301` : SUCCESS ;
- `23/23` fichiers de tests, `130/130` tests ;
- build TypeScript/Vite/PWA feature + baseline `main` : SUCCESS ;
- navigateur Step 7 `7/7` ; régressions Dashboard `7/7`, Search `6/6`, Payment `10/10`, Client Catalog `8/8` ;
- artefact `9731345392`, taille `4 247 413` octets, SHA-256 `542518a068532dd05cff62e531cb53d2df05c0eb84523761ca249c50775196f3` ;
- score visuel inspecté **9,8/10** ;
- preview HEAD certifié `dpl_AXUqfKvkFhAKsanvWfkhfy3KLbZU` READY ;
- production Git automatique exacte du merge `dpl_9JtD57jvhHJejUHM28vN5gpFhDaW` READY ;
- alias public `facture-pwa.vercel.app` HTTP 200 ; assets `/assets/index-CSqoegBf.js` et `/assets/index-CRZB9ebV.css` ;
- aucun déploiement Vercel manuel lancé.

## Ré-audit final

Méthode : ré-évaluation interne explicite des 8 axes fonctionnels historiques, moyenne arithmétique simple. Le `8,6/10` historique n’ayant pas de formule de pondération consignée, le score final est une mesure actuelle transparente, pas une reconstruction mathématique rétroactive.

| Axe | Score final | Preuve principale |
| --- | ---: | --- |
| Fiabilité moteur métier | 9,5 | numérotation, finalisation, paiements, dashboard certifiés |
| Création / gestion documents | 9,3 | cycle facture, historique, conversions et actions document |
| Import + voix | 9,5 | parseurs existants + garde-fous 15 MiB / 20 pages / 45 s / annulation |
| Mobile / offline / PWA | 9,1 | builds PWA + 390/430/768/1280 + local-first |
| Clients + catalogue | 9,3 | CRUD dédié + snapshots historiques préservés |
| Sauvegarde / continuité | 9,0 | rappel proactif + export complet + fraîcheur ; reste volontairement local/manual |
| Recherche / gestion | 9,2 | ICE/IF/lignes/montant/période + filtres certifiés |
| Efficacité technique | 8,8 | tests/builds solides ; résidu connu : chunks Vite > 500 kB |

**Score final de ré-audit : 9,2/10** (`73,7 / 8 = 9,2125`, arrondi à un décimal).

## Avancement audit remediation

**7/7 clos = 100 %.**

Le Goal global est atteint selon le ré-audit final documenté : score actuel **9,2/10 >= 9/10**.

## Résidus connus hors lot

- optimisation du bundle : build Vite signale encore des chunks supérieurs à `500 kB` (`503,57 kB` et `786,14 kB` sur la certification Step 7) ;
- la continuité reste volontairement local-first avec sauvegarde externe pilotée par l’utilisateur, pas une réplication cloud automatique.

Ces résidus ne rouvrent aucun des 7 défauts ciblés mais constituent les prochains axes d’optimisation si un nouveau chantier est ouvert.
