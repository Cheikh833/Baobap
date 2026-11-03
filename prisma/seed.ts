/**
 * Données de DÉMONSTRATION — entièrement FICTIVES.
 * L'organisation est nommée « [DÉMO] … » pour qu'aucune donnée ne puisse être confondue avec une donnée réelle.
 * Usage : npm run db:seed  (refuse de s'exécuter si NODE_ENV=production)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SYSTEM_ROLES } from "../src/server/permissions/catalog";

const db = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Seed de démonstration interdit en production.");
  const existing = await db.organization.findUnique({ where: { code: "DEMO" } });
  if (existing) {
    await seedStrategy(existing.id);
    console.log("Organisation de démonstration déjà présente — stratégie vérifiée.");
    return;
  }
  const passwordHash = await bcrypt.hash("demo-baobab-2026", 12);
  const users = await Promise.all(
    [
      ["demo.directrice@example.org", "Awa Démo (fictif)", "ORG_OWNER"],
      ["demo.chefprojet@example.org", "Moussa Démo (fictif)", "PROJECT_MANAGER"],
      ["demo.bailleur@example.org", "Bailleur Démo (fictif)", "DONOR_VIEWER"],
    ].map(async ([email, name, role]) => ({ role, user: await db.user.upsert({ where: { email }, update: {}, create: { email, name, passwordHash } }) })),
  );
  const org = await db.organization.create({
    data: {
      name: "[DÉMO] ONG Fictive Sahel Avenir", shortName: "DÉMO", code: "DEMO", type: "NGO_NATIONAL", country: "Sénégal", city: "Thiès",
      sectors: ["Santé", "Éducation", "Agriculture"], defaultCurrency: "XOF",
      plan: "PROFESSIONNEL", subscriptionStatus: "TRIALING", trialEndsAt: new Date(Date.now() + 30 * 86_400_000),
      description: "Organisation fictive créée pour la démonstration. Aucune de ces données n'est réelle.",
    },
  });
  await db.role.createMany({ data: SYSTEM_ROLES.map((r) => ({ ...r, organizationId: org.id, isSystem: true })) });
  for (const { role, user } of users) {
    const r = await db.role.findUniqueOrThrow({ where: { organizationId_key: { organizationId: org.id, key: role } } });
    await db.membership.create({ data: { userId: user.id, organizationId: org.id, roleId: r.id } });
  }
  const owner = users[0].user.id;
  const pm = users[1].user.id;
  const dir = await db.organizationalUnit.create({ data: { organizationId: org.id, name: "Direction des programmes", type: "DIRECTORATE" } });
  await db.organizationalUnit.create({ data: { organizationId: org.id, name: "Bureau régional de Thiès", type: "REGIONAL_OFFICE", parentId: dir.id } });

  const pf = await db.portfolio.create({ data: { organizationId: org.id, name: "Résilience des communautés rurales", code: "PF-RES", status: "ACTIVE", managerId: owner, startDate: new Date("2025-01-01"), endDate: new Date("2028-12-31") } });
  const prog = await db.program.create({ data: { organizationId: org.id, portfolioId: pf.id, name: "Programme santé maternelle", code: "PG-SM", status: "ACTIVE", managerId: owner, startDate: new Date("2025-03-01"), endDate: new Date("2027-12-31"), sectors: ["Santé"], zones: ["Thiès", "Diourbel"] } });
  const year = new Date().getFullYear();
  await db.project.createMany({
    data: [
      { organizationId: org.id, portfolioId: pf.id, programId: prog.id, name: "Cliniques mobiles (fictif)", code: "PRJ-001", status: "ACTIVE", managerId: pm, startDate: new Date(`${year - 1}-01-01`), endDate: new Date(`${year + 1}-06-30`), plannedBudget: 150000000, currency: "XOF", country: "Sénégal", region: "Thiès", directBeneficiaries: 5000, generalObjective: "Améliorer l'accès aux soins prénatals (exemple fictif).", wizardStep: 8 },
      { organizationId: org.id, portfolioId: pf.id, programId: prog.id, name: "Formation des sages-femmes (fictif)", code: "PRJ-002", status: "ACTIVE", managerId: pm, startDate: new Date(`${year - 2}-01-01`), endDate: new Date(`${year}-01-31`), plannedBudget: 40000000, currency: "XOF", wizardStep: 8 },
      { organizationId: org.id, portfolioId: pf.id, name: "Étude de base nutrition (fictif)", code: "PRJ-003", status: "DRAFT", managerId: pm, wizardStep: 3 },
    ],
  });
  await seedStrategy(org.id);
  await db.auditLog.create({ data: { organizationId: org.id, actorId: owner, action: "seed.demo", entityType: "Organization", entityId: org.id, summary: "Chargement des données de démonstration (fictives)" } });
  console.log("Démo créée. Comptes (mot de passe : demo-baobab-2026) :", users.map((u) => u.user.email).join(", "));
}

/** Plan stratégique fictif + contributions des projets de démonstration (idempotent). */
async function seedStrategy(organizationId: string) {
  if (await db.strategicPlan.count({ where: { organizationId } })) return;
  const plan = await db.strategicPlan.create({
    data: { organizationId, title: "[DÉMO] Plan stratégique 2025–2028 (fictif)", reference: "PS-2025", status: "ACTIVE", startDate: new Date("2025-01-01"), endDate: new Date("2028-12-31"), vision: "Des communautés rurales en bonne santé et résilientes (exemple fictif)." },
  });
  const a1 = await db.strategicAxis.create({ data: { organizationId, planId: plan.id, code: "A1", title: "Santé communautaire", position: 1 } });
  const a2 = await db.strategicAxis.create({ data: { organizationId, planId: plan.id, code: "A2", title: "Éducation et nutrition", position: 2 } });
  const os11 = await db.strategicObjective.create({ data: { organizationId, axisId: a1.id, code: "OS1.1", title: "Améliorer l'accès aux soins prénatals", position: 1 } });
  const os12 = await db.strategicObjective.create({ data: { organizationId, axisId: a1.id, code: "OS1.2", title: "Renforcer les compétences des agents de santé", position: 2 } });
  await db.strategicObjective.create({ data: { organizationId, axisId: a2.id, code: "OS2.1", title: "Réduire la malnutrition infantile", position: 1 } });
  const projects = await db.project.findMany({ where: { organizationId, code: { in: ["PRJ-001", "PRJ-002"] } } });
  for (const p of projects) {
    await db.projectObjectiveContribution.createMany({
      data: p.code === "PRJ-001" ? [{ projectId: p.id, objectiveId: os11.id, weight: 70 }, { projectId: p.id, objectiveId: os12.id, weight: 30 }] : [{ projectId: p.id, objectiveId: os12.id, weight: 100 }],
    });
  }
}

main().finally(() => db.$disconnect());
