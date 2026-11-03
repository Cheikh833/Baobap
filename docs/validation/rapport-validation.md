# Rapport de validation — Phase 0, Phase 1 et début des phases 2–3

Date : 2026-11-03 · Environnement : Node 22, PostgreSQL 16, build de production Next.js 15.5.

## Résultats
| Contrôle | Résultat |
|---|---|
| TypeScript strict (`npm run typecheck`) | ✅ 0 erreur |
| ESLint (`npm run lint`) | ✅ 0 avertissement |
| Build de production | ✅ |
| Tests unitaires + intégration (`npm test`, PostgreSQL réel) | ✅ 46/46 |
| Parcours navigateur Playwright (`tests/e2e/journey.mjs`) | ✅ 45/45, deux exécutions consécutives, aucune nouvelle tentative, aucune erreur console |

## Couverture des tests automatisés
- **Unitaires** : formules (avancement temporel, durée, retard, budgets par devise, pondération), santé du projet, validation (mot de passe, codes, dates, champs facultatifs, montants « 1 250 000,50 »), redirections sûres, cohérence du catalogue de permissions.
- **Intégration** : isolation multi-tenant (lecture, modification, suppression, références croisées, codes par organisation, membres suspendus), RBAC (lecteur, bailleur, chef de projet vs validation), authentification (doublons, mauvais mot de passe, email inconnu, limitation, succès non comptés, hachage), invitations (email ciblé, usage unique, expiration, propriétaire), garde-fous propriétaires, rôles personnalisés, audit, arbre des structures sans cycle, assistant projet (champs par étape, historique), hiérarchie (héritage, propagation), cycle de vie, suppression logique, tableau de bord.
- **Navigateur** : landing, erreurs de validation affichées, inscription → onboarding → tableau de bord, contrôle des dates, portefeuille, programme, assistant complet (retour arrière sans perte, refus de saut d'étape, synthèse), fiche et santé, activation, historique, tableau de bord alimenté, structures, invitation → déconnexion → inscription de l'invité → acceptation, restrictions d'un membre d'équipe, compte bailleur de démo (audit interdit, isolation), 404, absence de défilement horizontal sur 8 tailles d'écran, menu mobile, landing en mobile.

## Routes vérifiées dans le navigateur
`/`, `/signup`, `/login`, `/onboarding`, `/invitation/[jeton]`, `/dashboard`, `/organization`, `/organization/profile`, `/organization/units`, `/organization/members`, `/organization/roles`, `/organization/audit`, `/portfolios`, `/portfolios/new`, `/portfolios/[id]`, `/programs`, `/programs/new`, `/programs/[id]`, `/projects`, `/projects/new`, `/projects/new/[id]/[étape]`, `/projects/[id]` (aperçu, historique, paramètres), `POST /api/auth/logout`.

## Problèmes trouvés en test navigateur et corrigés
1. Saisie effacée après une erreur de validation (React 19) → soumission sans réinitialisation.
2. Navigations perdues entre pages `/projects/*` en production → suppression du `loading.tsx` de groupe (ADR-004).
3. Formulaires bloqués sur « Enregistrement… » après `redirect()` → navigation pilotée par le formulaire.
4. Étape de l'assistant affichée périmée (cache client) → chargement complet.
5. La limitation de connexion comptait aussi les connexions réussies → seuls les échecs comptent.
6. Invitation acceptée affichée comme « invalide » → redirection vers le tableau de bord.
7. Défilement horizontal du tableau de bord en mobile (alertes) → retour à la ligne + `min-w-0`.
8. Avertissement d'hydratation lié à `<noscript>` → remplacé par un bouton accessible.
9. Différences d'audit erronées (Decimal comparé à un nombre) → normalisation.

## Limites restantes (connues)
- Modules MEAL, Finances, Risques, Documents, Analyse, IA, Studio, Notifications, Workflows : **non implémentés** (affichés « Bientôt »).
- Pas d'envoi d'emails : l'invitation est un lien à transmettre manuellement ; pas de réinitialisation de mot de passe.
- Logo et documents institutionnels : attendent le stockage de fichiers (phase 6).
- Limitation de connexion en mémoire (une seule instance).
- Pas de RLS PostgreSQL, de CSP stricte ni de 2FA (phase 11).
- Tests d'accessibilité automatisés (axe) non encore intégrés ; vérifications manuelles uniquement.
- **Aucun déploiement** effectué ; le code n'a pas pu être poussé sur GitHub (accès refusé au moment de la livraison).
