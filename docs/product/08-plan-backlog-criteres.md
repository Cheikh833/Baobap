# 08 — Plan de développement, backlog initial et critères d'acceptation

## Plan par phases
| Phase | Contenu | État |
|---|---|---|
| 0 — Audit & fondations | Dépôt initialisé (vide au départ), stack, architecture, modèle de données, design system, documentation | ✅ |
| 1 — Fondation organisationnelle | Auth, organisation, membership, multi-tenancy, RBAC, profil, structures, tableau de bord initial, audit | ✅ |
| 2 — Stratégie | Portefeuilles ✅, programmes ✅, plans stratégiques ✅, axes ✅, objectifs ✅, contributions pondérées des projets ✅, couverture et budget aligné ✅ ; arbitrages et scénarios 🔜 | ✅ (cœur) |
| 3 — Projets | Création ✅, fiche ✅, cycle de vie ✅, phases ✅, activités ✅, tâches ✅, jalons ✅, dépendances ✅, Gantt ✅, Kanban ✅, « Mes tâches » ✅ ; équipe projet et parties prenantes ✅ ; livrables, calendrier 🔜 | ✅ (cœur) |
| 4 — Impact & MEAL | Cadre logique ✅ avec contrôles de cohérence ✅, indicateurs ✅, ventilations ✅, collecte et validation à quatre yeux ✅, corrections tracées ✅, trajectoire et alertes d'actualisation ✅, santé du projet ✅ ; versions du cadre, ToC visuelle, évaluations, redevabilité, apprentissage 🔜 | ✅ (cœur) |
| 5 — Finances & risques | Financements ✅, lignes budgétaires ✅, dépenses validées à quatre yeux ✅, blocage des dépassements ✅, annulations tracées ✅, exécution vs temps ✅ ; registre des risques ✅, matrice 5×5 ✅, revues ✅ ; engagements, décaissements, rapports financiers bailleurs, incidents 🔜 | ✅ (cœur) |
| 6 — Documents | Stockage privé, versions, extraction, indexation, recherche, RAG, citations | 🔜 |
| 7 — Analyse de données | Import CSV ✅, dictionnaire et types corrigeables ✅, contrôle qualité ✅, statistiques descriptives ✅, fréquences ✅, tableau croisé + khi² avec conditions ✅, ANOVA ✅, histogrammes ✅ ; import XLSX, nettoyage traçable, régressions, insights IA 🔜 | ✅ (cœur) |
| 8 — BAOBAB AI | Assistant général + Expert, Intent Router, Context Engine, outils sécurisés, confirmations, streaming, citations, garde-fous | 🔜 |
| 9 — Studio | Dashboards, présentations, rapports, exports, partages, versions | 🔜 |
| 10 — Pilotage exécutif | Vues par rôle, notifications, recherche globale, workflows | 🔜 |
| 11 — Entreprise & production | Administration plateforme, RLS, CSP, 2FA, monitoring, sauvegardes, déploiement | 🔜 |

## Backlog initial priorisé (prochaines itérations)
| # | Élément | Phase | Priorité |
|---|---|---|---|
| B1 | Arbitrer les points ouverts (modèle commercial, multi-programmes, email, hébergement, IA, langues) | — | Haute |
| B2 | Déploiement Preview (Vercel + PostgreSQL managé), variables, migrations automatiques | 11 | Haute |
| B3 | Envoi d'emails (invitations, réinitialisation de mot de passe) | 1 | Haute |
| B4 | Réinitialisation du mot de passe, modification du profil utilisateur | 1 | Haute |
| B5 | Plans, axes, objectifs stratégiques + contributions des projets (pondération, sans double comptage) | 2 | Haute |
| B6 | Équipe projet (membres, rôles projet) + permissions par périmètre | 3 | Haute |
| B7 | Phases, activités, tâches, jalons, livrables, dépendances ; vues liste et Kanban | 3 | Haute |
| B8 | Gantt et calendrier | 3 | Moyenne |
| B9 | Cadre logique (Impact/Outcome/Output/Activités) versionné + cohérence verticale | 4 | Haute |
| B10 | Indicateurs, cibles, valeurs périodiques validées, désagrégations | 4 | Haute |
| B11 | Budget par lignes, financements, dépenses validées, taux d'exécution | 5 | Haute |
| B12 | Registre et matrice des risques (seuils configurables) | 5 | Moyenne |
| B13 | Export CSV des listes (avec permission `export`) | 9 | Moyenne |
| B14 | RLS PostgreSQL, CSP, rate limiting partagé | 11 | Moyenne |
| B15 | Tests d'accessibilité automatisés (axe-core) dans le parcours E2E | 11 | Moyenne |

## Critères d'acceptation généraux (Definition of Done)
Une fonctionnalité est terminée seulement si : (1) elle existe dans l'interface ; (2) elle fonctionne de bout en bout (UI → validation → action → autorisation → service → base → UI) ; (3) elle utilise les données réelles ; (4) elle respecte les permissions côté serveur et l'isolation des organisations ; (5) elle gère les états chargement, vide, succès, erreur, non autorisé, introuvable ; (6) elle a des tests automatisés (service + calculs) ; (7) elle a été vérifiée dans le navigateur, y compris en mobile.

## Critères d'acceptation des fonctionnalités livrées
| Fonctionnalité | Critères | Vérification |
|---|---|---|
| Inscription / connexion | Mot de passe robuste exigé ; email unique ; message d'erreur non discriminant ; 8 échecs → blocage temporaire ; succès non comptés | Tests intégration + E2E |
| Isolation | Aucune lecture/écriture/suppression inter-organisation ; références croisées refusées ; non-membre ou suspendu sans contexte | Tests intégration |
| RBAC | Lecteur sans écriture ; bailleur sans membres ni audit ; chef de projet ne peut pas activer | Tests intégration + E2E |
| Invitations | Lien unique, lié à l'email, expirant, révocable ; admin ne peut pas inviter un propriétaire | Tests intégration + E2E |
| Propriétaires | Au moins un propriétaire actif en permanence | Tests intégration |
| Structures | Arbre sans cycle ; suppression bloquée si sous-structures | Tests intégration + E2E |
| Assistant projet | Brouillon dès l'étape 1 ; chaque étape ne modifie que ses champs ; pas de saut d'étape non atteinte ; retour sans perte ; champs facultatifs non bloquants | Tests intégration + E2E |
| Hiérarchie | Héritage du portefeuille du programme ; incohérence refusée ; déplacement propagé | Tests intégration |
| Cycle de vie | Transitions autorisées uniquement ; activation exige dates + `project:approve` | Tests intégration + E2E |
| Tableau de bord | Aucun chiffre sans donnée ; budgets par devise ; avancement pondéré par la durée | Tests unitaires + intégration + E2E |
| Audit | Chaque modification importante journalisée avec auteur et différences | Tests intégration + E2E |
| Responsive | Aucun défilement horizontal de 320 à 1440 px | E2E (8 tailles) |
