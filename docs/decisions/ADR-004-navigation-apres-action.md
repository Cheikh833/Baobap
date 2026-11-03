# ADR-004 — Navigation après une action de formulaire et absence de `loading.tsx` global

**Statut** : acceptée · **Date** : 2026-11-03

**Contexte** : les tests navigateur sur le build de production (Next.js 15.5, React 19) ont révélé quatre problèmes :
1. React 19 **réinitialise** les champs d'un formulaire après chaque soumission, y compris en cas d'erreur : l'utilisateur perdait sa saisie.
2. Avec un `loading.tsx` au niveau du groupe `(workspace)`, le routeur client **abandonnait** les navigations entre pages sœurs dynamiques (ex. `/projects/[id]` → `/projects`). La requête RSC aboutissait (200), puis était annulée. Reproduit à 0–1 réussite sur 3 ; 3/3 une fois le fichier supprimé.
3. `redirect()` dans une Server Action déclenchée par `useActionState` laissait parfois le formulaire bloqué sur « Enregistrement… », et la navigation client pouvait afficher une version **périmée** d'une étape préchargée avant l'enregistrement.
4. Modifier un cookie dans une action fait re-rendre la page courante par Next.js (cas de l'invitation acceptée).

**Décision** :
- Les formulaires sont soumis via `useActionForm` (`preventDefault` + `startTransition(dispatch)`) : pas de réinitialisation automatique.
- Les actions ne font jamais `redirect()`. Elles renvoient `navigateTo(url)` et le formulaire effectue un **chargement complet** (`window.location.assign`) : comportement déterministe et données toujours fraîches.
- Les actions sans navigation appellent `revalidatePath` côté serveur, et la réponse embarque l'interface à jour (pas de `router.refresh()`).
- Déconnexion et changement d'organisation passent par des endpoints POST natifs (`/api/...`) avec contrôle d'origine.
- Pas de `loading.tsx` global. Les états de chargement sont portés par les boutons (« Enregistrement… »).
- Une page dont l'état change à cause de l'action gère ce nouvel état (ex. invitation déjà acceptée → redirection vers le tableau de bord).

**Conséquences** : navigation après formulaire un peu moins fluide (rechargement complet, environ 100 à 300 ms), en échange d'une fiabilité vérifiée (parcours E2E 45/45 sur des exécutions répétées). À réévaluer lors du passage à Next.js 16 : réintroduire des `loading.tsx` ciblés et la navigation client, en gardant le parcours E2E comme filet de sécurité.
