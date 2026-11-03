# 04 — Architecture technique

## Stack (décisions confirmées)
| Couche | Choix | Justification |
|---|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS 3, Lucide | Rendu serveur (léger pour les connexions limitées), un seul langage |
| Backend | Server Actions + Route Handlers, services métier dans `src/server/services` | Pas de duplication front/back ; règles uniquement côté serveur |
| Validation | Zod (`src/lib/validation`) | Même schéma pour messages d'erreur et contrôle serveur |
| Base | PostgreSQL 16, Prisma 6, migrations versionnées (`prisma/migrations`) | Relations explicites, transactions, `pgvector` disponible plus tard |
| Auth | Sessions serveur maison (ADR-002) | Contrôle total, aucune dépendance externe obligatoire |
| Tests | Vitest (unitaires + intégration sur PostgreSQL réel), Playwright (parcours navigateur) | |

Propositions pour les phases suivantes : stockage objet S3-compatible (URL signées) pour les documents ; `pgvector` pour le RAG ; service Python (FastAPI + scipy/statsmodels) pour le moteur statistique ; couche fournisseurs IA interchangeables (Anthropic, OpenAI, Gemini) ; file de tâches (pg-boss) pour l'extraction de documents, les notifications et les workflows.

## Architecture logique

```
Navigateur
  └─ Pages React (Server Components) + formulaires (Client Components minimaux)
       └─ Server Actions / Route Handlers  ── validation d'origine (CSRF)
            └─ requireTenant()  ── session → membre actif → rôle → permissions
                 └─ Services métier  ── assertCan(permission) + filtre organizationId
                      ├─ Validation Zod
                      ├─ Contrôle des références (même organisation)
                      ├─ Transaction Prisma + journal d'audit
                      └─ PostgreSQL
```

Règles :
- **Aucune règle sensible dans le frontend.** L'interface masque ce qui n'est pas autorisé, mais c'est le service qui refuse.
- **Chaque service reçoit un `TenantContext`** et filtre toutes ses requêtes par `organizationId` ; un identifiant d'une autre organisation renvoie « introuvable » (pas de fuite d'existence).
- **Les références** (portefeuille, programme, responsable) sont vérifiées comme appartenant à la même organisation (`services/guards.ts`).
- **Calculs** : fonctions pures testées (`src/lib/metrics.ts`, `src/lib/project-health.ts`).
- **L'IA (phase 8)** n'accèdera jamais à la base directement : ses outils appelleront ces mêmes services avec le contexte de l'utilisateur.

## Sécurité implémentée
| Mesure | Implémentation |
|---|---|
| Mots de passe | bcrypt coût 12 ; politique 10+ caractères, lettre + chiffre |
| Sessions | Jeton aléatoire 256 bits en cookie httpOnly/SameSite=Lax (`Secure` en production) ; seul son SHA-256 est stocké ; expiration 14 jours ; suppression à la déconnexion |
| Énumération de comptes | Message identique pour email inconnu / mauvais mot de passe, hash factice pour égaliser le temps |
| Force brute | 8 échecs / 15 min par (client, email) ; les succès ne comptent pas |
| CSRF | Server Actions : contrôle d'origine natif de Next.js ; endpoints POST : contrôle `Origin`/`Referer` (`server/http.ts`) |
| Redirections ouvertes | `safeNext` n'accepte que des chemins internes |
| Invitations | Jeton 256 bits haché, 7 jours, usage unique, lié à l'email invité |
| En-têtes | `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `poweredByHeader` désactivé |
| XSS | Échappement React, aucun `dangerouslySetInnerHTML` |
| Audit | Création/modification/suppression, rôles, invitations, statuts ; avant/après |

À venir : RLS PostgreSQL (défense en profondeur), CSP stricte, rate limiting partagé (Redis/Postgres) pour le multi-instances, 2FA, rotation des sessions, chiffrement des champs sensibles, politique de rétention, sauvegardes.

## API

L'application utilise principalement des **Server Actions** (appelées par les formulaires, typées, protégées par contrôle d'origine). Endpoints HTTP actuels :

| Méthode | Route | Description | Sécurité |
|---|---|---|---|
| POST | `/api/auth/logout` | Ferme la session, redirige (303) vers `/login` | Contrôle d'origine |
| POST | `/api/organizations/switch` | Change l'organisation active (`organizationId` en form-data) | Session + appartenance active + contrôle d'origine |

Server Actions principales (toutes : session + organisation active + permission) :

| Action | Permission |
|---|---|
| `createOrganizationAction` | utilisateur connecté |
| `updateProfileAction` | `organization:edit` |
| `create/update/deleteUnitAction` | `units:create/edit/delete` |
| `inviteAction`, `revokeInvitationAction`, `changeRoleAction`, `setStatusAction`, `setUnitsAction` | `members:manage` |
| `create/update/deleteRoleAction` | `roles:manage` |
| `create/update/deletePortfolioAction` | `portfolio:*` |
| `create/update/deleteProgramAction` | `program:*` |
| `createDraftAction` · `wizardStepAction`/`editStepAction` · `statusAction` · `deleteProjectAction` | `project:create` · `project:edit` · `project:edit` (`project:approve` pour activer) · `project:delete` |

Proposition : une API REST publique versionnée (`/api/v1/...`, jetons d'API par organisation) sera exposée quand des intégrations externes l'exigeront, en réutilisant les mêmes services.

## Déploiement
Prévu : GitHub → Vercel (Preview par branche, Production sur `main`) + PostgreSQL managé ; `prisma migrate deploy` au déploiement ; `COOKIE_SECURE=true`. **Aucun déploiement n'a été effectué** dans cette session.
