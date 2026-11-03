# 02 — Product Requirements Document (PRD)

## Vision
Devenir le Work OS de référence des organisations à impact, en particulier en Afrique, en remplaçant une gestion fragmentée (fichiers Excel, outils isolés, rapports manuels) par un système intégré où stratégie, projets, suivi-évaluation, finances, risques, données et décisions sont reliés.

**Positionnement** : la plateforme intelligente de pilotage des projets, programmes et organisations. **Signature** : Planifier. Exécuter. Impacter.

## Différenciation (vs Asana, Monday, ClickUp, Jira, Notion)
1. Pilotage organisationnel intégré (stratégie → impact), pas seulement des tâches.
2. Cycle de vie complet des projets et programmes (conception, cadre logique, clôture).
3. Suivi-évaluation et mesure d'impact au cœur du modèle de données.
4. Analyse de données avec moteur statistique déterministe et IA contextualisée, sourcée et respectant les permissions.
5. Production de rapports bailleurs et de connaissances à partir d'une source unique.

## Utilisateurs cibles et besoins clés
| Persona | Besoin principal | Modules |
|---|---|---|
| Directeur exécutif | Vue consolidée, alertes, décisions | Tableau de bord, Stratégie, Studio |
| Responsable de portefeuille / programme | Cohérence et performance d'un ensemble | Portefeuilles, Programmes, MEAL |
| Chef de projet | Piloter un projet de bout en bout | Projets, Planification, Risques |
| Responsable MEAL / S&E | Indicateurs, collecte, qualité, évaluations | MEAL, Analyse |
| Responsable financier | Budgets, dépenses, variances, rapports bailleurs | Finances |
| Data analyst / chargé de recherche | Importer, nettoyer, analyser | Analyse de données |
| Bailleur / partenaire | Consulter les résultats partagés | Accès lecture, Share Center |
| Administrateur | Membres, rôles, sécurité, audit | Organisation, Administration |

## Problèmes résolus
Données dispersées ; projets isolés ; absence de vue consolidée ; lien activités-résultats-stratégie difficile ; dépenses peu traçables ; indicateurs difficiles à actualiser ; rapports manuels ; retards et risques mal suivis ; perte de connaissances.

## Exigences fonctionnelles (par module)
Le périmètre cible complet est celui du master prompt (parties III et VI–XII). Il est découpé en phases (voir 08). Exigences **implémentées** dans cette version :

- **EF-AUTH** : inscription, connexion, déconnexion, sessions serveur, limitation des échecs.
- **EF-ORG** : création d'organisation, profil institutionnel complet, structures internes en arbre, multi-organisation.
- **EF-MEM** : invitations sécurisées, rôles, suspension, rattachement aux structures.
- **EF-RBAC** : rôles système et personnalisés, permissions `ressource:action` vérifiées côté serveur.
- **EF-AUD** : journal d'audit consultable, historique par projet.
- **EF-PF / EF-PG** : portefeuilles et programmes (CRUD, rattachements, agrégats).
- **EF-PJ** : assistant projet avec brouillon, fiche projet, santé, cycle de vie, filtres.
- **EF-DASH** : tableau de bord calculé sur données réelles, alertes à règles explicites.

## Exigences non fonctionnelles
| Domaine | Exigence |
|---|---|
| Sécurité | Isolation des organisations côté serveur, mots de passe bcrypt, jetons hachés, cookies httpOnly/SameSite, contrôle d'origine, en-têtes de sécurité, validation des entrées (Zod) |
| Intégrité | Soft delete, audit, transactions, contraintes d'unicité par organisation, données validées non modifiables silencieusement (à partir de la phase 4) |
| Fiabilité | Aucune fausse fonctionnalité ; états chargement/vide/erreur/non autorisé/introuvable |
| Performance | Rendu serveur, JS client minimal (~105 ko partagés) adapté aux connexions limitées |
| Accessibilité | Labels, focus visibles, navigation clavier, lien d'évitement, réduction des animations, contrastes |
| Responsive | 320 px → grand écran, sans défilement horizontal (vérifié sur 8 tailles) |
| Langue | Français (interface et messages d'erreur) |

## Indicateurs de succès produit (proposition)
Temps de création d'un projet complet ; part des projets avec cadre logique et indicateurs à jour ; délai de production d'un rapport bailleur ; nombre d'organisations actives / utilisateurs actifs hebdomadaires ; zéro incident d'isolation.

## Hors périmètre de cette version
Modules MEAL, Finances, Risques, Documents, Analyse, IA, Studio, Notifications, Workflows, Administration plateforme, intégrations (KoboToolbox, ODK, Drive…). Ils sont signalés « Bientôt » dans l'interface.
