# Dépendances PDF — sécurité

Décision du 26 août 2026 :

- jsPDF doit être au minimum en 4.2.1, version qui corrige les advisories publiées en mars 2026 affectant les versions <= 4.2.0 ;
- jsPDF-AutoTable doit être en 5.0.8, dont le peer dependency accepte jsPDF 4.x ;
- l’intégration AutoTable v5 doit utiliser l’export nommé `autoTable` ;
- la certification finale doit exécuter `npm audit --omit=dev --audit-level=critical` et afficher les versions réellement installées de `jspdf` et `jspdf-autotable`.

Cette note ne vaut pas preuve de runtime : la preuve reste le run final exact-head.
