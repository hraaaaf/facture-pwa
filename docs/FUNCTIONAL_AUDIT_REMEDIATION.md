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

**Goal** : qu’un utilisateur ayant des documents locaux soit activement poussé à garder une copie récente hors du téléphone, sans compte ni cloud imposé.

**État : CERTIFIÉ — PR #12 à merger.**

Repo : `hraaaaf/facture-pwa`
Branche : `feat/backup-continuity`
Base : `cdf8306483e7749fffefc406e3e97782b7f04306`
HEAD produit certifié : `9c94d56c6313bebe2aa0016f1e6ce30ac48b9334`
PR : `#12`

Fonctionnel :
- aucune alerte sans document ;
- données sans sauvegarde : rappel visible ;
- sauvegarde < 7 jours : aucun rappel ;
- sauvegarde >= 7 jours : rappel ; >= 30 jours : urgence ;
- report `Demain` : 24 h ;
- backup généré au clic pour inclure l’état local le plus récent ;
- partage natif de fichier si disponible, téléchargement JSON sinon ;
- export historique depuis Réglages reconnu comme sauvegarde récente.

Certification :
- run `33274757981` : **SUCCESS** ;
- `107/107` tests, 19 fichiers ;
- build TypeScript/Vite/PWA feature : succès ;
- build baseline `main` : succès ;
- navigateur : `7/7` assertions ;
- téléchargement réel : `facture-pwa-backup-2026-08-29.json` ;
- `lastBackupAt` écrit après succès, `snoozedUntil` vide ;
- BEFORE : aucun rappel ; AFTER : rappel `Sauvegarde à faire` ;
- 390/430/768/1280 : `scrollWidth = innerWidth` ;
- 0 erreur page, 0 erreur console ;
- artefact `backup-continuity-before-after`, ID `9721171861`, SHA-256 `9f32f21e854dc00380dc3c5ef7270ce7bf23cc60004b3c34f689f651850d2ab5` ;
- score visuel du lot : **9,7/10** ; rappel flottant sans déplacement de layout.

Validation croisée :
- run numérotation `33274757955` : **SUCCESS**, y compris tests/build/browser/report ;
- preview Vercel automatique du HEAD produit : `dpl_4FuhezgPfXxzuZAa6GNtbYr7EDqY` READY ;
- aucun déploiement Vercel manuel lancé.

## Avancement audit remediation

Avant merge PR #12 : **1/7 clos, étape 2 certifiée**.
Après merge vérifié : **2/7 clos = 28,6 %**.

## Next exact

Merger la PR #12 avec contrôle du SHA, vérifier `main` post-merge et le déploiement automatique associé, puis ouvrir l’étape 3 : cycle facture / encaissement.
