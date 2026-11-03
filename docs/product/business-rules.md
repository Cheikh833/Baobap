# Règles métier et formules de calcul

Implémentation : `src/lib/metrics.ts`, `src/lib/project-health.ts`, services `src/server/services/*`. Toutes testées (`tests/unit`, `tests/integration`).

## Trois mesures à ne jamais confondre
| Mesure | Définition | État |
|---|---|---|
| **Avancement temporel** | (aujourd'hui − début) / (fin − début), borné à [0 ; 100] %. Sans dates : non calculé (« — »). | ✅ |
| **Taux d'exécution budgétaire** | Dépenses validées / budget révisé de la même période et de la même devise. | 🔜 phase 5 |
| **Taux d'atteinte d'une cible** | (valeur actuelle − baseline) / (cible − baseline), pour une valeur validée d'une période donnée. | 🔜 phase 4 |

## Formules implémentées
- **Durée** (jours) = fin − début + 1 (bornes incluses).
- **Projet en retard** = date de fin < aujourd'hui **et** statut ∉ {Clôturé, Archivé}.
- **Échéance proche** = fin dans les 30 prochains jours, projet non clôturé.
- **Budget consolidé** = somme des budgets prévus **par devise** ; aucune conversion implicite ; les éléments sans budget sont comptés à part et signalés. Le tableau de bord exclut les projets archivés.
- **Avancement temporel consolidé** = moyenne des avancements des projets **actifs**, **pondérée par leur durée** (Σ avancement × durée / Σ durée). Les projets sans dates sont exclus et leur nombre est affiché. Une moyenne simple ferait peser un projet de 2 semaines autant qu'un projet de 3 ans.
- **Agrégats de portefeuille/programme** : somme des budgets des projets **directement rattachés**, par devise. Le budget propre du programme est affiché séparément (pas d'addition des deux → pas de double comptage).

## Santé du projet
| Dimension | Règle | État |
|---|---|---|
| Planning | Critique si en retard ; Vigilance si ≤ 30 jours restants ou ≥ 85 % du temps écoulé ; Bon sinon ; Non évalué sans dates | ✅ |
| Complétude de la fiche | Part des 10 champs clés renseignés (chef de projet, description, contexte, objectif général, objectifs spécifiques, pays, bénéficiaires directs, début, fin, budget) : ≥ 80 % Bon, ≥ 50 % Vigilance, sinon Critique | ✅ |
| Activités, Budget, Indicateurs, Risques | Affichées « Non évalué » avec le module requis — **jamais estimées** | 🔜 |

## Cycle de vie du projet
Brouillon → Préparation | Actif | Archivé ; Préparation → Brouillon | Actif | Archivé ; Actif → Suspendu | Clôturé ; Suspendu → Actif | Clôturé ; Clôturé → Archivé. Passer en **Actif** exige les dates de début et de fin et la permission `project:approve`.

## Hiérarchie
Un projet appartient à 0..1 programme et 0..1 portefeuille. S'il a un programme, son portefeuille est **celui du programme** (incohérence refusée) ; déplacer un programme vers un autre portefeuille y déplace ses projets. Un portefeuille ou un programme non vide ne peut pas être supprimé.

## Les 20 règles fondamentales (partie XVI) — état
1 isolation ✅ · 2 projet rattaché à une organisation ✅ · 3 rattachement programme/portefeuille ✅ · 4 contributions multiples 🔜 · 5 activité ↔ résultat 🔜 · 6 indicateur défini avec unité 🔜 · 7 valeur avec période et source 🔜 · 8 dépense avec affectation budgétaire 🔜 · 9 modification historisée ✅ · 10 donnée validée non modifiée silencieusement 🔜 · 11 pas de double comptage ✅ (budgets) · 12 calculs reproductibles ✅ · 13 données sources préservées ✅ (soft delete) · 14 permissions côté serveur ✅ · 15 IA avec les droits de l'utilisateur 🔜 (architecture prévue) · 16 actions IA traçables 🔜 · 17 rapports reliés aux données 🔜 · 18 exports soumis aux permissions 🔜 · 19 données fictives identifiées ✅ (seed « [DÉMO] … (fictif) ») · 20 source de vérité commune ✅.
