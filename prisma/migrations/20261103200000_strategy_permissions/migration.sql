-- Permissions du module Stratégie pour les rôles système existants.
UPDATE "Role" SET "permissions" = array_cat("permissions", ARRAY['strategy:view','strategy:create','strategy:edit','strategy:delete'])
WHERE "key" = 'ORG_ADMIN' AND NOT ('strategy:view' = ANY("permissions"));
UPDATE "Role" SET "permissions" = array_cat("permissions", ARRAY['strategy:view','strategy:create','strategy:edit'])
WHERE "key" = 'EXECUTIVE_DIRECTOR' AND NOT ('strategy:view' = ANY("permissions"));
UPDATE "Role" SET "permissions" = array_cat("permissions", ARRAY['strategy:view','strategy:edit'])
WHERE "key" = 'PORTFOLIO_MANAGER' AND NOT ('strategy:view' = ANY("permissions"));
UPDATE "Role" SET "permissions" = array_append("permissions", 'strategy:view')
WHERE "key" IN ('PROGRAM_MANAGER','PROJECT_MANAGER','MEAL_MANAGER','FINANCE_MANAGER','TEAM_MEMBER','VIEWER','DONOR_VIEWER') AND NOT ('strategy:view' = ANY("permissions"));
