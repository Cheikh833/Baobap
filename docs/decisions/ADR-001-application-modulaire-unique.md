# ADR-001 — Application modulaire unique plutôt que monorepo multi-paquets

**Statut** : acceptée · **Date** : 2026-11-03

**Contexte** : le master prompt propose `apps/ packages/ services/` mais demande de ne pas créer de dossiers vides ni de complexité inutile. Le dépôt était vide.

**Décision** : une seule application Next.js, découpée en couches nettes : `src/app` (routes), `src/server` (auth, permissions, services métier, seul code autorisé à accéder à la base), `src/lib` (fonctions pures), `src/components` (design system).

**Conséquences** : démarrage rapide, refactoring simple. L'extraction en paquets (`packages/domain`, `packages/analytics-engine`, `apps/workers`) se fera quand un second consommateur existera (workers d'indexation, service statistique, API publique). Les frontières actuelles la préparent : les services ne dépendent pas de Next.js, sauf `context.ts`.
