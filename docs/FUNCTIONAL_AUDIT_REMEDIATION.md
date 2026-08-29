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
2. **Continuité / sauvegarde des données** — CERTIFIÉ, MERGE PR #12 RESTANT
3. **Cycle facture / encaissement** — À FAIRE
4. **Recherche / filtres** — À FAIRE
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

**Succès attendu** :
- échéance optionnelle mais validée, jamais antérieure à la date facture ;
- mode de règlement prévu ;
- paiements/acompte append-only après finalisation ;
- aucun paiement nul, négatif, antérieur à la facture ou supérieur au reste dû ;
- calcul fiable Total / Encaissé / Reste ;
- états opérationnels À encaisser / Partiel / En retard / Payé ;
- passage automatique à PAID quand le reste atteint zéro ;
- compatibilité avec les anciennes factures PAID sans historique détaillé ;
- historique + éditeur cohérents sur mobile ;
- BEFORE/AFTER 390/430/768/1280, zéro overflow et zéro erreur navigateur.

**État : EN COURS.**

Repo : `hraaaaf/facture-pwa`
Branche : `feat/invoice-payment-lifecycle`
Base : `ee14680c4637370ac253ca907e4e8fb64c64e721`

## Avancement audit remediation

**2/7 clos = 28,6 %.**

## Next exact

Construire le candidat Step 3, exécuter tests/build, ouvrir la PR et certifier le cycle d’encaissement BEFORE/AFTER avant tout merge.
