# F3 — UX Input → Devis

## Goal

Permettre depuis « Nouveau document » d'importer Photo/PDF/Excel/Word, traiter localement le fichier, afficher uniquement les champs incertains, puis ouvrir un **devis brouillon modifiable** dans l'éditeur existant.

## Goal visuel

Référence : `docs/mockups/F3_INPUT_TO_QUOTE_390.svg`.

- conserver le bottom-sheet glass existant ;
- mettre `Importer → devis` en premier, sans supprimer la création manuelle ;
- rendre Photo / PDF / Excel / Word immédiatement identifiables ;
- afficher clairement le traitement local ;
- revue ciblée, sans recopier tout le formulaire ;
- CTA final unique : `Créer le devis` ;
- conserver les cibles tactiles ≥ 44 px ;
- zéro overflow horizontal sur 390 / 430 / 768.

## Flow

`Nouveau document → Importer → source → extraction F2 → CanonicalQuoteJSON F1 → revue des ERROR uniquement → canonicalQuoteToDocumentFields() → DEVIS DRAFT → éditeur existant`

## Sécurité métier

- aucun prix, quantité, unité, TVA, ligne ou conversion de devise n'est inventé silencieusement ;
- les erreurs bloquantes restent visibles jusqu'à correction ;
- devise non supportée / absence de lignes : correction de la source requise ;
- les documents restent dans le navigateur ;
- le brouillon importé reste modifiable avant finalisation.

## Critères de certification

- [x] BEFORE 390 / 430 / 768 figé ;
- [x] Goal visuel écrit ;
- [x] mockup 390 px verrouillé avant implémentation ;
- [ ] entrée Importer → devis + Photo/PDF/Excel/Word prouvée en navigateur ;
- [ ] état de traitement local-first prouvé ;
- [ ] revue limitée aux champs incertains prouvée ;
- [ ] création du brouillon DEVIS via bridge F1 prouvée ;
- [ ] erreur/cancel/retry sans invention prouvé ;
- [ ] AFTER 390 / 430 / 768, 0 overflow / 0 erreur console / touch targets ;
- [ ] E2E réel import → revue → devis modifiable + score visuel.

## Harness final

Le scénario principal utilise un XLSX réel de deux lignes avec unité volontairement absente. La preuve attendue est exactement deux champs de revue, correction vers `READY`, puis ouverture de l'éditeur avec client, objet et deux lignes préremplis.
