import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { OWNER_ROLE_KEY, SYSTEM_ROLES } from "@/server/permissions/catalog";
import { TRIAL_DAYS, TRIAL_PLAN } from "@/lib/plans";

/**
 * Crée un espace de démonstration pour l'utilisateur : organisation fictive, clairement marquée
 * « [DÉMO] … (fictif) », avec structures, portefeuille, programme, projets et plan stratégique.
 * Elle est séparée de la vraie organisation : on peut l'explorer et la modifier sans risque.
 * Une seule démo par utilisateur.
 */
export async function createDemoOrganization(userId: string, now = new Date()) {
  const existing = await db.organization.findFirst({ where: { isDemo: true, createdById: userId }, select: { id: true } });
  if (existing) return existing;

  const y = now.getUTCFullYear();
  const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
  const code = `DEMO-${randomBytes(3).toString("hex").toUpperCase()}`;

  return db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: "[DÉMO] ONG Sahel Avenir (fictif)", shortName: "DÉMO", code, type: "NGO_NATIONAL", country: "Sénégal", region: "Thiès", city: "Thiès",
        sectors: ["Santé", "Nutrition", "Éducation"], defaultCurrency: "XOF", isDemo: true, createdById: userId,
        description: "Organisation fictive pour découvrir BAOBAB. Aucune de ces données n'est réelle.",
        mission: "Améliorer durablement la santé et la nutrition des communautés rurales (exemple fictif).",
        vision: "Des communautés rurales en bonne santé et résilientes (exemple fictif).",
        plan: TRIAL_PLAN, subscriptionStatus: "TRIALING", trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * 86_400_000),
      },
    });
    await tx.role.createMany({ data: SYSTEM_ROLES.map((r) => ({ ...r, organizationId: org.id, isSystem: true })) });
    const owner = await tx.role.findUniqueOrThrow({ where: { organizationId_key: { organizationId: org.id, key: OWNER_ROLE_KEY } } });
    await tx.membership.create({ data: { userId, organizationId: org.id, roleId: owner.id } });
    const o = org.id;

    const dir = await tx.organizationalUnit.create({ data: { organizationId: o, name: "Direction des programmes", type: "DIRECTORATE" } });
    await tx.organizationalUnit.createMany({
      data: [
        { organizationId: o, name: "Bureau régional de Thiès", type: "REGIONAL_OFFICE", parentId: dir.id },
        { organizationId: o, name: "Cellule suivi-évaluation", type: "UNIT", parentId: dir.id },
        { organizationId: o, name: "Service administratif et financier", type: "SERVICE" },
      ],
    });

    const pf = await tx.portfolio.create({ data: { organizationId: o, name: "Résilience des communautés rurales", code: "PF-RES", status: "ACTIVE", managerId: userId, startDate: d(`${y - 1}-01-01`), endDate: d(`${y + 3}-12-31`), objective: "Réduire la vulnérabilité sanitaire et nutritionnelle des ménages ruraux.", plannedBudget: 900000000 } });
    const pfEdu = await tx.portfolio.create({ data: { organizationId: o, name: "Éducation et jeunesse", code: "PF-EDU", status: "ACTIVE", managerId: userId, startDate: d(`${y}-01-01`), endDate: d(`${y + 2}-12-31`) } });
    const prog = await tx.program.create({ data: { organizationId: o, portfolioId: pf.id, name: "Santé maternelle et infantile", code: "PG-SMI", status: "ACTIVE", managerId: userId, startDate: d(`${y - 1}-03-01`), endDate: d(`${y + 2}-12-31`), sectors: ["Santé"], zones: ["Thiès", "Diourbel", "Fatick"], generalObjective: "Réduire la mortalité maternelle et infantile dans trois régions." } });
    const progNut = await tx.program.create({ data: { organizationId: o, portfolioId: pf.id, name: "Nutrition communautaire", code: "PG-NUT", status: "ACTIVE", managerId: userId, startDate: d(`${y}-01-01`), endDate: d(`${y + 2}-06-30`), sectors: ["Nutrition"], zones: ["Kaffrine", "Kaolack"] } });

    const P = (data: Record<string, unknown>) => tx.project.create({ data: { organizationId: o, currency: "XOF", wizardStep: 8, managerId: userId, country: "Sénégal", ...data } as never });
    const p1 = await P({ portfolioId: pf.id, programId: prog.id, name: "Cliniques mobiles prénatales", code: "PRJ-001", status: "ACTIVE", priority: "HIGH", sdgs: [3, 5], startDate: d(`${y - 1}-02-01`), endDate: d(`${y + 1}-06-30`), plannedBudget: 150000000, region: "Thiès", zones: ["Tivaouane", "Mbour"], directBeneficiaries: 5200, indirectBeneficiaries: 18000, shortDescription: "Consultations prénatales mobiles dans 40 villages éloignés (exemple fictif).", generalObjective: "Améliorer l'accès aux soins prénatals.", specificObjectives: ["Atteindre 4 consultations prénatales par femme enceinte", "Former 60 relais communautaires"], context: "Exemple fictif : faible fréquentation des structures de santé dans les zones enclavées." });
    const p2 = await P({ portfolioId: pf.id, programId: prog.id, name: "Formation des sages-femmes", code: "PRJ-002", status: "ACTIVE", priority: "MEDIUM", sdgs: [3, 4], startDate: d(`${y - 2}-01-01`), endDate: d(`${y}-01-31`), plannedBudget: 40000000, region: "Diourbel", directBeneficiaries: 120, shortDescription: "Formation continue de 120 sages-femmes (exemple fictif)." });
    const p3 = await P({ portfolioId: pf.id, programId: progNut.id, name: "Dépistage de la malnutrition infantile", code: "PRJ-003", status: "ACTIVE", priority: "CRITICAL", sdgs: [2, 3], startDate: d(`${y}-01-15`), endDate: d(`${y + 1}-12-31`), plannedBudget: 95000000, region: "Kaffrine", directBeneficiaries: 8000, shortDescription: "Dépistage et prise en charge de la malnutrition aiguë (exemple fictif)." });
    await P({ portfolioId: pfEdu.id, name: "Cantines scolaires durables", code: "PRJ-004", status: "PREPARATION", priority: "MEDIUM", sdgs: [2, 4], startDate: d(`${y + 1}-01-01`), endDate: d(`${y + 2}-12-31`), plannedBudget: 60000000, region: "Fatick", directBeneficiaries: 3500 });
    await P({ portfolioId: pf.id, name: "Étude de base nutrition", code: "PRJ-005", status: "DRAFT", priority: "LOW", sdgs: [2], wizardStep: 3 });

    const plan = await tx.strategicPlan.create({ data: { organizationId: o, title: `[DÉMO] Plan stratégique ${y - 1}–${y + 3} (fictif)`, reference: "PS-DEMO", status: "ACTIVE", startDate: d(`${y - 1}-01-01`), endDate: d(`${y + 3}-12-31`), vision: org.vision, mission: org.mission } });
    const a1 = await tx.strategicAxis.create({ data: { organizationId: o, planId: plan.id, code: "A1", title: "Santé communautaire", position: 1 } });
    const a2 = await tx.strategicAxis.create({ data: { organizationId: o, planId: plan.id, code: "A2", title: "Nutrition et éducation", position: 2 } });
    const os11 = await tx.strategicObjective.create({ data: { organizationId: o, axisId: a1.id, code: "OS1.1", title: "Améliorer l'accès aux soins prénatals", ownerId: userId, position: 1, expectedResult: "80 % des femmes enceintes réalisent au moins 4 consultations." } });
    const os12 = await tx.strategicObjective.create({ data: { organizationId: o, axisId: a1.id, code: "OS1.2", title: "Renforcer les compétences des agents de santé", position: 2 } });
    const os21 = await tx.strategicObjective.create({ data: { organizationId: o, axisId: a2.id, code: "OS2.1", title: "Réduire la malnutrition infantile", position: 1 } });
    await tx.strategicObjective.create({ data: { organizationId: o, axisId: a2.id, code: "OS2.2", title: "Améliorer la scolarisation des filles", position: 2 } });
    await tx.projectObjectiveContribution.createMany({
      data: [
        { projectId: p1.id, objectiveId: os11.id, weight: 70 }, { projectId: p1.id, objectiveId: os12.id, weight: 30 },
        { projectId: p2.id, objectiveId: os12.id, weight: 100 }, { projectId: p3.id, objectiveId: os21.id, weight: 100 },
      ],
    });

    await audit(tx, { organizationId: o, actorId: userId, action: "demo.create", entityType: "Organization", entityId: o, summary: "Création de l'espace de démonstration (données fictives)" });
    return { id: o };
  });
}

/** Vrai si l'utilisateur possède déjà une démo (pour l'affichage du bouton). */
export async function hasDemo(userId: string) {
  return (await db.organization.count({ where: { isDemo: true, createdById: userId } })) > 0;
}
