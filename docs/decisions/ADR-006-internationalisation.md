# ADR-006 — Internationalisation sans changement des URL

**Statut** : acceptée · **Date** : 2026-11-03

**Décision** : langue portée par un cookie (choix explicite), sinon par `Accept-Language`, sinon le français. Pas de préfixe de langue dans les URL, ce qui évite de restructurer toutes les routes et de casser les liens existants. Dictionnaires TypeScript typés : le français fait référence, les autres langues sont des objets partiels fusionnés avec repli sur le français. Un fournisseur React transmet le dictionnaire aux composants client. Sélecteur en formulaire natif (`POST /api/locale`).

**Conséquences** : ajout d'une langue = un fichier ; clés vérifiées par TypeScript ; test garantissant la complétude des langues `complete`. Limite : pas d'URL par langue pour le référencement du site public. À reconsidérer si le SEO multilingue devient prioritaire.
