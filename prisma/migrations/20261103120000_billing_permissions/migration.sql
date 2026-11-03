-- Ajoute les permissions d'abonnement aux rôles système existants.
UPDATE "Role" SET "permissions" = array_cat("permissions", ARRAY['billing:view', 'billing:manage'])
WHERE "key" = 'ORG_ADMIN' AND NOT ('billing:manage' = ANY("permissions"));
UPDATE "Role" SET "permissions" = array_append("permissions", 'billing:view')
WHERE "key" = 'EXECUTIVE_DIRECTOR' AND NOT ('billing:view' = ANY("permissions"));
-- La permission audit:export a été retirée du catalogue (aucune fonction associée pour l'instant).
UPDATE "Role" SET "permissions" = array_remove("permissions", 'audit:export');
