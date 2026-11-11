# BAOBAB

**Plateforme SaaS de pilotage des organisations, portefeuilles, programmes, projets et impacts.**
_Planifier. Exécuter. Impacter._

BAOBAB vise à devenir un « Work OS » pour les ONG, institutions publiques, agences de développement, bailleurs et cabinets : stratégie, projets, suivi-évaluation (MEAL), finances, risques, données, IA et reporting dans un même modèle de données.

> **État actuel : tous les modules du menu sont opérationnels** (organisation, stratégie, projets, planification, suivi-évaluation, finances, risques, analyse de données, documents, Studio, BAOBAB AI, administration).
> Les extensions encore en préparation sont signalées comme telles : aucune fonctionnalité n'est présentée comme opérationnelle si elle ne l'est pas.

## Ce qui fonctionne aujourd'hui

| Domaine | Fonctionnalités |
|---|---|
| Authentification | Connexion « Continuer avec Google / Microsoft / Apple » (compte créé automatiquement la première fois, rattaché si l'email existe déjà), appareil reconnu (renvoi vers la connexion au lieu de l'inscription), inscription, connexion, déconnexion, sessions serveur (cookie httpOnly, jeton haché), limitation des échecs de connexion |
| Organisations | Création (onboarding), profil institutionnel, multi-organisation avec changement d'organisation active |
| Structure interne | Directions, départements, bureaux régionaux, équipes… en arbre (cycles refusés), rattachement des membres |
| Membres | Invitations par lien (expirant, à usage unique, liées à l'email), changement de rôle, suspension |
| Rôles & permissions | 11 rôles système + rôles personnalisés, matrice de permissions `ressource:action`, vérification **côté serveur** |
| Audit | Journal des modifications importantes (avant/après), historique par projet |
| Planification | Phases, activités, tâches, jalons, dépendances sans boucle ; diagramme de Gantt, tableau Kanban (glisser-déposer), « Mes tâches », alertes de retard, santé « Activités » calculée |
| Suivi-évaluation (MEAL) | Cadre logique (Impact → Effets → Extrants → Activités) avec contrôles de cohérence, indicateurs (référence, cible, sens, fréquence, ventilations), saisie des valeurs, validation par une autre personne, corrections tracées, taux d'atteinte et trajectoire, alertes « non actualisé », courbes d'évolution |
| Finances | Financements par bailleur, budget détaillé par lignes, dépenses saisies puis validées par une autre personne, blocage des dépassements, annulations tracées, taux d'exécution vs temps écoulé, totaux par devise (jamais de conversion implicite) |
| Risques | Registre (probabilité × impact, mitigation, contingence, responsable), matrice 5×5, alertes de revue en retard |
| Analyse de données | Import CSV (Excel compris), dictionnaire des variables, contrôle qualité (manquants, doublons, valeurs non conformes), statistiques descriptives, histogrammes, fréquences, tableaux croisés avec test du khi² et conditions d'application, comparaison de moyennes (ANOVA) |
| Équipe & parties prenantes | Affectation des membres aux projets (rôle, %, période), registre des parties prenantes avec grille influence × intérêt (coordonnées réservées aux éditeurs) |
| Mes actions | Ce que chacun doit faire maintenant selon ses droits : validations, échéances, retards, revues, indicateurs à actualiser ; compteur dans le menu et synthèse au tableau de bord |
| Documents & connaissances | Dépôt de fichiers vérifiés (type réel, 4 Mo, quota), versions, recherche dans le contenu (Word, Excel, PowerPoint, PDF…), fiches de connaissances, onglet Documents des projets |
| BAOBAB Studio | Rapports d'avancement, financiers et de synthèse générés depuis les données, analyse rédigée, validation qui fige les chiffres, exports PDF / Word / Excel |
| BAOBAB AI | Assistant qui répond à partir de vos données via des outils en lecture seule respectant les droits, sources citées, conversations privées, quotas par plan (activé avec `ANTHROPIC_API_KEY`) |
| Administration | Utilisation de l'offre, appareils connectés, comptes liés, export complet des données (ZIP de CSV) |
| Foires et salons | Démo instantanée sans inscription (`/demo`, espace fictif par visiteur, effacé sous 24 h, IA plafonnée), affiche de stand A4 avec QR code (`/salon`), visite guidée |
| Recherche globale | Ctrl+K : projets, indicateurs, risques, documents (contenu compris), rapports, membres, pages — selon les droits |
| Application installable | Icône sur l'écran d'accueil du téléphone (manifeste PWA) |
| Démo | Espace de démonstration fictif complet en un clic (stratégie, projets, planning, suivi-évaluation, enquête fictive) |
| Stratégie | Plans stratégiques (un seul actif), axes, objectifs, contributions pondérées des projets (≤ 100 %), couverture des objectifs, budget aligné sans double comptage, projets non alignés |
| Portefeuilles / Programmes | Création, fiche, modification, suppression logique, rattachements contrôlés |
| Projets | Assistant de création en 8 étapes avec **brouillon** et reprise, fiche projet, santé du projet (règles documentées), cycle de vie (Brouillon → Préparation → Actif → Suspendu/Clôturé → Archivé), filtres |
| Tableau de bord | Indicateurs calculés **uniquement** à partir des données enregistrées (budgets par devise, avancement temporel pondéré, alertes de retard/échéance) |
| Site public | Landing page (sans faux clients, témoignages ni chiffres), page Tarifs |
| Abonnement | Essai gratuit de 30 jours (plan Professionnel), 4 plans en FCFA, limites appliquées (membres, projets), lecture seule après l'essai, demande d'activation + back-office |
| Paiement Mobile Money | Transfert Wave / Orange Money vers votre numéro, déclaration par le client, confirmation dans `/admin` (administration plateforme) |
| Paiement en ligne | CinetPay (Wave, Orange Money, MTN, Moov, cartes), vérification serveur, activation automatique ; désactivé tant que les clés ne sont pas configurées |
| Langues | Application entièrement en français et en anglais, wolof (bêta, à valider) — sélecteur de langue, repli automatique sur le français |
| Comptes | Mot de passe oublié (lien unique 1 h), invitations par email (SMTP), acceptation des conditions à l'inscription |
| Lancement | Pages légales (modèles), SEO (aperçu de partage, sitemap, robots), supervision `/api/health`, CI GitHub, Docker |

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
| `node tests/e2e/audit.mjs …` | Robot d'audit : toutes les pages par rôle, erreurs, débordements mobile, traductions |
| `npm run db:migrate` · `db:deploy` · `db:seed` · `db:studio` | Base de données |

Préparer la base de test : `createdb baobab_test` puis `DATABASE_URL=postgresql://…/baobab_test npx prisma migrate deploy`.

## Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `APP_URL` | URL publique (liens d'emails, paiements, SEO) |
| `COOKIE_SECURE` | `true` en production (cookies `Secure`, HTTPS obligatoire) |
| `CINETPAY_API_KEY`, `CINETPAY_SITE_ID`, `CINETPAY_SECRET_KEY` | Paiement en ligne (optionnel) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Connexion avec Google (optionnel) |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | Connexion avec Microsoft (optionnel) |
| `ANTHROPIC_API_KEY`, `BAOBAB_AI_MODEL` | BAOBAB AI (optionnel ; modèle par défaut `claude-opus-5-5`) |
| `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | Connexion avec Apple (optionnel) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Envoi d'emails (optionnel) |
| `TEST_DATABASE_URL` | Base utilisée par les tests (optionnel) |

Mise en ligne : voir [`docs/deploiement.md`](docs/deploiement.md).

## Documentation

Audit et checklist à jour : [`docs/validation/audit-checklist.md`](docs/validation/audit-checklist.md). Tout est dans [`docs/`](docs/README.md) : analyse et arbitrages, PRD, architectures fonctionnelle et technique, modèle de données, matrice des rôles, parcours, plan par phases, backlog, critères d'acceptation, design system, décisions (ADR) et rapport de validation.

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
