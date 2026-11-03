# Langues de l'interface

**Décision du porteur de projet (2026-11-03)** : proposer toutes les langues possibles, y compris les langues nationales, pour faciliter l'utilisation.

## Ce qui est en place
- Infrastructure multilingue (`src/i18n/`). La langue est choisie par le sélecteur (cookie d'un an), sinon d'après les préférences du navigateur, sinon le français. L'attribut `lang` de la page suit la langue active, ce qui sert les lecteurs d'écran et la traduction automatique du navigateur.
- **Français** : langue de référence, complète.
- **Anglais** : complet sur les écrans traduits (un test vérifie qu'aucune clé ne manque).
- **Wolof (bêta)** : termes courants seulement (connexion, menu, accroche). Le reste s'affiche en français. Mention « bêta » dans le sélecteur.

Écrans traduits : site public, page Tarifs, connexion, inscription, création d'organisation, navigation, bandeau d'abonnement, tableau de bord, page Abonnement. Les autres écrans de l'espace de travail restent en français pour l'instant : la traduction est progressive, écran par écran. Les messages de validation renvoyés par le serveur sont encore en français.

## Pourquoi pas toutes les langues nationales tout de suite
Une traduction approximative d'un outil de gestion (budget, indicateurs, permissions) peut induire en erreur. Ce serait contraire au principe « ne jamais sacrifier la fiabilité à l'apparence ». Une langue n'est donc publiée qu'avec une relecture par des locuteurs natifs. L'infrastructure est prête : ajouter une langue revient à ajouter un fichier.

## Feuille de route proposée (à valider)
| Priorité | Langues | Condition |
|---|---|---|
| 1 | Wolof (validation de la bêta) | 2 relecteurs natifs |
| 2 | Pulaar, Sérère, Diola (Joola), Mandinka, Soninké | Glossaire métier + relecteurs (partenariat universitaire possible, par ex. UADB) |
| 3 | Bambara, Haoussa, Swahili, Portugais, Arabe (nécessite la mise en page de droite à gauche, déjà prévue : `dir`) | Selon les pays des organisations clientes |

## Ajouter une langue
1. Créer `src/i18n/messages/<code>.ts` (objet partiel typé, voir `wo.ts`).
2. L'ajouter dans `src/i18n/config.ts` (statut `beta` tant qu'elle n'est pas relue) et dans `src/i18n/translate.ts`.
3. Constituer un glossaire métier (projet, programme, portefeuille, indicateur, cadre logique, bailleur…) validé avant de traduire les écrans.
4. Passer en `complete` après relecture : le test « une langue complete couvre toutes les clés » s'applique alors.
