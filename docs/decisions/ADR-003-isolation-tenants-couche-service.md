# ADR-003 — Isolation des organisations dans la couche service

**Statut** : acceptée · **Date** : 2026-11-03

**Décision** : chaque page et action obtient un `TenantContext` via `requireTenant()` (session valide + appartenance **active** à l'organisation active + permissions du rôle). Chaque service : (1) vérifie la permission (`assertCan`), (2) filtre toutes ses requêtes par `organizationId`, (3) vérifie que toute référence reçue (portefeuille, programme, responsable, rôle, structure) appartient à la même organisation, (4) renvoie « introuvable » pour un identifiant d'une autre organisation.

**Conséquences** : couverture par des tests d'intégration multi-tenant. Défense en profondeur prévue en phase 11 : Row Level Security PostgreSQL, organisation positionnée par transaction. L'IA et les exports devront passer par ces mêmes services.
