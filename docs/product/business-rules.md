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
| Activités | Écart temps écoulé / avancement réel + activités en retard (voir Planification) | ✅ |
| Indicateurs & résultats | Seuls les indicateurs évalués (valeur validée) comptent : Critique si plus d'un quart sont en décrochage ; Vigilance si au moins un est en décrochage ou en vigilance, ou si un indicateur n'est pas actualisé ; Bon sinon ; Non évalué sans indicateur évalué | ✅ |
| Budget | Critique si une ligne est en dépassement ; Vigilance si l'exécution devance le temps écoulé de plus de 15 pts ou accuse plus de 25 pts de retard ; Bon sinon ; Non évalué sans budget détaillé | ✅ |
| Risques | Critique si un risque non clôturé est critique ; Vigilance si un risque élevé est ouvert ou une revue en retard ; Bon sinon ; Non évalué sans risque enregistré | ✅ |

## Stratégie (phase 2)
- Hiérarchie : **plan stratégique → axes → objectifs**. Codes d'axe et d'objectif uniques dans un plan.
- **Un seul plan actif** par organisation. Un plan actif ne peut pas être supprimé (il faut le clôturer d'abord).
- **Contributions** : un projet peut contribuer à plusieurs objectifs (plusieurs-à-plusieurs), avec une **part en %** pour chacun. La **somme des parts d'un projet ne dépasse jamais 100 %**.
- **Budget aligné sur un objectif** = Σ (budget prévu du projet × part / 100), par devise. Comme les parts d'un projet totalisent au plus 100 %, la somme sur tous les objectifs ne dépasse jamais le budget des projets : **pas de double comptage**. Les projets archivés sont exclus.
- **Objectif couvert** = au moins une contribution d'un projet non archivé. **Taux de couverture** = objectifs couverts / objectifs du plan.
- **Projets non alignés** = projets en cours (ni clôturés, ni archivés) sans aucune contribution à un objectif du plan.
- Suppression : un axe qui contient des objectifs, ou un objectif qui reçoit des contributions, ne peut pas être supprimé.

## Planification (phase 3)
- Hiérarchie : **projet → phases (facultatives) → activités → tâches** ; **jalons** datés ; **dépendances « fin → début »** entre activités du même projet, sans boucle (vérifié côté serveur).
- Une activité s'inscrit dans la période du projet quand elle est connue ; code d'activité unique dans le projet.
- **Avancement d'une activité** = part des tâches terminées si elle a des tâches, sinon l'avancement saisi ; « terminée » = 100 % ; « annulée » est exclue des calculs.
- **Avancement réel du projet** = moyenne des avancements d'activités pondérée par leur durée (jours).
- **Activité en retard** = date de fin dépassée et statut ni « terminée » ni « annulée ». **Tâche en retard** = échéance dépassée et tâche non terminée.
- **Conflit de dépendance** (signalé, non bloquant) = l'activité suivante commence avant la fin de la précédente.
- **Santé « Activités »** : écart (temps écoulé − avancement réel) ≤ 10 pts → bon ; ≤ 25 pts → vigilance ; au-delà → critique ; vigilance dès qu'une activité est en retard ; non évalué sans activité.
- **Kanban** : déplacer une tâche exige `project:edit`, **ou** d'en être la personne assignée (même avec un rôle en lecture). Ordre conservé dans chaque colonne ; `completedAt` renseigné au passage à « Terminé ».
- Une phase contenant des activités, ou une activité contenant des tâches, ne peut pas être supprimée.

## Suivi-évaluation — MEAL (phase 4)
- **Cadre logique** : Impact → Effets → Extrants → Activités. Un élément se rattache **uniquement au niveau immédiatement supérieur** (vérifié côté serveur) ; code unique dans le projet ; on ne supprime pas un élément qui a des sous-éléments ou des indicateurs.
- **Contrôles de cohérence** (signalés, non bloquants) : élément non rattaché, élément non décliné au niveau inférieur, élément (hors activités) sans indicateur, indicateur sans source de vérification, cadre sans impact.
- **Indicateur** : code unique dans le projet, définition, unité, type (quantitatif / qualitatif), sens attendu (à augmenter / à faire baisser), référence et cible datées (la cible respecte le sens attendu), fréquence, source, méthode, responsable, ventilations (« Sexe : Femmes, Hommes »).
- **Valeurs** : saisies « à valider » (`meal:create`) ; une seule valeur active par période. **Validation par une autre personne que celle qui a saisi** (`meal:approve`), sauf le propriétaire de l'organisation. Une valeur validée ne se modifie ni ne se supprime : on la **corrige** (nouvelle valeur liée, à valider) ; l'ancienne reste en vigueur jusqu'à la validation de la correction. Tout est journalisé.
- **Ventilation** : facultative ; si renseignée, chaque dimension est complète et **sa somme égale la valeur totale**.
- **Valeur actuelle** : uniquement les valeurs **validées** non remplacées — « dernière valeur » (par défaut) ou « somme des périodes » (cumul).
- **Taux d'atteinte** = (actuelle − référence) ÷ (cible − référence) × 100, arrondi à 0,1. Valable aussi pour les indicateurs à faire baisser. Indéfini sans référence, cible ou valeur.
- **Taux attendu** = part du temps écoulé entre date de référence et date cible (trajectoire linéaire).
- **Situation** : atteinte ≥ 100 % → sur la trajectoire ; sinon écart (attendu − atteinte) ≤ 10 pts → sur la trajectoire, ≤ 25 → vigilance, au-delà → décrochage ; non évalué sans taux.
- **Non actualisé** : aucune valeur validée depuis plus d'une période de collecte + 30 jours de grâce (ou depuis la date de référence s'il n'y a aucune valeur). Les indicateurs ponctuels ne sont jamais « non actualisés ».

## Finances (phase 5)
- **Une devise par projet** : tous les montants (financements, lignes, dépenses) sont dans la devise du projet ; **aucune conversion implicite**. La devise est figée dès qu'un budget détaillé ou un financement existe. Les vues d'ensemble totalisent **par devise**, jamais entre devises.
- **Financements** : bailleur / source, référence de convention, montant, période. **Écart de financement** = budget détaillé − financements (positif : financement manquant ; négatif : excédent).
- **Lignes budgétaires** : code unique dans le projet, catégorie, montant prévu, financement rattaché (facultatif). **Révision** : le montant prévu ne descend jamais sous le montant déjà dépensé. Suppression impossible s'il existe des dépenses.
- **Dépenses** : saisies « à valider » (`finance:create`), date non future, montant > 0, pièce justificative facultative. **Validation par une autre personne que la saisie** (`finance:approve`), sauf le propriétaire. **Une validation qui ferait dépasser la ligne est refusée** : il faut d'abord réviser le budget. Une dépense validée ne se modifie ni ne se supprime ; elle peut être **annulée avec motif obligatoire** (elle reste visible et journalisée).
- **Dépensé** = Σ dépenses validées ; **à valider** = Σ brouillons ; rejetées et annulées exclues. **Disponible** = prévu − dépensé. **Taux d'exécution** = dépensé ÷ prévu × 100 (0,1 près).

## Risques (phase 5)
- Registre par projet : code unique, catégorie, **probabilité et impact de 1 à 5**, responsable, mesures de mitigation, plan de contingence, statut (ouvert, en traitement, clôturé), date de prochaine revue.
- **Score** = probabilité × impact (1 à 25) ; niveaux : ≤ 4 faible, ≤ 9 modéré, ≤ 15 élevé, au-delà critique. **Matrice 5×5** des risques non clôturés.
- **Revue en retard** : date de revue dépassée (jour J non compris) et risque non clôturé.

## Analyse de données (phase 7, cœur)
- **Import** : CSV uniquement (virgule, point-virgule ou tabulation détectés automatiquement ; UTF-8, ou Windows-1252 pour les exports Excel), 4 Mo, 50 000 lignes et 200 colonnes maximum, première ligne = en-têtes (rendus uniques). Une ligne avec trop de valeurs est refusée avec son numéro ; une ligne incomplète est complétée par des cellules vides (et comptée).
- **Données d'origine intactes** : les cellules sont stockées telles quelles ; le type de colonne est **inféré** et peut être **corrigé** (journalisé) sans modifier les données.
- **Valeurs manquantes** : vide, NA, N/A, NaN, null, none, « - », « . », NR, NS, #N/A (sans tenir compte de la casse). Elles sont **exclues des calculs et toujours comptées**.
- **Inférence** : ≥ 95 % des valeurs renseignées numériques (virgule décimale et espaces de milliers acceptés) → numérique ; ≥ 95 % de dates (AAAA-MM-JJ ou JJ/MM/AAAA) → date ; ≤ 20 modalités distinctes répétées → catégorielle ; sinon texte libre.
- **Qualité** : cellules manquantes, lignes strictement identiques (doublons), valeurs non conformes au type, colonnes vides.
- **Descriptives** : n, moyenne, écart-type corrigé (n − 1), quartiles **méthode type 7** (R, Excel QUARTILE.INC), min, max, somme ; valeurs atypiques par la règle 1,5 × IQR ; histogramme à classes égales (règle de Sturges, 5 à 15 classes). Fréquences en % des réponses valides.
- **Tableau croisé** : lignes complètes uniquement (exclusions comptées), % en ligne ; **test du khi² de Pearson** (ddl = (l − 1)(c − 1)), **V de Cramér** (< 0,1 négligeable, < 0,3 faible, < 0,5 modérée, sinon forte). **Conditions de Cochran** : aucun effectif théorique < 1 et au plus 20 % < 5 ; sinon le résultat est explicitement déclaré non fiable. 30 modalités maximum.
- **Comparaison de moyennes** : ANOVA à un facteur (F, ddl, p, η²) ; chaque groupe doit compter au moins 2 observations ; rappel des hypothèses (normalité, variances comparables).
- Interprétation : seuil de 5 % ; une association statistique **n'est pas une preuve de causalité** (affiché).
- Accès : `analytics:view` (consulter), `analytics:create` (importer, corriger un type), `analytics:delete` ; inclus à partir du plan Professionnel (et pendant l'essai).

## Cycle de vie du projet
Brouillon → Préparation | Actif | Archivé ; Préparation → Brouillon | Actif | Archivé ; Actif → Suspendu | Clôturé ; Suspendu → Actif | Clôturé ; Clôturé → Archivé. Passer en **Actif** exige les dates de début et de fin et la permission `project:approve`.

## Hiérarchie
Un projet appartient à 0..1 programme et 0..1 portefeuille. S'il a un programme, son portefeuille est **celui du programme** (incohérence refusée) ; déplacer un programme vers un autre portefeuille y déplace ses projets. Un portefeuille ou un programme non vide ne peut pas être supprimé.

## Les 20 règles fondamentales (partie XVI) — état
1 isolation ✅ · 2 projet rattaché à une organisation ✅ · 3 rattachement programme/portefeuille ✅ · 4 contributions multiples 🔜 · 5 activité ↔ résultat 🔜 · 6 indicateur défini avec unité 🔜 · 7 valeur avec période et source 🔜 · 8 dépense avec affectation budgétaire 🔜 · 9 modification historisée ✅ · 10 donnée validée non modifiée silencieusement 🔜 · 11 pas de double comptage ✅ (budgets) · 12 calculs reproductibles ✅ · 13 données sources préservées ✅ (soft delete) · 14 permissions côté serveur ✅ · 15 IA avec les droits de l'utilisateur 🔜 (architecture prévue) · 16 actions IA traçables 🔜 · 17 rapports reliés aux données 🔜 · 18 exports soumis aux permissions 🔜 · 19 données fictives identifiées ✅ (seed « [DÉMO] … (fictif) ») · 20 source de vérité commune ✅.
