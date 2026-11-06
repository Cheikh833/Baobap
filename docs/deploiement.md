# Guide de mise en ligne

Deux options. Elles utilisent la même application et les mêmes variables d'environnement.

## Option A — Vercel + PostgreSQL managé (la plus simple)
1. **Base de données** : créer une base PostgreSQL managée (Neon, Supabase ou Railway, avec une offre gratuite pour démarrer) et copier l'URL de connexion.
2. **Vercel** : importer le dépôt GitHub `Cheikh833/Baobap`. Framework détecté : Next.js.
3. **Commande de build** : `npx prisma migrate deploy && npm run build`. Les migrations s'appliquent à chaque déploiement.
4. **Variables d'environnement** (voir le tableau plus bas), puis déployer.
5. **Domaine** : associer `baobab.sn` (ou autre) dans Vercel, puis mettre `APP_URL=https://baobab.sn`.

## Option B — Serveur (VPS) avec Docker
Utile pour héberger les données au Sénégal ou chez un hébergeur de votre choix.
```bash
cp .env.example .env   # compléter les variables
docker compose up -d   # lance PostgreSQL + BAOBAB sur le port 3000
```
Placer un reverse proxy HTTPS (Caddy ou Nginx + Let's Encrypt) devant le port 3000. Les migrations s'appliquent au démarrage du conteneur.
> Le `Dockerfile` n'a pas pu être testé dans l'environnement de développement (pas de démon Docker). Faites un premier `docker compose build` de vérification.

## Variables d'environnement
| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | Oui | Connexion PostgreSQL |
| `APP_URL` | Oui en production | URL publique (liens d'emails, retour et notification des paiements, SEO) |
| `COOKIE_SECURE` | Oui en production (`true`) | Cookies réservés au HTTPS |
| `CINETPAY_API_KEY`, `CINETPAY_SITE_ID` | Pour le paiement en ligne | Identifiants CinetPay |
| `CINETPAY_SECRET_KEY` | Fortement recommandé | Vérification de la signature des notifications |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Pour les emails | Invitations et mot de passe oublié |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Pour « Continuer avec Google » | Voir plus bas |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | Pour « Continuer avec Microsoft » | Voir plus bas |
| `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | Pour « Continuer avec Apple » | Voir plus bas |

Sans les variables CinetPay ou SMTP, l'application fonctionne : le paiement passe par la demande manuelle et les liens d'invitation sont à transmettre à la main. L'interface l'indique.
## Activer CinetPay
1. Créer un compte marchand sur cinetpay.com (pièces de l'entreprise requises) et attendre la validation.
2. Récupérer l'**API Key**, le **Site ID** et la **Secret Key** dans le back-office.
3. Déclarer l'URL de notification : `https://<votre-domaine>/api/payments/cinetpay/notify`.
4. Renseigner les trois variables, redéployer : la section « Payer en ligne » apparaît dans Organisation → Abonnement.
5. **Premier test réel** : payer un plan mensuel Essentiel (15 000 FCFA) avec Wave ou Orange Money. Vérifier que l'abonnement passe à « Actif » et que le paiement apparaît dans l'historique et le journal d'audit.

Sécurité : une notification ne suffit jamais. Chaque paiement est revérifié auprès de CinetPay (statut, montant, devise) avant activation, et une même transaction ne peut activer l'abonnement qu'une fois.

## Activer « Continuer avec Google »
1. Ouvrir [console.cloud.google.com](https://console.cloud.google.com) avec le compte Google de l'organisation → créer un projet « BAOBAB ».
2. **API et services → Écran de consentement OAuth** : type « Externe », nom de l'application « BAOBAB », email d'assistance, logo (facultatif), domaines autorisés (ex. `baobab.sn` ou `vercel.app`), liens vers `/legal/privacy` et `/legal/terms`. Champs d'accès : `openid`, `email`, `profile` (aucune vérification Google n'est requise pour ces trois-là). Publier l'application (« En production »).
3. **API et services → Identifiants → Créer des identifiants → ID client OAuth** : type « Application Web ».
   - Origines JavaScript autorisées : `https://votre-domaine` (ex. `https://baobap.vercel.app`).
   - **URI de redirection autorisés** : `https://votre-domaine/api/auth/oauth/google/callback` (exactement, sans barre finale).
4. Copier l'**ID client** et le **code secret** dans Vercel → Settings → Environment Variables : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Vérifier que `APP_URL` vaut bien `https://votre-domaine` et que `COOKIE_SECURE=true`. Redéployer.
5. Le bouton apparaît automatiquement sur les pages Connexion et Inscription. Ne jamais coller le code secret dans une conversation ou un fichier du dépôt.

## Activer « Continuer avec Microsoft » (gratuit)
1. [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID → Inscriptions d'applications → Nouvelle inscription** : nom « BAOBAB » ; types de comptes : « Comptes dans un annuaire organisationnel et comptes Microsoft personnels » ; URI de redirection (Web) : `https://votre-domaine/api/auth/oauth/microsoft/callback`.
2. **Certificats et secrets → Nouveau secret client** : copier la *valeur* (affichée une seule fois).
3. **Configuration du jeton → Ajouter une revendication facultative** (type ID) : cocher `email` et **`xms_edov`** (indique que Microsoft certifie le domaine de l'email ; sans elle, les comptes professionnels sont refusés par sécurité, seuls les comptes personnels Outlook/Hotmail passent).
4. Variables Vercel : `MICROSOFT_CLIENT_ID` (« ID d'application (client) ») et `MICROSOFT_CLIENT_SECRET`. Redéployer.

## Activer « Continuer avec Apple » (facultatif)
Nécessite un compte **Apple Developer** (99 $/an).
1. [developer.apple.com](https://developer.apple.com/account) → Certificates, Identifiers & Profiles → **Identifiers** : créer un *App ID* avec « Sign In with Apple », puis un **Services ID** (ex. `sn.baobab.web`) ; dans sa configuration « Sign In with Apple », déclarer le domaine et l'URL de retour `https://votre-domaine/api/auth/oauth/apple/callback`.
2. **Keys** : créer une clé avec « Sign In with Apple », télécharger le fichier `.p8` (une seule fois possible), noter son **Key ID** et votre **Team ID** (en haut à droite du compte).
3. Variables Vercel : `APPLE_CLIENT_ID` (le Services ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (contenu complet du `.p8`). `COOKIE_SECURE=true` est indispensable (Apple renvoie la réponse par un formulaire inter-sites).

**Fonctionnement** : la première fois, le compte BAOBAB est créé automatiquement à partir de l'email vérifié par Google / Apple ; si un compte existe déjà avec ce même email, il est rattaché (pas de doublon). Ensuite, le même bouton connecte directement. Un appareil déjà utilisé est reconnu : la page d'inscription renvoie vers la connexion, qui rappelle la méthode utilisée la dernière fois. Les sessions durent 30 jours.

## Activer les emails
N'importe quel service SMTP convient. Exemples : Brevo (offre gratuite de 300 emails par jour), Mailjet, un compte Gmail ou Google Workspace (mot de passe d'application), ou le SMTP de votre hébergeur. Utiliser une adresse d'expéditeur sur votre domaine et configurer SPF/DKIM pour éviter les spams.

## Après la mise en ligne
- **Supervision** : surveiller `https://<domaine>/api/health` (UptimeRobot, Better Stack), qui renvoie 200 si l'application et la base répondent.
- **Sauvegardes** : activer les sauvegardes automatiques quotidiennes de la base (incluses chez Neon et Supabase ; `pg_dump` planifié sur un VPS).
- **Démo** : ne **pas** exécuter `npm run db:seed` en production (le script le refuse).
- **Abonnements manuels** : `npm run billing -- list` et `npm run billing -- activate <CODE> <PLAN> <MONTHLY|YEARLY>`, à exécuter avec la `DATABASE_URL` de production.
- **Mentions légales** : compléter les mentions entre crochets dans `src/content/legal.ts` (raison sociale, NINEA, RCCM, hébergeur, déclaration CDP) et faire valider les textes par un juriste.

## Intégration continue
`.github/workflows/ci.yml` exécute à chaque push : installation, migrations sur une base PostgreSQL de test, vérification des types, lint, tests et build.
