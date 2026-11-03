# 07 — Cartographie des parcours utilisateurs

Légende : ✅ implémenté et testé en navigateur · 🔜 prévu (phase)

## P1 — Onboarding d'une nouvelle organisation
| Étape | Écran | État |
|---|---|---|
| Découverte | Landing `/` | ✅ |
| Inscription | `/signup` (validation serveur, messages en français, saisie conservée en cas d'erreur) | ✅ |
| Création de l'organisation | `/onboarding` (nom, sigle, code, type, pays, devise, secteurs, taille) — l'utilisateur devient Propriétaire | ✅ |
| Premiers pas | Carte « Premiers pas » du tableau de bord (profil, équipe, portefeuille, projet), filtrée selon les droits | ✅ |
| Logo, documents institutionnels | 🔜 phase 6 |
| Visite guidée des fonctionnalités | 🔜 phase 10 |

## P2 — Rejoindre une organisation (invitation)
Administrateur : `/organization/members` → email + rôle → lien affiché une seule fois ✅ → transmis hors application (email 🔜) → invité ouvre `/invitation/[jeton]` → crée son compte ou se connecte avec **le même email** → accepte → arrive dans l'organisation avec son rôle ✅.

## P3 — Structurer les interventions (parcours métier central)
| Étape du master prompt | Écran | État |
|---|---|---|
| 1. Stratégie | Plans, axes, objectifs | 🔜 phase 2 |
| 2. Portefeuille | `/portfolios/new`, `/portfolios/[id]` | ✅ |
| 3. Programme | `/programs/new`, `/programs/[id]` (rattachement au portefeuille, « + Ajouter un projet ») | ✅ |
| 4. Projet | Assistant `/projects/new` → `/projects/new/[id]/[étape]` : Identité · Positionnement (priorité, ODD) · Contexte · Objectifs · Bénéficiaires & territoire · Période · Budget · Vérification. Brouillon dès l'étape 1, reprise possible, champs facultatifs non bloquants | ✅ |
| 5. Conception (cadre logique, ToC) | 🔜 phase 4 |
| 6. Planification | 🔜 phase 3 |
| 7. Ressources | Budget prévisionnel ✅ ; lignes, financements, équipe 🔜 phases 3/5 |
| 8. Exécution / validation | Cycle de vie : Préparation → Actif (permission de validation, dates obligatoires) → Suspendu / Clôturé → Archivé ✅ |
| 9–14. Suivi-évaluation, analyse, décision, reporting, apprentissage, impact | 🔜 phases 4–10 |

## P4 — Piloter (Direction)
Tableau de bord ✅ : compteurs, projets par statut, budget prévisionnel par devise, avancement temporel pondéré des projets actifs, alertes (retard, échéance < 30 j), brouillons à compléter, activité récente. Vues par rôle 🔜 phase 10.

## P5 — Suivre un projet (Chef de projet)
Fiche `/projects/[id]` ✅ : aperçu (identité, objectifs, période, budget, bénéficiaires), santé (planning, complétude ; autres dimensions explicitement « non évaluées »), historique des modifications, paramètres (statut, édition par section, suppression). Onglets Planification, Activités, Résultats, MEAL, Finances, Risques, Équipe, Documents, Rapports 🔜.

## P6 — Consulter en tant que bailleur
Rôle « Bailleur (lecture) » ✅ : voit portefeuilles, programmes et projets de l'organisation qui l'a invité ; pas les membres ni l'audit ; aucune écriture. Partage sécurisé ciblé (liens expirants) 🔜 phase 9.

## P7 — Administrer
Rôles & permissions (matrice éditable, rôles personnalisés) ✅ · suspension/réactivation ✅ · structures et rattachements ✅ · journal d'audit paginé ✅ · changement d'organisation active ✅.
