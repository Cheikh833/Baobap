# Mise en ligne de BAOBAB — vérification étape par étape

Légende : ✅ fait · 👤 à faire par vous (compte personnel requis) · ⏳ plus tard

Durée totale estimée pour les étapes 1 à 5 : environ 30 à 45 minutes. Tout est gratuit pour démarrer.

## Étape 0 — Le code (✅ fait)
- ✅ Code sur GitHub : `Cheikh833/Baobap`, branche `claude/vigilant-galileo-5coks3` (branche par défaut du dépôt).
- ✅ Vérification automatique (CI) verte : types, lint, 82 tests, build.
- ✅ Script de build prêt pour Vercel (`vercel-build` : migrations puis build).

## Étape 1 — Base de données (👤 5 min)
1. Aller sur **neon.tech**, cliquer « Sign up », choisir **Continue with GitHub**.
2. Créer un projet `baobab`, région **Europe (Frankfurt)**, la plus proche de Dakar parmi les offres gratuites.
3. Copier la **Connection string** (commence par `postgresql://…`). C'est votre `DATABASE_URL`.
   Prenez la connexion **directe** : désactivez l'option « Connection pooling » avant de copier, car les mises à jour de la base (migrations) en ont besoin. Gardez `?sslmode=require` à la fin.

## Étape 2 — Hébergement (👤 10 min)
1. Aller sur **vercel.com** → « Sign up » → **Continue with GitHub** (offre gratuite « Hobby »).
2. « Add New… → Project » → importer **Cheikh833/Baobap**.
3. Dans « Environment Variables », ajouter :

| Nom | Valeur |
|---|---|
| `DATABASE_URL` | la connection string Neon |
| `APP_URL` | `https://baobab-xxxx.vercel.app`. Mettez d'abord une valeur provisoire, puis corrigez-la avec l'adresse donnée par Vercel après le premier déploiement et redéployez |
| `COOKIE_SECURE` | `true` |
| `PLATFORM_ADMIN_EMAILS` | votre email (celui de votre compte BAOBAB) |
| `PAYMENT_MOBILE_NUMBER` | votre numéro Wave / Orange Money, ex. `+221 77 123 45 67` |
| `PAYMENT_MOBILE_NAME` | le nom du titulaire, tel qu'il s'affiche chez l'opérateur |
| `PAYMENT_MOBILE_OPERATORS` | `Wave,Orange Money` |

   Pour chaque variable, cochez **Production, Preview et Development**.
4. Cliquer **Deploy**. Vercel construit l'application et crée les tables. Vous obtenez une adresse `https://….vercel.app`.

**Ne collez jamais de mot de passe ou de clé dans une conversation** : saisissez-les uniquement dans Vercel.

### En cas d'échec du build
- Message « BAOBAB — réglage manquant : DATABASE_URL » (ou, avant cette vérification, `Environment variable not found: DATABASE_URL`) : la variable n'est pas enregistrée, ou pas cochée pour l'environnement construit. Ajoutez-la (Settings → Environment Variables), cochez les trois environnements, puis **Deployments → ⋯ → Redeploy**. Une variable ajoutée après un déploiement n'est prise en compte qu'au déploiement suivant.
- Erreur de connexion pendant `prisma migrate deploy` : vérifiez que l'adresse Neon est la connexion directe et qu'elle se termine par `?sslmode=require`.

## Étape 3 — Premiers contrôles en ligne (👤 10 min)
- [ ] `https://<adresse>/api/health` affiche `{"status":"ok",…}`.
- [ ] La page d'accueil et la page Tarifs s'affichent, le sélecteur de langue fonctionne.
- [ ] Créer votre compte (avec l'email mis dans `PLATFORM_ADMIN_EMAILS`), puis votre organisation.
- [ ] Le lien « Administration plateforme » apparaît en bas du menu → `/admin`.
- [ ] Organisation → Abonnement : la section « Payer par Wave ou Orange Money » affiche votre numéro.
- [ ] Test de bout en bout : déclarer un faux paiement → il apparaît dans `/admin` → le **rejeter**.
- [ ] Inviter un membre (copier le lien affiché), l'ouvrir dans une fenêtre privée, créer le compte invité.
- [ ] Ouvrir le site sur votre téléphone.

## Étape 4 — Emails (👤 10 min, recommandé)
Sans emails, l'application fonctionne, mais « mot de passe oublié » est indisponible et les invitations se transmettent à la main.
Je ne peux pas créer de boîte email à votre place (vérification par téléphone, compte personnel). Deux options :
- **Brevo (recommandé)** : brevo.com → compte gratuit (300 emails par jour) → « SMTP & API » → générer une clé SMTP.
  Variables : `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, `SMTP_USER=<identifiant Brevo>`, `SMTP_PASS=<clé SMTP>`, `MAIL_FROM=BAOBAB <votre-email>`.
- **Gmail** : créer par exemple `baobab.plateforme@gmail.com`, activer la validation en deux étapes, puis créer un « mot de passe d'application ».
  Variables : `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=<adresse gmail>`, `SMTP_PASS=<mot de passe d'application>`, `MAIL_FROM=BAOBAB <adresse gmail>`.

Ajouter les variables dans Vercel → Settings → Environment Variables, puis « Redeploy ». Tester « Mot de passe oublié ».

## Étape 5 — Nom de domaine (⏳ quand vous voulez)
- En attendant, l'adresse gratuite `….vercel.app` fonctionne parfaitement, avec HTTPS inclus.
- **baobab.sn** : les domaines `.sn` s'achètent auprès d'un bureau d'enregistrement agréé par le NIC Sénégal (liste sur nic.sn). Vérifiez la disponibilité et les conditions (pièces demandées, tarif annuel). Je n'ai pas pu interroger le registre depuis mon environnement.
- Si `baobab.sn` est pris, voici des alternatives : `baobab-pilotage.sn`, `baobab.africa`, `getbaobab.app`.
- Une fois acheté : Vercel → Settings → Domains → ajouter le domaine, puis recopier les enregistrements DNS indiqués chez le bureau d'enregistrement. Mettre à jour `APP_URL` et redéployer.

## Étape 6 — Paiement par carte (⏳ après l'immatriculation de l'entreprise)
- Le paiement par carte nécessite un **compte marchand** chez un prestataire (CinetPay, PayDunya…), qui demande des pièces d'entreprise (NINEA, RCCM). L'intégration CinetPay est **déjà codée** : il suffira d'ajouter `CINETPAY_API_KEY`, `CINETPAY_SITE_ID` et `CINETPAY_SECRET_KEY`.
- D'ici là : **Wave / Orange Money vers votre numéro**, vérifiés par vous dans `/admin`.

## Étape 7 — Avant la communication publique (👤)
- [ ] Compléter les mentions entre crochets dans `src/content/legal.ts` (ou me les donner) : nom de l'éditeur, contact, hébergeur (Vercel Inc., États-Unis ; Neon, Europe).
- [ ] Faire relire les pages légales par un juriste. La déclaration à la CDP est à prévoir dès que l'entreprise est immatriculée.
- [ ] Activer la surveillance gratuite de `/api/health` (uptimerobot.com).
- [ ] Faire relire le wolof par deux locuteurs natifs.
- [ ] Préparer les visuels de communication : la page d'aperçu et l'image de partage sont prêtes.

## Après chaque modification du code
Je pousse sur GitHub, puis Vercel redéploie automatiquement en 2 à 3 minutes. Le lien reste le même.
