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

## Mise en œuvre prévue (phase 8)
Couche fournisseurs interchangeables (Anthropic, OpenAI, Gemini), registre d'outils sécurisés appelant les services existants (`getProject`, `listProjects`…) avec le `TenantContext`, RAG respectant les droits documentaires, journal des appels, quotas par plan, tests de garde-fous (refus d'inventer, refus d'accès inter-organisation).
