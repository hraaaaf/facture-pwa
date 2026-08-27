# ROADMAP — Facture PWA

## Extension — Input → Devis

**Goal** : transformer un fichier ou une image (PDF, Excel, Word, screenshot/photo) en `CanonicalQuoteJSON`, faire vérifier uniquement les incertitudes, puis créer un devis modifiable avec le moteur métier existant.

### F1 — Canon JSON + broyeur — 10/10 ✅

- [x] schéma `CanonicalQuoteJSON` versionné ;
- [x] alias FR/EN et nombres normalisés ;
- [x] dictionnaire métier configurable ;
- [x] provenance SOURCE / DICTIONARY / DEFAULT ;
- [x] champs critiques manquants en `REVIEW_REQUIRED` ;
- [x] devise non supportée bloquée sans conversion implicite ;
- [x] doublons et incohérences signalés ;
- [x] pont vers `CommercialDocument` ;
- [x] tests unitaires dédiés ;
- [x] intégration couverte par tests/build descendant F2.

### F2 — Extracteurs locaux — 11/11 ✅

- [x] détection PDF / Excel / Word / image / texte ;
- [x] Excel : cellules + tableaux ;
- [x] Word : texte + tableaux DOCX ;
- [x] PDF texte : reconstruction spatiale des lignes/colonnes ;
- [x] image : OCR local + reconstruction tabulaire ;
- [x] PDF scanné : rendu page → OCR local ;
- [x] extraction client / objet / date / devise ;
- [x] conversion vers `RawQuotePayload` sans invention silencieuse ;
- [x] fidélité des 2 lignes de fixture jusqu'au JSON canonique ;
- [x] tests + build exact-head ;
- [x] runtime Chromium sur 5 formats réels, zéro erreur navigateur.

**Preuve F2** : run `33051422061` SUCCESS sur HEAD reconstruit `80c0fc1a14425219269bceff4516c02ba3de7d67`, puis merge `9132f9134cb87c6205a462802c547d8d4bf11486`.

### F3 — UX Input → Devis — 2/10 🟡

- [x] BEFORE 390 / 430 / 768 récupéré et figé ;
- [x] Goal visuel écrit ;
- [ ] mockup mobile de référence verrouillé ;
- [ ] entrée Importer → devis + Photo/PDF/Excel/Word ;
- [ ] état de traitement clair et local-first ;
- [ ] revue limitée aux champs incertains ;
- [ ] création d'un `CommercialDocument` brouillon via le bridge F1 ;
- [ ] erreurs/retry/cancel sans donnée inventée ;
- [ ] AFTER 390 / 430 / 768, zéro overflow/erreur, cibles tactiles conformes ;
- [ ] E2E réel import → revue → devis modifiable + score visuel.

## Avancement Input → Devis

**23 / 31 critères validés = 74,2 %**.

Ne recalculer qu'à partir des critères ci-dessus réellement prouvés.
