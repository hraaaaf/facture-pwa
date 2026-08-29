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
3. **Cycle facture / encaissement** — CERTIFIÉ, MERGE PR #13 RESTANT
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

**État : CERTIFIÉ — PR #13 à merger après dernier passage CI du contrat Dashboard corrigé.**

Repo : `hraaaaf/facture-pwa`
Branche : `feat/invoice-payment-lifecycle`
Base : `ee14680c4637370ac253ca907e4e8fb64c64e721`
PR : `#13`
HEAD produit certifié : `312281897ae761dd6458cab340aecef23f95980e`

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

Certification principale :
- run `33275965240` : **SUCCESS** ;
- `114/114` tests, 20 fichiers ;
- build TypeScript/Vite/PWA feature : succès ;
- build baseline `main` : succès ;
- navigateur : `10/10` assertions ;
- garde-fous navigateur : surpaiement et paiement antérieur rejetés avec `0` écriture ;
- ledger final : `PAID`, `2` paiements, total encaissé exact ;
- BEFORE/AFTER : `390/430/768/1280` ;
- tous les viewports : `scrollWidth = innerWidth` ;
- zéro erreur page, zéro erreur console ;
- artefact `payment-lifecycle-before-after`, ID `9721508962`, taille `2 943 136` octets ;
- SHA-256 `96383f57681d763bcfc569dab0acdc5f1f2956b8ce56f390173f8ff5da5ca1e4` ;
- score visuel inspecté : **9,7/10**.

Validation croisée :
- run numérotation `33275965210` : **SUCCESS** ;
- preview Vercel du HEAD certifié `dpl_3nGcHactrYLZ2mDNoDztFhkbcwa4` : READY, HTTP 200 ;
- run Dashboard `33275965224` : tests `114/114` + builds feature/main verts, données dashboard correctes sur les 4 viewports, zéro erreur ; rouge uniquement parce que le script exigeait encore que `main` reproduise l’ancien bug Step 1 (`4 / 1 900 MAD`) ;
- contrat Dashboard corrigé au commit `9b2b20f51a53bc51884cb168e933f0dde62bca0b` pour vérifier la baseline déjà corrigée (`2 / 300 MAD`) et la non-régression feature ;
- HEAD final avant merge : `1042c0c74b1f099b74d97a1dce1ba493419ce1eb` ; delta depuis le HEAD produit certifié : uniquement `scripts/dashboard-stats-certification.mjs` + ce fichier canonique ;
- dernier cycle final lancé : Payment `33276278567`, Numbering `33276278558`, Dashboard `33276278565` ;
- aucun déploiement Vercel manuel lancé.

## Avancement audit remediation

**2/7 clos = 28,6 %.**

Après merge + production vérifiés de la PR #13 : **3/7 clos = 42,9 %.**

## Next exact

Obtenir le dernier cycle CI vert après correction du contrat Dashboard, passer la PR #13 ready, merger avec contrôle du HEAD, vérifier `main` post-merge et le déploiement automatique associé, puis ouvrir l’étape 4 — Recherche / filtres uniquement après le prochain Go utilisateur.
