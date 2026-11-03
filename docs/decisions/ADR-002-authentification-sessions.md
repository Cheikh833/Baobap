# ADR-002 — Authentification par sessions serveur intégrées

**Statut** : acceptée · **Date** : 2026-11-03

**Contexte** : le prompt suggère « Supabase Auth ou équivalent ». Aucun projet Supabase n'est configuré ; BAOBAB a besoin d'appartenances multiples avec rôles par organisation, que l'on gère de toute façon dans notre base.

**Décision** : sessions stockées en base (`Session`), jeton aléatoire de 256 bits en cookie httpOnly/SameSite=Lax/Secure, seul le SHA-256 du jeton est conservé ; mots de passe bcrypt (coût 12) ; limitation des échecs ; appartenances et rôles dans `Membership`/`Role`.

**Conséquences** : aucune dépendance externe, révocation immédiate des sessions possible. À ajouter : réinitialisation du mot de passe (nécessite un fournisseur email), 2FA, SSO (OIDC/SAML) pour les grandes institutions. Une migration vers un fournisseur externe resterait possible, car le reste du code ne consomme que `getSessionUser()`.
