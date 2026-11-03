# 03 — Architecture fonctionnelle

## Modules et sous-modules
La navigation cible (A à M du master prompt) est conservée intégralement dans `src/app/(workspace)/nav.ts`. Les modules non construits y figurent avec leur phase prévue et sont non cliquables.

| Module | Sous-modules livrés | Sous-modules prévus |
|---|---|---|
| A. Tableau de bord | Vue consolidée, alertes, activité récente, premiers pas | Vues par rôle (Direction, Chef de projet, MEAL, Finance) |
| B. Organisation | Vue d'ensemble, profil, structures, membres, rôles & permissions, audit | Gouvernance (comités, circuits de validation, délégations), paramètres |
| C. Stratégie & portefeuilles | Portefeuilles | Plans, axes, objectifs stratégiques, alignement, arbitrages |
| D. Programmes & projets | Programmes, projets, assistant, fiche, santé, cycle de vie | Activités, tâches, livrables, jalons, dépendances, Gantt, Kanban, calendrier, clôture |
| E. MEAL | — | Cadre logique, ToC, indicateurs, collecte, qualité, évaluations, redevabilité, apprentissage |
| F. Finances | Budget prévisionnel indicatif (projets, programmes, portefeuilles) | Lignes, financements, dépenses, engagements, décaissements, variances |
| G. Risques | — | Registre, matrice, mitigation, incidents |
| H. Analyse de données | — | Import, dictionnaire, qualité, statistiques, visualisations |
| I. Documents | — | Bibliothèque, versions, RAG, citations |
| J. BAOBAB AI | — | Assistant général, mode Expert, outils sécurisés |
| K. Studio | — | Dashboards, présentations, rapports, partages |
| L–M. Collaboration, Administration | Audit | Commentaires, notifications, workflows, administration plateforme |

## Relations métier (cible)

```mermaid
erDiagram
  ORGANIZATION ||--o{ STRATEGIC_PLAN : définit
  STRATEGIC_PLAN ||--o{ STRATEGIC_AXIS : contient
  STRATEGIC_AXIS ||--o{ STRATEGIC_OBJECTIVE : contient
  ORGANIZATION ||--o{ PORTFOLIO : possède
  PORTFOLIO ||--o{ PROGRAM : regroupe
  PROGRAM ||--o{ PROJECT : regroupe
  PORTFOLIO ||--o{ PROJECT : "regroupe (hors programme)"
  PROJECT }o--o{ STRATEGIC_OBJECTIVE : "contribue à (pondéré)"
  PROJECT ||--o{ PHASE : planifie
  PHASE ||--o{ ACTIVITY : contient
  ACTIVITY ||--o{ TASK : contient
  ACTIVITY ||--o{ DELIVERABLE : produit
  PROJECT ||--|| LOGFRAME : "est décrit par"
  LOGFRAME ||--o{ RESULT : "Impact/Outcome/Output"
  ACTIVITY }o--o{ RESULT : "contribue à"
  RESULT }o--o{ INDICATOR : "mesuré par"
  INDICATOR ||--o{ INDICATOR_VALUE : "valeurs par période"
  PROJECT ||--o{ BUDGET_LINE : budgète
  ACTIVITY }o--o{ BUDGET_LINE : "financée par"
  BUDGET_LINE ||--o{ EXPENSE : consomme
  FUNDING_AGREEMENT }o--o{ BUDGET_LINE : finance
  PROJECT ||--o{ RISK : expose
  RISK ||--o{ INCIDENT : "se réalise en"
  PROJECT ||--o{ DOCUMENT : documente
  DOCUMENT ||--o{ KNOWLEDGE_CHUNK : "indexé en"
  REPORT }o--o{ INDICATOR : "s'alimente de"
```

## Exemple de propagation (cible)
Une activité en retard → livrable en retard → résultat associé menacé → indicateur sous la trajectoire → budget non consommé (sous-exécution) → risque « retard de mise en œuvre » réévalué → alerte au tableau de bord → paragraphe du rapport marqué « à revoir » → contexte disponible pour l'IA. Chaque lien de cette chaîne est une relation explicite du modèle, d'où l'ordre des phases.

## Règles métier fondamentales
Voir `business-rules.md`. Les 20 règles de la partie XVI du master prompt sont reprises ; celles déjà appliquées dans le code sont marquées.
