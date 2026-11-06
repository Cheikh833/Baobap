# Audit et checklist BAOBAB — 6 novembre 2026

Mise au point complète : ce qui est livré et vérifié, ce qui a été corrigé pendant l'audit, ce qui reste.

## 1. Méthode de vérification

| Contrôle | Résultat |
|---|---|
| Robot d'audit (`tests/e2e/audit.mjs`) : toutes les pages atteignables par les liens, 5 profils (visiteur, propriétaire en français et en anglais, chef de projet, bailleur), ordinateur **et** mobile 360 px | **393 pages, 0 problème** : aucune erreur serveur, aucune erreur JavaScript, aucun débordement horizontal, aucun texte « undefined / NaN », aucun texte français dans l'interface anglaise |
| Formulaires « Modifier » ouverts et enregistrés sans changement (structures, rôles, stratégie, activités, indicateurs, lignes budgétaires, risques…) | **20 / 20 enregistrés avec succès** |
| Parcours navigateur de bout en bout (`tests/e2e/journey.mjs`) : inscription → organisation → projet → planification → finances → risques → équipe → suivi-évaluation → analyse → invitations → droits → langues → responsive | **89 / 89 vérifications** |
| Tests unitaires et d'intégration (PostgreSQL réel) : règles métier, droits, isolation entre organisations, formules, cryptographie de connexion | **150 / 150** |
| Intégration continue GitHub (types, lint, tests, build) | verte à chaque envoi |

## 2. Fonctionnalités livrées et vérifiées

| Module | Contenu | État |
|---|---|---|
| Comptes et connexion | Email + mot de passe, **Google, Microsoft, Apple** (compte créé la première fois, rattaché si l'email existe, connexion directe ensuite), appareil reconnu, mot de passe oublié, sessions 30 jours, limitation des tentatives | ✅ (boutons externes actifs dès que les clés sont configurées) |
| Organisation | Profil, structures internes en arbre, membres, invitations par lien/email, 11 rôles + rôles personnalisés, matrice de permissions, journal d'audit | ✅ |
| Abonnement | Essai 30 jours, 4 offres en FCFA, limites, lecture seule après l'essai, Wave / Orange Money (vérification manuelle `/admin`), CinetPay (prêt, inactif sans clés) | ✅ |
| Stratégie | Plan actif, axes, objectifs, contributions pondérées des projets, couverture, budget aligné sans double comptage | ✅ |
| Portefeuilles, programmes, projets | Assistant 8 étapes avec brouillon, fiche, cycle de vie, santé du projet sur **6 dimensions calculées** | ✅ |
| Planification | Phases, activités, dépendances, tâches (Kanban), jalons, Gantt, retards | ✅ |
| **Équipe & parties prenantes** | Affectation des membres (rôle, %, période) ; registre des parties prenantes, grille influence × intérêt ; coordonnées masquées aux lecteurs | ✅ (nouveau) |
| Suivi-évaluation (MEAL) | Cadre logique contrôlé, indicateurs, ventilations, saisie, validation à quatre yeux, corrections tracées, trajectoire, alertes | ✅ |
| Finances | Financements, lignes budgétaires, dépenses validées à quatre yeux, blocage des dépassements, annulations tracées, exécution vs temps, totaux par devise | ✅ |
| Risques | Registre, probabilité × impact, matrice 5×5, mitigation / contingence, revues en retard | ✅ |
| Analyse de données | Import CSV (Excel compris), dictionnaire, qualité, statistiques, histogrammes, tableaux croisés + khi², ANOVA | ✅ |
| **Mes actions** | Validations en attente, tâches en retard ou proches, activités en retard, revues de risques, indicateurs à actualiser — selon les droits, compteur dans le menu | ✅ (nouveau) |
| Tableau de bord | Chiffres clés, stratégie, budgets, **synthèse finances / indicateurs / risques / mes actions** (nouveau), mes tâches, activité récente | ✅ |
| Démo | Espace fictif complet en un clic (toutes les données ci-dessus, marquées fictives) | ✅ |
| Langues | Français, anglais complets ; wolof en bêta (repli sur le français pour les textes non traduits) | ✅ |
| Site public | Page d'accueil animée (cérémonie d'ouverture), tarifs, pages légales (modèles), SEO | ✅ |

## 3. Corrigé pendant l'audit

- Tableau de bord : débordement horizontal sur mobile de la nouvelle synthèse (corrigé, vérifié à 360 px).
- Page Tarifs : « Tout le plan Professionnel », « Utilisateurs et volumes illimités » et « Partages avec bailleurs, circuits de validation » étaient marqués « À venir » alors qu'ils fonctionnent.
- Invitation sur un appareil déjà utilisé : « Créer mon compte » renvoyait vers la connexion (corrigé : création explicite toujours possible).
- Onglet projet « Équipe & parties prenantes » et entrée de menu « Notifications » : n'étaient que des « Bientôt » ; remplacés par des fonctions réelles.

## 4. Ce qui reste (prochaines phases)

| Élément | Nature | Priorité proposée |
|---|---|---|
| Stockage des fichiers hors base de données (pour de gros volumes), aperçu en ligne des documents | Développement | 3 |
| BAOBAB AI : mode Expert, propositions d'actions avec confirmation | Développement | 3 |
| Notifications par email (rappels d'échéance, validations en attente) | Développement (la base « Mes actions » existe) | 2 |
| Consolidation multi-organisations / multi-pays, SSO d'entreprise (SAML), intégrations (KoboToolbox, ODK) | Développement — offres Institution / Entreprise | 4 |
| Finances avancées : engagements, décaissements, rapports financiers par bailleur | Développement | 2 |
| Pagination des longues listes (dépenses, journal) | Amélioration | 3 |

## 4 bis. Livré après l'audit (7 novembre 2026)
- **Documents & connaissances**, **BAOBAB Studio**, **Administration**, **BAOBAB AI** : plus aucun module « Bientôt » dans le menu ni dans les onglets de projet.
- Parcours navigateur porté à 97 vérifications ; 165 tests automatiques.

## 5. Actions à faire de votre côté (hors code)

| Action | Où | Effet |
|---|---|---|
| Créer les clés **Google** (gratuit) | Google Cloud Console → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` dans Vercel | Bouton « Continuer avec Google » |
| Clé **Anthropic** pour BAOBAB AI (facturation à l'usage) | console.anthropic.com → `ANTHROPIC_API_KEY` dans Vercel | Assistant BAOBAB AI actif |
| Créer les clés **Microsoft** (gratuit) | Portail Azure → `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | Bouton « Continuer avec Microsoft » |
| Clés **Apple** (99 $/an, facultatif) | Apple Developer | Bouton « Continuer avec Apple » |
| Email d'envoi (Brevo ou Gmail) | Variables `SMTP_*` | Invitations et mots de passe oubliés envoyés automatiquement |
| Vérifier `APP_URL` et `COOKIE_SECURE=true` | Vercel | Liens corrects, cookies sécurisés |
| Faire relire les pages légales par un juriste | `/legal/*` | Conformité |
| Faire valider le wolof (et d'autres langues nationales) par des locuteurs natifs | `docs/product/langues.md` | Langues nationales complètes |
| Nom de domaine `baobab.sn` | NIC Sénégal | Adresse définitive |
| NINEA puis compte CinetPay | CinetPay | Paiement en ligne automatique |

Toutes les étapes détaillées sont dans [`docs/deploiement.md`](../deploiement.md). Ne jamais coller de mot de passe ou de clé secrète dans une conversation : uniquement dans les variables de Vercel.
