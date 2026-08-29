# Factea — Functional Audit Remediation

Date de départ : 29 août 2026

## Goal global

Faire passer Factea de l’audit fonctionnel initial **8,6/10** à un niveau >= 9/10 sur les usages réels, sans sacrifier la simplicité mobile, le local-first, la fiabilité métier ni la preuve.

## Doctrine

- chaque étape est close uniquement avec preuve ;
- aucune promotion/déploiement Vercel manuel sans autorisation explicite ;
- les changements UI conservent une preuve BEFORE/AFTER aux viewports pertinents ;
- une CI en cours ne bloque pas le travail indépendant ;
- `DONE` = code + tests + comportement observé + closeout cohérent.

## Séquence 1 → 7

1. **Dashboard annuel fiable** — CLOS
2. **Continuité / sauvegarde des données** — CLOS
3. **Cycle facture / encaissement** — CLOS
4. **Recherche / filtres** — CERTIFIÉ — merge en cours
5. **Gestion Clients / Catalogue** — À FAIRE
6. **Garde-fous OCR / imports lourds** — À FAIRE
7. **Actions mortes / cohérence UX** — À FAIRE

## Étape 1 — Dashboard annuel fiable

**État : CLOS — PR #11 mergée et production READY.**

Preuve canonique :
- PR `#11` : MERGED ;
- `main` : `cdf8306483e7749fffefc406e3e97782b7f04306` ;
- run `33274002642` : SUCCESS ;
- `102/102` tests ;
- navigateur `7/7` assertions ;
- artefact `9720952874`, SHA-256 `766d8287196bebab96646b510c1c4ef856bf97fd9254efe1832f3b00e1c9d58e` ;
- production auto `dpl_EZWXTGhnXfDPPTCQY1vNrHuT2iJ2` READY ;
- alias public HTTP 200.

## Étape 2 — Continuité / sauvegarde des données

**État : CLOS — PR #12 mergée et production READY.**

Preuve canonique :
- PR `#12` : MERGED ;
- `main` : `ee14680c4637370ac253ca907e4e8fb64c64e721` ;
- run `33274757981` : SUCCESS, `107/107` tests, navigateur `7/7` ;
- run numérotation `33274757955` : SUCCESS ;
- artefact `9721171861`, SHA-256 `9f32f21e854dc00380dc3c5ef7270ce7bf23cc60004b3c34f689f651850d2ab5` ;
- production auto `dpl_4dSoPNeDURi3wwujXZbMq54umuLi` READY ;
- alias public HTTP 200.

## Étape 3 — Cycle facture / encaissement

**Goal** : une facture doit permettre de suivre l’échéance et les règlements réels sans perdre la simplicité mobile ni affaiblir le verrouillage après finalisation.

**État : CLOS — PR #13 mergée et production READY.**

Fonctionnel vérifié :
- échéance + mode de règlement prévu sur facture ;
- historique d’encaissement append-only ;
- acompte et paiement partiel avec reste dû ;
- surpaiement refusé sans écriture ;
- paiement antérieur à la facture refusé sans écriture ;
- second règlement soldant la facture persiste et passe automatiquement à `PAID` ;
- ancienne facture `PAID` sans ledger détaillé reste considérée soldée ;
- historique distingue `À encaisser`, `En retard` et `Payé` ;
- données de règlement intégrées au document local et donc au backup JSON existant.

Preuve canonique :
- PR `#13` : MERGED le 29 août 2026 ;
- HEAD certifié : `9a2c95a92a2744bbaa78d8034cee9891f1aa60da` ;
- merge `main` : `2d948ef1fa500eff9b2c42c73467733bf724a328` ;
- compare HEAD certifié → merge : `0` fichier différent ;
- Payment Lifecycle `33276330633` : SUCCESS ;
- Dashboard Stats `33276330638` : SUCCESS ;
- Numbering Baseline `33276330645` : SUCCESS ;
- `114/114` tests, build TypeScript/Vite/PWA + baseline `main` ;
- navigateur paiement : `10/10` assertions ;
- BEFORE/AFTER `390/430/768/1280`, zéro overflow, zéro erreur page/console ;
- artefact principal `9721508962`, SHA-256 `96383f57681d763bcfc569dab0acdc5f1f2956b8ce56f390173f8ff5da5ca1e4` ;
- score visuel inspecté : **9,7/10** ;
- production auto `dpl_7qUeA92X8A8XnHAJtnABKknV8oQD` : READY sur le commit exact de merge ;
- alias public `facture-pwa.vercel.app` : HTTP 200 ;
- aucun déploiement Vercel manuel lancé.

Note CI :
- l’ancien rouge Dashboard `33275965224` venait d’un contrat historique exigeant encore le bug Step 1 sur la baseline ;
- contrat corrigé au commit `9b2b20f51a53bc51884cb168e933f0dde62bca0b` ;
- cycle final Dashboard `33276330638` : SUCCESS.

## Étape 4 — Recherche / filtres

**Goal** : rendre l’historique réellement exploitable sur mobile avec recherche par ICE / IF / désignation ligne, filtre montant TTC et période, sans alourdir l’interface.

**État : CERTIFIÉ — PR #14 prête au merge.**

Fonctionnel vérifié :
- recherche texte couvre numéro, client, adresse, ICE, IF, objet, type, statut, désignation et unité ;
- recherche insensible à la casse et aux accents ;
- filtres de type existants conservés ;
- périodes `Toutes les dates`, `Ce mois`, `Cette année`, `Personnalisée` ;
- bornes personnalisées inclusives ;
- montant TTC min/max ;
- BL sans prix traité à `0` pour le filtre montant ;
- panneau avancé compact, fermé par défaut, responsive mobile.

Preuve canonique avant merge :
- PR `#14` ;
- HEAD final certifié : `3f9f2daa6e3147d3530c7310702ffa84575439ff` ;
- Search Filters `33280408651` : SUCCESS ;
- Payment Lifecycle `33280408637` : SUCCESS ;
- Dashboard Stats `33280408697` : SUCCESS ;
- `121/121` tests ;
- navigateur Search : `6/6` assertions ;
- BEFORE/AFTER `390/430/768/1280`, zéro overflow, zéro erreur page/console ;
- artefact Search `9722768087`, SHA-256 `598e369e587f6653e027c38d69d92524271935ea5528e236de221b53fbd68c1a` ;
- score visuel inspecté : **9,6/10** ;
- preview Vercel PR : READY ;
- aucun déploiement Vercel manuel lancé.

Note CI :
- un ancien contrat Payment Lifecycle exigeait encore la baseline pré-Step 3 ;
- ce contrat a été aligné sur `main` certifié ;
- le HEAD final humain `3f9f2daa...` a ensuite obtenu les trois certifications SUCCESS.

## Avancement audit remediation

**3/7 clos + Step 4 certifié, merge en cours.**

## Next exact

Merge PR #14 → vérifier production automatique → fermer Step 4 → human gate avant Step 5.
