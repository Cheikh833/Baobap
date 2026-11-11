# Guide de présentation — foires et salons

## 1. À vérifier la veille (sur Vercel)
| Réglage | Pourquoi | Comment vérifier |
|---|---|---|
| `APP_URL` = l'adresse publique exacte (ex. `https://baobab-rust.vercel.app`) | Le QR code de l'affiche et les liens pointent dessus | Ouvrir `/salon` : l'adresse sous le QR doit être la bonne |
| `COOKIE_SECURE=true` | Connexions sécurisées | — |
| `ANTHROPIC_API_KEY` + **crédit** sur console.anthropic.com | BAOBAB AI | Poser une question dans BAOBAB AI |
| Plafond de dépense mensuel sur console.anthropic.com (Limits) | Éviter toute surprise | — |
| `GUEST_AI_DAILY_LIMIT` (facultatif, 100 par défaut) | Plafond IA pour l'ensemble des visiteurs, par jour | — |
| Dernier déploiement « Ready » | Version à jour | Vercel → Deployments |

Test final : sur un téléphone **en 4G** (pas le Wi-Fi du stand), scanner le QR de l'affiche → « Lancer la démo » → le tableau de bord s'ouvre.

## 2. Matériel
- **Affiche A4** : ouvrir `/salon` → « Imprimer l'affiche » (choisir « Marges : aucune » et « Graphiques d'arrière-plan » dans la fenêtre d'impression). En imprimer plusieurs.
- Un ordinateur avec BAOBAB ouvert sur la démo, en plein écran (F11).
- Un téléphone avec l'application installée (menu du navigateur → « Ajouter à l'écran d'accueil »).
- Plan B sans réseau : les captures d'écran du dossier de démonstration.

## 3. Scénario de démonstration (5 minutes)
1. **Accueil** (30 s) : page d'accueil, l'arbre qui pousse — « Planifier. Exécuter. Impacter. »
2. **« Voir la démo en direct »** (10 s) : un espace complet s'ouvre, sans inscription.
3. **Tableau de bord** (45 s) : exécution budgétaire 70,7 % pour ~73 % du temps, indicateurs, risques, « Mes actions ».
4. **Projet PRJ-001** (1 min 30) : Planification (Gantt), Suivi-évaluation (indicateur IND-1 et sa courbe), Finances (une validation refusée si la ligne est dépassée), Risques (matrice).
5. **Ctrl+K** (15 s) : taper « hivernage » → risque, procès-verbal et leçon apprise trouvés, y compris dans le contenu des documents.
6. **Studio** (45 s) : ouvrir le rapport d'avancement → export **Word** en un clic ; expliquer que la validation fige les chiffres.
7. **BAOBAB AI** (45 s) : « Quels indicateurs sont en décrochage ? » → réponse chiffrée avec ses sources.
8. **Conclusion** : 30 jours gratuits, prix en FCFA, paiement Wave / Orange Money, bailleurs gratuits.

## 4. Réponses rapides aux questions fréquentes
- **Nos données sont-elles en sécurité ?** Chaque organisation est isolée, chaque action est contrôlée côté serveur et tracée dans un journal d'audit ; export complet possible à tout moment (Administration).
- **L'IA invente-t-elle des chiffres ?** Non : elle ne lit que vos données, à travers des outils en lecture seule qui respectent vos droits, et cite ses sources.
- **Ça marche sur téléphone ?** Oui, et l'application s'installe sur l'écran d'accueil.
- **Combien ça coûte ?** Essentiel 15 000 FCFA/mois, Professionnel 49 000, Institution 149 000, Entreprise sur devis ; −30 % solidaire ; bailleurs en lecture seule gratuits ; 2 mois offerts en annuel.
- **En quelles langues ?** Français et anglais ; wolof en cours de validation.

## 5. Après la foire
Les espaces de démo des visiteurs sont effacés automatiquement après 24 h. Les visiteurs qui ont cliqué « Créer mon compte gratuit » démarrent leur essai de 30 jours.
