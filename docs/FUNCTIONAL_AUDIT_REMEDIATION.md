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
   - « Cette année » filtre réellement l’année courante ;
   - DRAFT/CANCELLED exclus des KPI ;
   - FINALIZED/PAID uniquement ;
   - BL sans prix : document compté, montant = 0.

2. **Continuité / sauvegarde des données** — EN COURS
   - réduire le risque de perte lié au stockage uniquement local ;
   - conserver une solution simple, explicite et compatible PWA.

3. **Cycle facture / encaissement** — À FAIRE
   - échéance, retard, paiement partiel/acompte et mode de règlement selon le niveau minimal utile.

4. **Recherche / filtres** — À FAIRE
   - ICE, désignation, montant, période et filtres réellement utiles au volume.

5. **Gestion Clients / Catalogue** — À FAIRE
   - surfaces dédiées pour consulter, corriger et gérer la mémoire locale.

6. **Garde-fous OCR / imports lourds** — À FAIRE
   - limites de volume/pages, feedback et échec propre sur mobile.

7. **Actions mortes / cohérence UX** — À FAIRE
   - supprimer ou rendre fonctionnelle toute action visible sans comportement réel, notamment « Plus d’options ».

## Étape 1 — Dashboard annuel fiable

**État : CLOS — PR #11 mergée et production READY.**

Preuve canonique :
- PR `#11` : MERGED ;
- `main` : `cdf8306483e7749fffefc406e3e97782b7f04306` ;
- run `33274002642` : SUCCESS ;
- `102/102` tests ;
- build TypeScript/Vite/PWA + baseline `main` ;
- navigateur `7/7` assertions ;
- BEFORE/AFTER 390/430/768/1280, 0 overflow, 0 erreur page/console ;
- artefact `9720952874`, SHA-256 `766d8287196bebab96646b510c1c4ef856bf97fd9254efe1832f3b00e1c9d58e` ;
- production auto `dpl_EZWXTGhnXfDPPTCQY1vNrHuT2iJ2` READY ;
- alias public HTTP 200.

## Étape 2 — Continuité / sauvegarde des données

**Goal** : qu’un utilisateur ayant des documents locaux soit activement poussé à garder une copie récente hors du téléphone, sans compte ni cloud imposé.

**Succès attendu** :
- aucune alerte si aucun document ;
- données existantes sans sauvegarde : rappel visible ;
- sauvegarde < 7 jours : aucun rappel ;
- sauvegarde >= 7 jours : rappel ; >= 30 jours : urgence ;
- report « Demain » : 24 h ;
- bouton Sauvegarder : partage natif de fichier quand disponible, téléchargement JSON sinon ;
- les exports JSON historiques depuis Réglages sont aussi reconnus comme sauvegardes récentes ;
- BEFORE/AFTER 390/430/768/1280 sans overflow ni erreur navigateur.

**État : EN COURS — branche et certification à valider.**

Repo : `hraaaaf/facture-pwa`
Branche : `feat/backup-continuity`
Base : `cdf8306483e7749fffefc406e3e97782b7f04306`

## Avancement audit remediation

**1/7 clos = 14,3 %.**

## Next exact

Créer le candidat Step 2, ouvrir la PR, exécuter la certification complète, inspecter les captures/rapport, corriger si nécessaire puis closeout/merge si vert.
