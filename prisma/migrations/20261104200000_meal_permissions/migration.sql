-- Permissions des modules Suivi-évaluation (meal:*) et Analyse de données (analytics:*) pour les rôles système existants.
CREATE OR REPLACE FUNCTION pg_temp.add_perms(role_key text, perms text[]) RETURNS void AS $$
  UPDATE "Role" SET "permissions" = (SELECT array_agg(DISTINCT p) FROM unnest("permissions" || perms) AS p) WHERE "key" = role_key;
$$ LANGUAGE sql;
SELECT pg_temp.add_perms('ORG_ADMIN', ARRAY['meal:view','meal:create','meal:edit','meal:delete','meal:approve','analytics:view','analytics:create','analytics:delete']);
SELECT pg_temp.add_perms('EXECUTIVE_DIRECTOR', ARRAY['meal:view','meal:approve','analytics:view']);
SELECT pg_temp.add_perms('PORTFOLIO_MANAGER', ARRAY['meal:view','meal:create','meal:edit','analytics:view']);
SELECT pg_temp.add_perms('PROGRAM_MANAGER', ARRAY['meal:view','meal:create','meal:edit','analytics:view']);
SELECT pg_temp.add_perms('PROJECT_MANAGER', ARRAY['meal:view','meal:create','meal:edit','analytics:view','analytics:create']);
SELECT pg_temp.add_perms('MEAL_MANAGER', ARRAY['meal:view','meal:create','meal:edit','meal:delete','meal:approve','analytics:view','analytics:create','analytics:delete']);
SELECT pg_temp.add_perms('FINANCE_MANAGER', ARRAY['meal:view','analytics:view']);
SELECT pg_temp.add_perms('TEAM_MEMBER', ARRAY['meal:view','meal:create','analytics:view']);
SELECT pg_temp.add_perms('VIEWER', ARRAY['meal:view','analytics:view']);
SELECT pg_temp.add_perms('DONOR_VIEWER', ARRAY['meal:view']);
