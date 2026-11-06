-- Permissions des modules Documents, Studio (rapports), BAOBAB AI et Administration pour les rôles système existants.
CREATE OR REPLACE FUNCTION pg_temp.add_perms(role_key text, perms text[]) RETURNS void AS $$
  UPDATE "Role" SET "permissions" = (SELECT array_agg(DISTINCT p) FROM unnest("permissions" || perms) AS p) WHERE "key" = role_key;
$$ LANGUAGE sql;
SELECT pg_temp.add_perms('ORG_OWNER', ARRAY['documents:view','documents:create','documents:edit','documents:delete','reports:view','reports:create','reports:edit','reports:delete','reports:approve','ai:view','administration:view','administration:export']);
SELECT pg_temp.add_perms('ORG_ADMIN', ARRAY['documents:view','documents:create','documents:edit','documents:delete','reports:view','reports:create','reports:edit','reports:delete','reports:approve','ai:view','administration:view','administration:export']);
SELECT pg_temp.add_perms('EXECUTIVE_DIRECTOR', ARRAY['documents:view','reports:view','reports:create','reports:edit','reports:approve','ai:view','administration:view']);
SELECT pg_temp.add_perms('PORTFOLIO_MANAGER', ARRAY['documents:view','documents:create','documents:edit','reports:view','reports:create','reports:edit','ai:view']);
SELECT pg_temp.add_perms('PROGRAM_MANAGER', ARRAY['documents:view','documents:create','documents:edit','reports:view','reports:create','reports:edit','ai:view']);
SELECT pg_temp.add_perms('PROJECT_MANAGER', ARRAY['documents:view','documents:create','documents:edit','reports:view','reports:create','reports:edit','ai:view']);
SELECT pg_temp.add_perms('MEAL_MANAGER', ARRAY['documents:view','documents:create','documents:edit','reports:view','reports:create','reports:edit','ai:view']);
SELECT pg_temp.add_perms('FINANCE_MANAGER', ARRAY['documents:view','documents:create','reports:view','reports:create','reports:edit','ai:view']);
SELECT pg_temp.add_perms('TEAM_MEMBER', ARRAY['documents:view','documents:create','reports:view','ai:view']);
SELECT pg_temp.add_perms('VIEWER', ARRAY['documents:view','reports:view','ai:view']);
SELECT pg_temp.add_perms('DONOR_VIEWER', ARRAY['reports:view']);
