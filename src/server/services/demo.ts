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

    // Planification fictive du projet PRJ-001 : phases, activités, dépendance, tâches, jalons.
    const ph1 = await tx.projectPhase.create({ data: { organizationId: o, projectId: p1.id, name: "Lancement", position: 1 } });
    const ph2 = await tx.projectPhase.create({ data: { organizationId: o, projectId: p1.id, name: "Mise en œuvre", position: 2 } });
    const A = (data: Record<string, unknown>) => tx.activity.create({ data: { organizationId: o, projectId: p1.id, ownerId: userId, ...data } as never });
    const act1 = await A({ phaseId: ph1.id, code: "A1.1", title: "Recrutement de l'équipe mobile", startDate: d(`${y - 1}-02-01`), endDate: d(`${y - 1}-04-30`), status: "DONE", position: 1 });
    const act2 = await A({ phaseId: ph1.id, code: "A1.2", title: "Formation des relais communautaires", startDate: d(`${y - 1}-05-01`), endDate: d(`${y - 1}-08-31`), status: "DONE", position: 2 });
    const act3 = await A({ phaseId: ph2.id, code: "A2.1", title: "Tournées de consultations prénatales", startDate: d(`${y - 1}-09-01`), endDate: d(`${y + 1}-03-31`), status: "IN_PROGRESS", position: 3 });
    const act4 = await A({ phaseId: ph2.id, code: "A2.2", title: "Sensibilisation dans les villages", startDate: d(`${y}-01-15`), endDate: d(`${y + 1}-04-30`), status: "IN_PROGRESS", progress: 40, position: 4 });
    await A({ phaseId: ph2.id, code: "A2.3", title: "Évaluation finale", startDate: d(`${y + 1}-04-01`), endDate: d(`${y + 1}-06-30`), status: "NOT_STARTED", position: 5 });
    await tx.activityDependency.createMany({ data: [{ predecessorId: act1.id, successorId: act2.id }, { predecessorId: act2.id, successorId: act3.id }] });
    const T = (data: Record<string, unknown>) => ({ organizationId: o, projectId: p1.id, assigneeId: userId, ...data }) as never;
    await tx.task.createMany({
      data: [
        T({ activityId: act3.id, title: "Planifier la tournée du trimestre", status: "DONE", position: 1, priority: "HIGH", completedAt: now }),
        T({ activityId: act3.id, title: "Commander les kits de dépistage", status: "IN_PROGRESS", position: 1, priority: "CRITICAL", dueDate: new Date(now.getTime() + 5 * 86_400_000) }),
        T({ activityId: act3.id, title: "Mettre à jour le registre des consultations", status: "TODO", position: 1, priority: "MEDIUM", dueDate: new Date(now.getTime() + 12 * 86_400_000) }),
        T({ activityId: act4.id, title: "Préparer les supports en wolof et pulaar", status: "REVIEW", position: 1, priority: "HIGH", dueDate: new Date(now.getTime() - 2 * 86_400_000) }),
        T({ activityId: act4.id, title: "Former 10 nouveaux relais", status: "TODO", position: 2, priority: "MEDIUM", assigneeId: null }),
      ],
    });
    await tx.milestone.createMany({
      data: [
        { organizationId: o, projectId: p1.id, title: "Équipe opérationnelle", dueDate: d(`${y - 1}-05-01`), achievedAt: d(`${y - 1}-04-28`) },
        { organizationId: o, projectId: p1.id, title: "Rapport à mi-parcours", dueDate: d(`${y}-12-15`) },
        { organizationId: o, projectId: p1.id, title: "Clôture du projet", dueDate: d(`${y + 1}-06-30`) },
      ],
    });

    // Suivi-évaluation (fictif) : cadre logique, indicateurs et valeurs trimestrielles.
    const L = (data: Record<string, unknown>) => tx.logframeItem.create({ data: { organizationId: o, projectId: p1.id, ...data } as never });
    const imp = await L({ level: "IMPACT", code: "IMP", title: "La mortalité maternelle recule dans les zones d'intervention", position: 0 });
    const e1 = await L({ level: "OUTCOME", parentId: imp.id, code: "E1", title: "Les femmes enceintes accèdent régulièrement aux soins prénatals", position: 1, assumptions: "Les routes restent praticables pendant l'hivernage." });
    const e2 = await L({ level: "OUTCOME", parentId: imp.id, code: "E2", title: "Les accouchements sont assistés par du personnel qualifié", position: 2 });
    const x11 = await L({ level: "OUTPUT", parentId: e1.id, code: "X1.1", title: "Des cliniques mobiles desservent 40 villages enclavés", position: 1 });
    const x12 = await L({ level: "OUTPUT", parentId: e1.id, code: "X1.2", title: "60 relais communautaires sont formés et actifs", position: 2 });
    const x21 = await L({ level: "OUTPUT", parentId: e2.id, code: "X2.1", title: "Les maternités de référence sont équipées", position: 3 });
    await L({ level: "ACTIVITY", parentId: x11.id, code: "AC1", title: "Tournées mensuelles des équipes mobiles", position: 1 });
    await L({ level: "ACTIVITY", parentId: x12.id, code: "AC2", title: "Sessions de formation des relais", position: 2 });
    await L({ level: "ACTIVITY", parentId: x21.id, code: "AC3", title: "Achat et installation des kits d'accouchement", position: 3 });
    const quarters: [Date, Date][] = [];
    for (let k = 0; k < 12; k++) {
      const end = new Date(Date.UTC(y - 1, k * 3 + 3, 0));
      if (end >= now) break;
      quarters.push([new Date(Date.UTC(y - 1, k * 3, 1)), end]);
    }
    const I = (data: Record<string, unknown>) => tx.indicator.create({ data: { organizationId: o, projectId: p1.id, createdById: userId, responsibleId: userId, ...data } as never });
    const series = async (indicatorId: string, vals: number[], source: string, dis?: (v: number) => Record<string, Record<string, number>>, lastDraft = false) => {
      const list = quarters.slice(0, vals.length);
      await tx.indicatorValue.createMany({ data: list.map(([start, end], k) => {
        const last = lastDraft && k === list.length - 1;
        return {
          organizationId: o, indicatorId, periodStart: start, periodEnd: end, value: vals[k], source, collectedById: userId,
          disaggregation: dis ? dis(vals[k]) : undefined, status: last ? "DRAFT" as const : "VALIDATED" as const,
          validatedById: last ? null : userId, validatedAt: last ? null : new Date(end.getTime() + 15 * 86_400_000),
        };
      }) });
    };
    const i1 = await I({ logframeItemId: e1.id, code: "IND-1", name: "Femmes enceintes ayant réalisé au moins 4 consultations prénatales", definition: "Part des femmes ayant accouché sur la période qui ont réalisé au moins 4 consultations prénatales.", unit: "%", baseline: 32, baselineDate: d(`${y - 1}-02-01`), target: 80, targetDate: d(`${y + 1}-06-30`), frequency: "QUARTERLY", source: "Registres des postes de santé (fictifs)", method: "Comptage trimestriel des registres", disaggregations: [] });
    await series(i1.id, [38, 43, 48, 53, 57, 61, 64, 66], "Registres des postes de santé (fictifs)", undefined, true);
    const i2 = await I({ logframeItemId: x12.id, code: "IND-2", name: "Relais communautaires formés", definition: "Nombre de relais ayant suivi la totalité du module de formation.", unit: "personnes", aggregation: "SUM", baseline: 0, baselineDate: d(`${y - 1}-02-01`), target: 60, targetDate: d(`${y}-12-31`), frequency: "QUARTERLY", source: "Listes de présence (fictives)", disaggregations: ["Sexe : Femmes, Hommes"] });
    await series(i2.id, [10, 12, 9, 8, 7, 6, 4, 3], "Listes de présence (fictives)", (v) => ({ Sexe: { Femmes: Math.ceil(v * 0.6), Hommes: v - Math.ceil(v * 0.6) } }));
    const i3 = await I({ logframeItemId: e2.id, code: "IND-3", name: "Accouchements assistés par du personnel qualifié", definition: "Part des accouchements réalisés en présence d'une sage-femme ou d'un médecin.", unit: "%", baseline: 45, baselineDate: d(`${y - 1}-02-01`), target: 75, targetDate: d(`${y + 1}-06-30`), frequency: "QUARTERLY", source: "Rapports des maternités (fictifs)", disaggregations: [] });
    await series(i3.id, [46, 47, 47, 48, 49, 50, 50, 51], "Rapports des maternités (fictifs)");
    const i4 = await I({ logframeItemId: x11.id, code: "IND-4", name: "Villages desservis par les cliniques mobiles", definition: "Nombre de villages ayant reçu au moins une visite mensuelle sur le trimestre.", unit: "villages", baseline: 0, baselineDate: d(`${y - 1}-02-01`), target: 40, targetDate: d(`${y}-12-31`), frequency: "QUARTERLY", source: "Feuilles de route des équipes (fictives)", disaggregations: [] });
    await series(i4.id, [8, 15, 22, 28, 32, 35, 37, 39], "Feuilles de route des équipes (fictives)");
    await I({ logframeItemId: imp.id, code: "IND-5", name: "Ratio de mortalité maternelle", definition: "Décès maternels pour 100 000 naissances vivantes dans les districts d'intervention.", unit: "pour 100 000", direction: "DECREASE", baseline: 320, baselineDate: d(`${y - 1}-01-01`), target: 250, targetDate: d(`${y + 1}-12-31`), frequency: "ANNUAL", source: "Enquête annuelle du district (fictive)", disaggregations: [] }).then((i5) =>
      quarters.length >= 4 ? tx.indicatorValue.create({ data: { organizationId: o, indicatorId: i5.id, periodStart: d(`${y - 1}-01-01`), periodEnd: d(`${y - 1}-12-31`), value: 288, source: "Enquête annuelle du district (fictive)", collectedById: userId, status: "VALIDATED", validatedById: userId, validatedAt: d(`${y}-02-15`) } }) : null);
    await I({ logframeItemId: x21.id, code: "IND-6", name: "Maternités équipées en kits d'accouchement", definition: "Nombre de maternités de référence disposant du kit complet.", unit: "maternités", baseline: 0, baselineDate: d(`${y}-07-01`), target: 12, targetDate: d(`${y + 1}-06-30`), frequency: "SEMIANNUAL", source: "Inventaires (fictifs)", disaggregations: [] });

    // Finances (fictif) : financements, budget détaillé et dépenses de PRJ-001, en XOF.
    const daysAgo = (k: number) => new Date(now.getTime() - k * 86_400_000);
    const fd1 = await tx.funding.create({ data: { organizationId: o, projectId: p1.id, donor: "Fondation Sahel Santé (fictive)", reference: "CONV-2025-014", amount: 100_000_000, startDate: d(`${y - 1}-02-01`), endDate: d(`${y + 1}-06-30`) } });
    const fd2 = await tx.funding.create({ data: { organizationId: o, projectId: p1.id, donor: "Fonds propres (fictif)", amount: 30_000_000 } });
    const BL = (code: string, label: string, category: string, plannedAmount: number, fundingId: string) => tx.budgetLine.create({ data: { organizationId: o, projectId: p1.id, code, label, category, plannedAmount, fundingId } as never });
    const lines = [
      [await BL("B1", "Salaires de l'équipe mobile", "HR", 48_000_000, fd1.id), [12_000_000, 11_000_000, 11_000_000, 10_000_000]],
      [await BL("B2", "Carburant et déplacements", "TRAVEL", 22_000_000, fd1.id), [5_000_000, 4_500_000, 4_500_000]],
      [await BL("B3", "Équipement des cliniques mobiles", "EQUIPMENT", 40_000_000, fd1.id), [25_000_000, 6_000_000]],
      [await BL("B4", "Formation des relais communautaires", "ACTIVITIES", 18_000_000, fd2.id), [3_500_000, 2_500_000]],
      [await BL("B5", "Fournitures médicales", "SUPPLIES", 15_000_000, fd2.id), [4_000_000, 3_000_000]],
      [await BL("B6", "Coûts indirects", "INDIRECT", 7_000_000, fd1.id), [2_000_000, 2_000_000]],
    ] as const;
    let k = 0;
    await tx.expense.createMany({ data: lines.flatMap(([line, amounts]) => amounts.map((amount, i) => {
      const date = daysAgo(40 + (amounts.length - i) * 75 + (k++ % 3) * 9);
      return { organizationId: o, projectId: p1.id, budgetLineId: line.id, date, amount, description: `${line.label} — tranche ${i + 1} (fictif)`, reference: `PJ-${String(k).padStart(4, "0")}`, status: "VALIDATED" as const, createdById: userId, validatedById: userId, validatedAt: new Date(date.getTime() + 5 * 86_400_000) };
    })) });
    await tx.expense.createMany({ data: [
      { organizationId: o, projectId: p1.id, budgetLineId: lines[3][0].id, date: daysAgo(6), amount: 1_500_000, description: "Session de formation de Mbour (fictif)", supplier: "Centre de formation fictif", reference: "PJ-0099", createdById: userId },
      { organizationId: o, projectId: p1.id, budgetLineId: lines[4][0].id, date: daysAgo(3), amount: 800_000, description: "Kits de dépistage (fictif)", supplier: "Pharmacie fictive", reference: "PJ-0100", createdById: userId },
    ] });

    // Risques (fictif)
    const RK = (data: Record<string, unknown>) => ({ organizationId: o, projectId: p1.id, ownerId: userId, createdById: userId, ...data }) as never;
    await tx.risk.createMany({ data: [
      RK({ code: "R1", title: "Routes impraticables pendant l'hivernage", category: "OPERATIONAL", probability: 4, impact: 4, status: "MITIGATING", mitigation: "Calendrier de tournées adapté, véhicules 4×4, stocks avancés dans les postes de santé.", reviewDate: daysAgo(-20) }),
      RK({ code: "R2", title: "Retard de décaissement du bailleur", category: "FINANCIAL", probability: 3, impact: 5, status: "OPEN", mitigation: "Suivi mensuel de la trésorerie, avance sur fonds propres plafonnée.", contingency: "Report des achats non critiques.", reviewDate: daysAgo(12) }),
      RK({ code: "R3", title: "Rupture de stock de kits de dépistage", category: "OPERATIONAL", probability: 2, impact: 4, status: "OPEN", mitigation: "Deux fournisseurs référencés, stock de sécurité de 2 mois.", reviewDate: daysAgo(-45) }),
      RK({ code: "R4", title: "Départ de sages-femmes formées", category: "STRATEGIC", probability: 3, impact: 3, status: "OPEN", reviewDate: daysAgo(-60) }),
      RK({ code: "R5", title: "Insécurité sur un axe de tournée", category: "SECURITY", probability: 2, impact: 5, status: "CLOSED", mitigation: "Axe remplacé par un itinéraire alternatif." }),
    ] });

    // Analyse de données (fictif) : enquête ménages générée de façon déterministe.
    const survey = demoSurvey();
    await tx.dataset.create({ data: {
      organizationId: o, projectId: p1.id, name: "Enquête ménages — fictive", description: "Données d'enquête entièrement fictives, générées pour la démonstration.",
      fileName: "enquete_menages_fictive.csv", delimiter: ";", headers: survey.headers, rows: survey.rows, rowCount: survey.rows.length, columnCount: survey.headers.length, createdById: userId,
    } });

    await audit(tx, { organizationId: o, actorId: userId, action: "demo.create", entityType: "Organization", entityId: o, summary: "Création de l'espace de démonstration (données fictives)" });
    return { id: o };
  }, { timeout: 30_000, maxWait: 10_000 });
}

/** Vrai si l'utilisateur possède déjà une démo (pour l'affichage du bouton). */
export async function hasDemo(userId: string) {
  return (await db.organization.count({ where: { isDemo: true, createdById: userId } })) > 0;
}

/** Enquête fictive reproductible (générateur pseudo-aléatoire à graine fixe). */
export function demoSurvey(n = 240) {
  let seed = 20260101;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const headers = ["id", "region", "milieu", "age_mere", "distance_km", "nb_cpn", "accouchement_assiste", "satisfaction"];
  const rows: string[][] = [];
  for (let i = 1; i <= n; i++) {
    const region = pick(["Thiès", "Thiès", "Diourbel", "Fatick"]);
    const milieu = rnd() < 0.35 ? "Urbain" : "Rural";
    const age = 17 + Math.floor(rnd() * 25);
    const dist = Math.round((milieu === "Urbain" ? 1 + rnd() * 4 : 3 + rnd() * 14) * 10) / 10;
    const cpn = Math.max(0, Math.min(8, Math.round((region === "Thiès" ? 4.2 : 3.2) - dist * 0.12 + (rnd() - 0.5) * 3)));
    const assiste = rnd() < (dist < 5 ? 0.82 : 0.48) ? "Oui" : "Non";
    const sat = String(Math.max(1, Math.min(5, Math.round(2.8 + (assiste === "Oui" ? 0.8 : 0) + (rnd() - 0.5) * 2.5))));
    rows.push([String(i), region, milieu, rnd() < 0.03 ? "NA" : String(age), String(dist).replace(".", ","), String(cpn), assiste, rnd() < 0.05 ? "" : sat]);
  }
  return { headers, rows };
}
