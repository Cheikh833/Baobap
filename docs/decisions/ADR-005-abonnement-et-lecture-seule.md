# ADR-005 — Essai gratuit, abonnement et lecture seule

**Statut** : acceptée · **Date** : 2026-11-03

**Contexte** : décision produit « essai gratuit puis payant ». Le paiement en ligne n'est pas encore intégré, faute d'agrégateur choisi.

**Décision** : l'état d'abonnement est porté par `Organization` (`plan`, `subscriptionStatus`, `trialEndsAt`, `currentPeriodEnd`). L'état effectif est calculé par une fonction pure (`subscriptionState`) intégrée au `TenantContext`. En lecture seule, `can`/`assertCan` refusent toute permission autre que `*:view` : l'application est garantie à un seul endroit, côté serveur. Les limites du plan (membres facturables, projets) sont vérifiées dans les transactions de création. L'activation se fait par demande (`PlanRequest`) puis par le script back-office `scripts/billing.ts`, journalisé.

**Conséquences** : aucune perte de données à l'expiration. Le passage au paiement automatique ne demandera qu'un webhook appelant `activateSubscription`. Les prix se modifient dans `src/lib/plans.ts`.
