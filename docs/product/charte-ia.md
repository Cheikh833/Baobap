# Charte d'IA responsable de BAOBAB

**Décision du porteur de projet (2026-11-03)** : utiliser les fonctionnalités d'IA, de manière responsable et respectueuse. Cette charte s'applique au module BAOBAB AI (phase 8) et à toute fonction assistée par IA.

## Engagements
1. **Pas de chiffres inventés.** Effectifs, pourcentages, budgets, p-values et indicateurs viennent des services métier et du moteur statistique déterministe. L'IA les interprète, elle ne les produit pas.
2. **Faits ≠ recommandations ≠ hypothèses.** Chaque réponse distingue ce qui provient des données, ce qui est proposé et ce qui reste incertain. Les données manquantes sont signalées.
3. **Sources citées.** Toute réponse fondée sur des documents ou des données indique ses sources (document, page, jeu de données, période).
4. **Mêmes droits que l'utilisateur.** L'IA n'accède qu'aux données que l'utilisateur peut consulter, via les services métier (jamais d'accès direct à la base). Aucune donnée d'une autre organisation.
5. **L'humain décide.** Toute création ou modification proposée par l'IA demande une confirmation. Les opérations destructrices exigent une confirmation explicite. Tout est journalisé (`AIAction`, `ToolExecution`).
6. **Données personnelles et sensibles.** Les plaintes, données de santé et données de bénéficiaires ne sont jamais envoyées au modèle sans permission renforcée et minimisation. Pas d'utilisation des données des clients pour entraîner des modèles (clause contractuelle avec le fournisseur).
7. **Transparence.** L'interface indique quand un contenu est généré par l'IA, quel mode est utilisé (général ou Expert) et sur quel contexte la réponse s'appuie.
8. **Respect et inclusion.** Ton professionnel et respectueux, attention aux biais (genre, territoires, groupes vulnérables), pas de contenu discriminatoire. Une théorie du changement proposée par l'IA n'est jamais présentée comme validée scientifiquement.
9. **Maîtrise des coûts et sobriété.** Quotas par plan, mise en cache, modèle adapté à la tâche.

## Mise en œuvre (phase 8, novembre 2026)
- **Lecture seule** : l'assistant n'a que des outils de consultation (vue d'ensemble, projets, fiche projet, indicateurs, documents et connaissances, « Mes actions »). Il ne crée ni ne modifie rien : l'engagement 5 est respecté par construction.
- **Mêmes droits** : chaque outil appelle les services métier avec le contexte de la personne (`TenantContext`) ; un accès refusé est renvoyé au modèle comme tel, et il le dit.
- **Pas de chiffres inventés** : consigne système explicite ; tous les chiffres proviennent des outils (calculs déterministes déjà documentés) ; pas d'addition entre devises.
- **Sources** : les liens des pages consultées sont affichés sous chaque réponse ; le modèle cite avec des liens internes uniquement (les liens externes ne sont pas rendus cliquables).
- **Documents** : leur contenu est signalé au modèle comme une donnée à analyser, jamais comme une instruction (protection contre l'injection d'instructions).
- **Conversations privées** (visibles par leur seul auteur), **quotas mensuels par plan**, jetons consommés enregistrés, désactivé en lecture seule et tant que la clé n'est pas configurée.
- **Refus** : géré proprement ; repli automatique côté serveur vers un autre modèle quand c'est pertinent.
- Fournisseur : Anthropic (Claude), modèle configurable (`BAOBAB_AI_MODEL`). Les données envoyées au fournisseur ne servent pas à entraîner ses modèles (conditions commerciales de l'API).
- Testé avec un modèle simulé : boucle d'outils, droits, conversations privées, refus, quota (`tests/integration/ai.test.ts`).
