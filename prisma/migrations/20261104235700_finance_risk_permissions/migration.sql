-- Permissions des modules Finances (finance:*) et Risques (risk:*) pour les rôles système existants.
CREATE OR REPLACE FUNCTION pg_temp.add_perms(role_key text, perms text[]) RETURNS void AS $$
  UPDATE "Role" SET "permissions" = (SELECT array_agg(DISTINCT p) FROM unnest("permissions" || perms) AS p) WHERE "key" = role_key;
$$ LANGUAGE sql;
SELECT pg_temp.add_perms('ORG_OWNER', ARRAY['finance:view','finance:create','finance:edit','finance:delete','finance:approve','risk:view','risk:create','risk:edit','risk:delete']);
SELECT pg_temp.add_perms('ORG_ADMIN', ARRAY['finance:view','finance:create','finance:edit','finance:delete','finance:approve','risk:view','risk:create','risk:edit','risk:delete']);
SELECT pg_temp.add_perms('EXECUTIVE_DIRECTOR', ARRAY['finance:view','finance:approve','risk:view','risk:edit']);
SELECT pg_temp.add_perms('PORTFOLIO_MANAGER', ARRAY['finance:view','risk:view','risk:create','risk:edit']);
SELECT pg_temp.add_perms('PROGRAM_MANAGER', ARRAY['finance:view','risk:view','risk:create','risk:edit']);
SELECT pg_temp.add_perms('PROJECT_MANAGER', ARRAY['finance:view','finance:create','finance:edit','risk:view','risk:create','risk:edit']);
SELECT pg_temp.add_perms('MEAL_MANAGER', ARRAY['finance:view','risk:view']);
SELECT pg_temp.add_perms('FINANCE_MANAGER', ARRAY['finance:view','finance:create','finance:edit','finance:delete','finance:approve','risk:view','risk:create']);
SELECT pg_temp.add_perms('TEAM_MEMBER', ARRAY['finance:view','finance:create','risk:view','risk:create']);
SELECT pg_temp.add_perms('VIEWER', ARRAY['finance:view','risk:view']);
SELECT pg_temp.add_perms('DONOR_VIEWER', ARRAY['finance:view']);
