import { db } from "@/server/db";
import { registerUser } from "@/server/services/auth";
import { createOrganization } from "@/server/services/organization";
import { loadTenantContext } from "@/server/tenant";

export async function resetDb() {
  await db.$executeRawUnsafe(
    `TRUNCATE "Expense","BudgetLine","Funding","Risk","Dataset","IndicatorValue","Indicator","LogframeItem","ActivityDependency","Task","Milestone","Activity","ProjectPhase","ProjectObjectiveContribution","StrategicObjective","StrategicAxis","StrategicPlan","PasswordResetToken","Payment","PlanRequest","AuditLog","Invitation","UnitMembership","Membership","Role","OrganizationalUnit","Project","Program","Portfolio","Organization","Session","User" CASCADE`,
  );
}

let n = 0;
export async function ownerWithOrg(label = "A") {
  n++;
  const user = await registerUser({ name: `Owner ${label}`, email: `owner${label.toLowerCase()}${n}@test.sn`, password: "motdepasse123" });
  const org = await createOrganization(user.id, { name: `Org ${label}`, code: `ORG${label}${n}`, type: "NGO_NATIONAL", country: "Sénégal", sectors: "" });
  const ctx = (await loadTenantContext(user.id, org.id))!;
  return { user, org, ctx };
}

/** Ajoute un utilisateur à l'organisation avec un rôle système donné. */
export async function memberWithRole(organizationId: string, roleKey: string) {
  n++;
  const user = await registerUser({ name: `${roleKey} ${n}`, email: `${roleKey.toLowerCase()}${n}@test.sn`, password: "motdepasse123" });
  const role = await db.role.findUniqueOrThrow({ where: { organizationId_key: { organizationId, key: roleKey } } });
  await db.membership.create({ data: { userId: user.id, organizationId, roleId: role.id } });
  return { user, ctx: (await loadTenantContext(user.id, organizationId))! };
}
