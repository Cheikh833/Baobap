# 06 — Matrice des rôles et permissions

## Principes
- Permissions au format `ressource:action`, catalogue unique : `src/server/permissions/catalog.ts`.
- Vérifiées **côté serveur** dans chaque service (`assertCan`). L'interface ne fait que masquer.
- Rôles **par organisation** : un utilisateur peut avoir un rôle différent dans chaque organisation.
- Rôles système créés automatiquement ; tous modifiables sauf **Propriétaire** (tous les droits). Rôles personnalisés possibles.
- Garde-fous : au moins un propriétaire actif ; seul un propriétaire attribue ou retire le rôle Propriétaire ; on ne peut pas suspendre son propre compte ; un rôle utilisé ne peut pas être supprimé.
- Activer un projet (`ACTIVE`) exige `project:approve` (séparation préparation / validation).
- Les permissions des modules futurs (MEAL, finances, risques, documents, IA, exports, partages) seront ajoutées au catalogue avec leur module ; les rôles MEAL, Finance, etc. existent déjà avec des droits de lecture.

## Matrice des rôles système (générée depuis le code)

| Permission | Propriétaire de l'organisation | Administrateur | Directeur exécutif | Responsable de portefeuille | Responsable de programme | Chef de projet | Responsable MEAL | Responsable financier | Membre d'équipe | Lecteur | Bailleur (lecture) |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Organisation — Consulter (`organization:view`) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Organisation — Modifier (`organization:edit`) | ✔ | ✔ |  |  |  |  |  |  |  |  |  |
| Organisation — Gérer (`organization:manage`) | ✔ |  |  |  |  |  |  |  |  |  |  |
| Structures internes — Consulter (`units:view`) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |  |
| Structures internes — Créer (`units:create`) | ✔ | ✔ |  |  |  |  |  |  |  |  |  |
| Structures internes — Modifier (`units:edit`) | ✔ | ✔ |  |  |  |  |  |  |  |  |  |
| Structures internes — Supprimer (`units:delete`) | ✔ | ✔ |  |  |  |  |  |  |  |  |  |
| Membres — Consulter (`members:view`) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |  |
| Membres — Gérer (`members:manage`) | ✔ | ✔ |  |  |  |  |  |  |  |  |  |
| Rôles — Consulter (`roles:view`) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |  |
| Rôles — Gérer (`roles:manage`) | ✔ | ✔ |  |  |  |  |  |  |  |  |  |
| Journal d'audit — Consulter (`audit:view`) | ✔ | ✔ | ✔ |  |  |  |  |  |  |  |  |
| Portefeuilles — Consulter (`portfolio:view`) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Portefeuilles — Créer (`portfolio:create`) | ✔ | ✔ |  | ✔ |  |  |  |  |  |  |  |
| Portefeuilles — Modifier (`portfolio:edit`) | ✔ | ✔ | ✔ | ✔ |  |  |  |  |  |  |  |
| Portefeuilles — Supprimer (`portfolio:delete`) | ✔ | ✔ |  |  |  |  |  |  |  |  |  |
| Programmes — Consulter (`program:view`) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Programmes — Créer (`program:create`) | ✔ | ✔ |  | ✔ | ✔ |  |  |  |  |  |  |
| Programmes — Modifier (`program:edit`) | ✔ | ✔ | ✔ | ✔ | ✔ |  |  |  |  |  |  |
| Programmes — Supprimer (`program:delete`) | ✔ | ✔ |  |  |  |  |  |  |  |  |  |
| Projets — Consulter (`project:view`) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Projets — Créer (`project:create`) | ✔ | ✔ |  | ✔ | ✔ | ✔ |  |  |  |  |  |
| Projets — Modifier (`project:edit`) | ✔ | ✔ |  | ✔ | ✔ | ✔ |  |  |  |  |  |
| Projets — Supprimer (`project:delete`) | ✔ | ✔ |  |  |  |  |  |  |  |  |  |
| Projets — Valider (`project:approve`) | ✔ | ✔ | ✔ |  |  |  |  |  |  |  |  |


## Rôles prévus par le cahier des charges et non encore créés
Platform Super Admin (administration plateforme, phase 11), M&E Officer, Finance Officer, Risk Manager, Data Analyst, Knowledge Manager, Partner Viewer : créés avec leurs modules. Ils peuvent déjà être reproduits comme rôles personnalisés.

## Permissions par périmètre (proposition)
Phase 3 : un membre affecté à l'équipe d'un projet pourra recevoir des droits limités à ce projet (ex. « Chef de projet » sur 2 projets seulement). Le contrôle sera `assertCan(ctx, perm, { projectId })`, combinant rôle d'organisation et affectation.
