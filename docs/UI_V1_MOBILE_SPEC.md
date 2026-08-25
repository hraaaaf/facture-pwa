# Facture PWA — UI V1 Mobile Target

## Goal

Créer une PWA mobile-first, utilisable sur iPhone et Android, avec une interface simple, tactile et premium. Le mockup validé sert de cible visuelle.

## Direction visuelle verrouillée

- mobile-first ;
- navigation basse de type app native ;
- bouton central + flottant ;
- bottom bars et actions en glassmorphism ;
- surfaces blanches / translucides, blur léger, ombres diffuses ;
- accent principal vert ;
- boutons et champs tactiles >= 44 px ;
- safe areas iOS respectées ;
- aucune surcharge fonctionnelle visible ;
- animations courtes 150–220 ms ;
- priorité à la lisibilité et à la vitesse de saisie.

## Navigation globale

Bottom navigation principale :

1. Accueil
2. Bouton central + Nouveau
3. Historique

Sur les écrans métier, la bottom bar devient contextuelle : Aperçu / Enregistrer / PDF / Partager / Imprimer selon l’écran.

---

## E1 — Accueil ✅ candidat

### But

Permettre de comprendre l’app et créer un document en moins de 3 secondes.

### Composants

- header compact avec nom de l’app et accès Réglages ;
- bloc Aperçu avec compteurs Devis / Factures / BL / BC ;
- section Documents récents ;
- bottom navigation glassmorphism ;
- bouton central + proéminent ;
- indicateur local/offline discret.

### Comportements

- tap sur + ouvre E2 Nouveau document ;
- tap sur un document récent ouvre E3 Éditeur ;
- tap sur Historique ouvre E5 ;
- tap sur Réglages ouvre E6.

### Critères de succès

- aucune action principale à plus de 2 taps ;
- zéro overflow à 390 px ;
- boutons >= 44 px ;
- premier contenu utile visible sans scroll à 390/430 px.

### Score cible

UI 9.5 / UX 9.7

---

## E2 — Nouveau document ✅ candidat

### But

Choisir le type de document sans ambiguïté.

### Composants

- sheet / page courte ;
- 4 cartes : Devis, Facture, Bon de livraison, Bon de commande ;
- icône + libellé + micro-description ;
- fermeture / retour en haut.

### Comportements

- chaque carte crée un brouillon et ouvre E3 ;
- aucun numéro définitif consommé tant que le document n’est pas finalisé ;
- BL démarre sans prix par défaut, avec option prix dans E3.

### Critères de succès

- choix en 1 tap ;
- aucune liste déroulante inutile ;
- distinction visuelle immédiate des 4 types.

### Score cible

UI 9.4 / UX 9.8

---

## E3 — Éditeur document ✅ candidat

### But

Créer un document complet très vite sur mobile.

### Structure

1. header : type + statut Brouillon ;
2. bloc Client ;
3. bloc Objet ;
4. bloc Articles ;
5. totaux live ;
6. montant en lettres ;
7. bottom action bar glassmorphism.

### Client

- recherche / sélection client ;
- création rapide d’un nouveau client ;
- dernier client réutilisable.

### Ligne article

- désignation ;
- unité ;
- quantité ;
- PU HT ;
- TVA ;
- remise éventuelle ;
- Total HT calculé immédiatement.

### Comportements moteur

- Total ligne HT = quantité × PU HT ;
- somme automatique des lignes ;
- TVA ligne par ligne ;
- Total TTC automatique ;
- montant TTC en lettres ;
- recalcul immédiat après toute modification ;
- ajout / suppression de ligne sans rechargement ;
- valeurs numériques avec clavier mobile décimal ;
- BL sans prix masque PU, TVA et totaux ;
- conversion Devis → Facture / BL sans ressaisie.

### Bottom bar

- Aperçu ;
- Enregistrer ;
- Plus.

Le bouton Enregistrer est l’action dominante. Les actions doivent rester accessibles au pouce sans masquer le contenu.

### Critères de succès

- saisie complète d’une facture simple en < 60 s ;
- aucune perte de données lors d’un retour écran ;
- 0 contrôle < 44 px ;
- clavier ne doit pas cacher le champ actif ou la CTA principale ;
- calculs visuellement vérifiables en live.

### Score cible

UI 9.4 / UX 9.8 / moteur 9.8

---

## E4 — Aperçu / PDF ✅ candidat

### But

Voir exactement ce qui sera envoyé ou imprimé.

### Composants

- aperçu A4 scrollable ;
- badge type de document ;
- numéro / date ;
- données société / client ;
- tableau ;
- HT / TVA / TTC ;
- montant en lettres ;
- signatures ;
- footer légal ;
- bottom bar actions.

### Bottom bar

- Partager ;
- Télécharger PDF ;
- Imprimer.

### Deux modèles PDF

1. Original : fidèle aux documents source.
2. Premium : composition moderne et professionnelle.

### Comportements

- partage natif via Web Share API quand disponible ;
- fallback téléchargement PDF ;
- pagination multi-page ;
- répétition header tableau ;
- aucune ligne coupée de manière illisible ;
- Page X/Y ;
- nom de fichier propre ;
- aucun élément UI dans le PDF.

### Critères de succès

- Original >= 9.5/10 de fidélité ;
- Premium >= 9.5/10 visuellement ;
- aucune collision, aucun dépassement, aucun footer tronqué ;
- résultat identique sur iOS / Android / desktop.

### Score cible

UI 9.5 / PDF Original 9.5+ / PDF Premium 9.5+

---

## E5 — Historique ✅ candidat

### But

Retrouver un document en quelques secondes.

### Composants

- recherche locale instantanée ;
- filtres rapides : Tous / Factures / Devis / BL / BC ;
- cartes glass premium ;
- état de persistance « Enregistré » ;
- client ;
- numéro ;
- date ;
- objet ;
- TTC si pertinent.

### Actions implémentées

- ouvrir ;
- dupliquer vers un nouveau brouillon ;
- convertir un devis en facture ;
- convertir un devis en BL ;
- supprimer avec confirmation.

### À réserver au lot moteur métier

- statuts comptables Brouillon / Finalisé / Payé / Annulé ;
- verrouillage définitif du numéro après finalisation ;
- annulation sans réutilisation du numéro.

### Critères de succès

- document récent retrouvé en < 5 s ;
- recherche et filtres sans rechargement ;
- actions tactiles utilisables au pouce ;
- aucune ambiguïté entre état « enregistré » et statut comptable futur.

### Score cible

UI 9.3 / UX 9.6

---

## E6 — Réglages

### But

Configurer une fois, puis oublier.

### Sections

- Entreprise ;
- Numérotation ;
- TVA ;
- Modèle PDF ;
- Logo ;
- Signature ;
- Sauvegarde / restauration ;
- PWA / installation.

### Entreprise

- nom / raison sociale ;
- marque ;
- adresse ;
- ICE / IF / RC / CNSS ;
- RIB ;
- ville ;
- mentions légales.

### PDF

- Original / Premium ;
- aperçu miniature ;
- logo ;
- signature ;
- footer.

### Sauvegarde

- exporter toutes les données locales en fichier ;
- restaurer depuis un fichier ;
- aucune dépendance à un compte ou cloud pour la V1.

### Critères de succès

- réglages compréhensibles sans manuel ;
- aucune option technique exposée inutilement ;
- export / import simple et sûr.

### Score cible

UI 9.2 / UX 9.5

---

## Design system V1

### Couleurs

- fond principal : #F4F5F3 ;
- texte : #111111 ;
- accent : vert type WhatsApp moderne ;
- surfaces glass : blanc translucide avec blur ;
- danger : rouge discret ;
- statuts secondaires : bleu / violet / orange uniquement comme accents.

### Rayons

- cartes : 18–24 px ;
- champs : 14–16 px ;
- bottom bar : 26–32 px ;
- bouton + : cercle 54–60 px.

### Tactile

- minimum : 44 × 44 px ;
- CTA principal : 50–56 px de hauteur ;
- espacement entre actions destructives et normales >= 8 px.

### Glassmorphism

- blur modéré ;
- fond rgba blanc 0.70–0.85 ;
- fine bordure claire ;
- ombre diffuse faible ;
- jamais au détriment du contraste texte.

### Motion

- tap feedback 120–160 ms ;
- sheet / modal 180–220 ms ;
- aucune animation décorative longue.

---

## Ordre d’implémentation

1. Design tokens + bottom navigation glassmorphism. ✅
2. E1 Accueil. ✅ candidat
3. E2 Nouveau document. ✅ candidat
4. E3 Éditeur et moteur live. ✅ candidat
5. E4 Aperçu PDF. ✅ candidat
6. E5 Historique. ✅ candidat
7. E6 Réglages.
8. Audit 390 / 430 / 768.
9. Audit tactile >= 44 px.
10. Offline + reprise après fermeture.
11. Partage / téléchargement / impression PDF.
12. Certification finale.

## Gates de certification V1

- 390 / 430 / 768 sans overflow ;
- 0 erreur console ;
- 0 contrôle critique < 44 px ;
- création → sauvegarde → réouverture → PDF validée ;
- offline validé ;
- Original PDF >= 9.5 ;
- Premium PDF >= 9.5 ;
- UI globale >= 9.3 ;
- aucune GitHub Action automatique ;
- aucun déploiement Vercel sans autorisation explicite.
