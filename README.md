# BAOBAB

**Plateforme SaaS de pilotage des organisations, portefeuilles, programmes, projets et impacts.**
_Planifier. Exécuter. Impacter._

BAOBAB vise à devenir un « Work OS » pour les ONG, institutions publiques, agences de développement, bailleurs et cabinets : stratégie, projets, suivi-évaluation (MEAL), finances, risques, données, IA et reporting dans un même modèle de données.

> **État actuel : Phase 0 (fondations) + Phase 1 (fondation organisationnelle) + début des phases 2–3 (portefeuilles, programmes, projets).**
> Les autres modules (MEAL, Finances, Risques, Documents, Analyse, IA, Studio…) sont **affichés comme « Bientôt » et non cliquables** : aucune fonctionnalité n'est présentée comme opérationnelle si elle ne l'est pas.

## Ce qui fonctionne aujourd'hui

| Domaine | Fonctionnalités |
|---|---|
| Authentification | Inscription, connexion, déconnexion, sessions serveur (cookie httpOnly, jeton haché), limitation des échecs de connexion |
| Organisations | Création (onboarding), profil institutionnel, multi-organisation avec changement d'organisation active |
| Structure interne | Directions, départements, bureaux régionaux, équipes… en arbre (cycles refusés), rattachement des membres |
| Membres | Invitations par lien (expirant, à usage unique, liées à l'email), changement de rôle, suspension |
| Rôles & permissions | 11 rôles système + rôles personnalisés, matrice de permissions `ressource:action`, vérification **côté serveur** |
| Audit | Journal des modifications importantes (avant/après), historique par projet |
| Portefeuilles / Programmes | Création, fiche, modification, suppression logique, rattachements contrôlés |
| Projets | Assistant de création en 8 étapes avec **brouillon** et reprise, fiche projet, santé du projet (règles documentées), cycle de vie (Brouillon → Préparation → Actif → Suspendu/Clôturé → Archivé), filtres |
| Tableau de bord | Indicateurs calculés **uniquement** à partir des données enregistrées (budgets par devise, avancement temporel pondéré, alertes de retard/échéance) |
| Site public | Landing page (sans faux clients, témoignages ni chiffres) |

## Démarrage rapide

Prérequis : Node.js 20+ (testé avec 22), PostgreSQL 14+ (testé avec 16).

```bash
npm install
cp .env.example .env          # puis adapter DATABASE_URL et SESSION_SECRET
npx prisma migrate deploy     # crée le schéma
npm run db:seed               # optionnel : organisation de démonstration FICTIVE
npm run dev                   # http://localhost:3000
```

Comptes de démonstration (après `db:seed`, mot de passe `demo-baobab-2026`) — **toutes les données sont fictives et marquées comme telles** :
`demo.directrice@example.org` (propriétaire), `demo.chefprojet@example.org` (chef de projet), `demo.bailleur@example.org` (bailleur, lecture seule).

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `start` | Développement / build de production / serveur de production |
| `npm run typecheck` · `npm run lint` | Vérification TypeScript · ESLint |
| `npm test` | Tests unitaires + intégration (PostgreSQL réel, base `baobab_test` ou `TEST_DATABASE_URL`) |
| `node tests/e2e/journey.mjs [dossier]` | Parcours navigateur Playwright complet (`BASE_URL`, par défaut `http://localhost:3000`) |
| `npm run db:migrate` · `db:deploy` · `db:seed` · `db:studio` | Base de données |

Préparer la base de test : `createdb baobab_test` puis `DATABASE_URL=postgresql://…/baobab_test npx prisma migrate deploy`.

## Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `SESSION_SECRET` | Secret aléatoire (32+ caractères) — réservé aux évolutions (signature) |
| `COOKIE_SECURE` | `true` en production (cookies `Secure`, HTTPS obligatoire) |
| `TEST_DATABASE_URL` | Base utilisée par les tests (optionnel) |

## Documentation

Tout est dans [`docs/`](docs/README.md) : analyse et arbitrages, PRD, architectures fonctionnelle et technique, modèle de données, matrice des rôles, parcours, plan par phases, backlog, critères d'acceptation, design system, décisions (ADR) et rapport de validation.

## Structure du code

```
src/
  app/                 Routes Next.js (App Router)
    (public)/          Site public
    (auth)/            Connexion, inscription, invitation
    onboarding/        Création d'organisation
    (workspace)/       Espace authentifié (tableau de bord, organisation, portefeuilles, programmes, projets)
    api/               Endpoints POST (déconnexion, changement d'organisation)
  server/              Code serveur uniquement
    auth/              Sessions, mots de passe, jetons
    permissions/       Catalogue des permissions, rôles système, contrôles
    services/          Services métier (toutes les règles et contrôles d'accès)
    context.ts         Contexte tenant (utilisateur + organisation + permissions)
  lib/                 Fonctions pures partagées (validation Zod, formules, libellés)
  components/          Design system et composants
prisma/                Schéma, migrations, seed de démonstration
tests/                 unit/, integration/, e2e/
docs/                  Documentation produit, technique et décisions
```
