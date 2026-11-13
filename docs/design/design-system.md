# Design system BAOBAB

Identité : SaaS professionnel, sobre, institutionnel, africain contemporain sans folklore. Implémentation : `tailwind.config.ts`, `src/components/ui/*`, `src/components/forms/*`.

## Palette (tokens Tailwind)
| Token | Valeur | Usage |
|---|---|---|
| `brand` | `#087F68` | Actions principales, éléments actifs |
| `brand-deep` | `#073B3A` | Survol, titres sur fond clair de marque |
| `navy` | `#102A43` | Texte principal, pied de page |
| `canvas` | `#F7F9F8` | Fond de l'application |
| `white` | `#FFFFFF` | Cartes |
| `line` | `#E4EAE7` | Bordures |
| `success` / `warning` / `danger` / `info` | `#16A34A` / `#F59E0B` / `#DC2626` / `#2563EB` | États |

## Typographie
Inter (repli système). Hiérarchie : Display 48–60 px (landing) · H1 24 px semibold · H2 16 px semibold · Body 14 px · Small 12 px · Caption/labels 11 px uppercase espacé.

## Espacements et formes
Grille de 4 px ; cartes `rounded-xl` + bordure `line` + ombre légère ; contrôles 40 px de haut (zones tactiles ≥ 40 px) ; gouttière 16 px en mobile.

## Composants disponibles
`Button`, `ButtonLink` (primary, secondary, ghost, danger ; sm/md/lg) · `Input`, `Select`, `Textarea`, `Field` (label, aide, erreur liée par `aria-describedby`) · `ActionForm` + `TextField`, `TextAreaField`, `SelectField`, `CheckboxGroup` (erreurs serveur par champ, état en cours) · `SubmitButton` · `Card`, `PageHeader` (fil d'Ariane), `Badge` (6 tons), `StatusBadge`, `Stat`, `ProgressBar` (ARIA), `DefinitionList` (« Non renseigné » explicite), `Table`/`Td` (défilement horizontal interne), `EmptyState`, `TabNav`, `WizardStepper`, `Forbidden`.
Prévus avec les modules : date picker avancé, modales/drawers, tooltips, graphiques (Recharts), filtres avancés, notifications.

## États obligatoires
Chargement (bouton « Enregistrement… » désactivé) · Vide (`EmptyState` avec action) · Succès/Erreur (`FormMessage`, rôle `status`/`alert`) · Désactivé · Non autorisé (`Forbidden`) · Introuvable (404). Note : pas de squelette global de navigation (voir ADR-004).

## Navigation
Barre latérale fixe (≥ 1024 px), tiroir en mobile ; modules futurs grisés « Bientôt » non cliquables ; sélecteur d'organisation active ; lien « Aller au contenu ».

## Accessibilité
Labels sur tous les champs, focus visibles, `aria-current`, `aria-invalid`, rôles ARIA des barres de progression, `prefers-reduced-motion` respecté, `lang="fr"`.

## Responsive
Testé sans défilement horizontal en 320×568, 375×812, 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×900.

## Refonte de novembre 2026
- **Logo** : silhouette d'un baobab devant le soleil levant (doré) sur fond émeraude en dégradé ; mêmes tracés pour le favicon et l'icône de l'application (`src/components/logo.tsx`).
- **Espace de travail** : barre supérieure en verre dépoli (recherche Ctrl+K, « Page d'accueil », BAOBAB AI, actions, profil) ; menu latéral sombre avec élément actif en dégradé ; fond à halos doux (`.app-bg`).
- **Retour à l'accueil** : logo du menu, entrée « Page d'accueil » du menu, bouton de la barre supérieure et icône maison sur mobile.
- **Composants** : cartes à grands rayons (`rounded-3xl`), chiffres clés en cartes colorées (émeraude, bleu nuit, turquoise, or) avec icône en filigrane, titres de page avec barre d'accent, boutons arrondis.
