import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import {
  cancelExpense, createBudgetLine, createExpense, createFunding, deleteBudgetLine, deleteExpense, deleteFunding, financeOverview, getProjectFinance, reviewExpense, updateBudgetLine,
} from "@/server/services/finance";
import { createRisk, deleteRisk, listProjectRisks, risksOverview, updateRisk } from "@/server/services/risks";
import { createProjectDraft, saveProjectStep } from "@/server/services/projects";
import { memberWithRole, ownerWithOrg, resetDb } from "./helpers";

const code = (e: unknown) => (e instanceof AppError ? e.code : e && typeof e === "object" && "name" in e && e.name === "ZodError" ? "ZOD" : String(e));
const expectCode = (p: Promise<unknown>, c: string) => expect(p.then(() => "OK", code)).resolves.toBe(c);

beforeEach(resetDb);
afterAll(() => db.$disconnect());

async function setup() {
  const a = await ownerWithOrg("A");
  const p = await createProjectDraft(a.ctx, { name: "Projet", code: "P1" });
  const f = await createFunding(a.ctx, p.id, { donor: "Bailleur fictif", amount: "1 000 000" });
  const line = await createBudgetLine(a.ctx, p.id, { code: "L1", label: "Formations", category: "ACTIVITIES", plannedAmount: "600000", fundingId: f.id });
  return { a, p, f, line };
}

describe("finances", () => {
  it("budget, dépenses validées à quatre yeux, blocage du dépassement", async () => {
    const { a, p, line } = await setup();
    const fin = await memberWithRole(a.org.id, "FINANCE_MANAGER");
    const team = await memberWithRole(a.org.id, "TEAM_MEMBER");
    const e1 = await createExpense(team.ctx, p.id, { budgetLineId: line.id, date: "2026-03-01", amount: "400000", description: "Atelier" });
    await expectCode(reviewExpense(team.ctx, e1.id, true), "FORBIDDEN"); // pas de droit de validation
    await reviewExpense(fin.ctx, e1.id, true);
    const e2 = await createExpense(fin.ctx, p.id, { budgetLineId: line.id, date: "2026-03-02", amount: "250000", description: "Transport" });
    await expectCode(reviewExpense(fin.ctx, e2.id, true), "FORBIDDEN"); // l'auteur ne valide pas sa propre dépense
    await expectCode(reviewExpense(a.ctx, e2.id, true), "CONFLICT"); // dépasserait la ligne (400 000 + 250 000 > 600 000)
    await expectCode(updateBudgetLine(a.ctx, line.id, { code: "L1", label: "Formations", plannedAmount: "300000" }), "CONFLICT"); // < déjà dépensé
    await updateBudgetLine(a.ctx, line.id, { code: "L1", label: "Formations", plannedAmount: "700000" });
    await reviewExpense(a.ctx, e2.id, true);
    let d = await getProjectFinance(a.ctx, p.id);
    expect(d.totals).toMatchObject({ planned: 700000, spent: 650000, funded: 1000000, fundingGap: -300000, overspentLines: 0 });
    await expectCode(cancelExpense(fin.ctx, e2.id, ""), "VALIDATION");
    await cancelExpense(fin.ctx, e2.id, "Doublon de facture");
    d = await getProjectFinance(a.ctx, p.id);
    expect(d.totals.spent).toBe(400000);
    expect(d.expenses.find((e) => e.id === e2.id)!.status).toBe("CANCELED");
    await expectCode(deleteBudgetLine(a.ctx, line.id), "CONFLICT");
    expect(await db.auditLog.count({ where: { organizationId: a.org.id, entityType: "Expense" } })).toBeGreaterThanOrEqual(5);
  });

  it("brouillons : suppression par l'auteur, dates futures refusées, rattachements contrôlés", async () => {
    const { a, p, f, line } = await setup();
    const team = await memberWithRole(a.org.id, "TEAM_MEMBER");
    await expectCode(createExpense(team.ctx, p.id, { budgetLineId: line.id, date: "2099-01-01", amount: "10", description: "X" }), "VALIDATION");
    await expectCode(createExpense(team.ctx, p.id, { budgetLineId: line.id, date: "2026-01-01", amount: "0", description: "X" }), "ZOD");
    const e = await createExpense(team.ctx, p.id, { budgetLineId: line.id, date: "2026-01-01", amount: "10", description: "X" });
    const other = await memberWithRole(a.org.id, "TEAM_MEMBER");
    await expectCode(deleteExpense(other.ctx, e.id), "FORBIDDEN");
    await deleteExpense(team.ctx, e.id);
    await expectCode(deleteFunding(a.ctx, f.id), "CONFLICT");
    await expectCode(createBudgetLine(a.ctx, p.id, { code: "l1", label: "Doublon", plannedAmount: "1" }), "CONFLICT");
    // devise figée dès qu'un budget existe
    await expectCode(saveProjectStep(a.ctx, p.id, 7, { plannedBudget: "1000000", currency: "EUR" }), "CONFLICT");
  });

  it("isolation entre organisations et totaux par devise", async () => {
    const { a, p, line } = await setup();
    const b = await ownerWithOrg("B");
    await expectCode(getProjectFinance(b.ctx, p.id), "NOT_FOUND");
    await expectCode(createExpense(b.ctx, p.id, { budgetLineId: line.id, date: "2026-01-01", amount: "10", description: "X" }), "NOT_FOUND");
    const pb = await createProjectDraft(b.ctx, { name: "Projet B", code: "PB" });
    await expectCode(createBudgetLine(b.ctx, pb.id, { code: "L1", label: "X", plannedAmount: "5", fundingId: (await db.funding.findFirstOrThrow({ where: { projectId: p.id } })).id }), "VALIDATION");
    const o = await financeOverview(a.ctx);
    expect(o.byCurrency).toEqual([{ currency: "XOF", planned: 600000, spent: 0, pending: 0, funded: 1000000, projects: 1 }]);
    expect((await financeOverview(b.ctx)).rows).toHaveLength(0);
    const donor = await memberWithRole(a.org.id, "DONOR_VIEWER");
    expect((await getProjectFinance(donor.ctx, p.id)).lines).toHaveLength(1);
    await expectCode(createExpense(donor.ctx, p.id, { budgetLineId: line.id, date: "2026-01-01", amount: "10", description: "X" }), "FORBIDDEN");
  });
});

describe("risques", () => {
  it("registre, score, tri et permissions", async () => {
    const a = await ownerWithOrg("A");
    const p = await createProjectDraft(a.ctx, { name: "Projet", code: "P1" });
    await createRisk(a.ctx, p.id, { code: "R1", title: "Retard des fonds", category: "FINANCIAL", probability: "3", impact: "4" });
    const r2 = await createRisk(a.ctx, p.id, { code: "R2", title: "Insécurité", category: "SECURITY", probability: "5", impact: "5", reviewDate: "2020-01-01" });
    await expectCode(createRisk(a.ctx, p.id, { code: "r1", title: "Doublon", probability: "1", impact: "1" }), "CONFLICT");
    await expectCode(createRisk(a.ctx, p.id, { code: "R3", title: "Hors échelle", probability: "6", impact: "1" }), "ZOD");
    let list = await listProjectRisks(a.ctx, p.id);
    expect(list.map((r) => [r.code, r.score, r.level, r.overdue])).toEqual([["R2", 25, "critical", true], ["R1", 12, "high", false]]);
    await updateRisk(a.ctx, r2.id, { code: "R2", title: "Insécurité", category: "SECURITY", probability: "2", impact: "5", status: "CLOSED" });
    list = await listProjectRisks(a.ctx, p.id);
    expect(list.at(-1)!.code).toBe("R2");
    expect(list.at(-1)!.overdue).toBe(false);
    const donor = await memberWithRole(a.org.id, "DONOR_VIEWER");
    await expectCode(listProjectRisks(donor.ctx, p.id), "FORBIDDEN");
    const team = await memberWithRole(a.org.id, "TEAM_MEMBER");
    await expectCode(deleteRisk(team.ctx, r2.id), "FORBIDDEN");
    const b = await ownerWithOrg("B");
    expect(await risksOverview(b.ctx)).toHaveLength(0);
    await expectCode(updateRisk(b.ctx, r2.id, { code: "R2", title: "X", probability: "1", impact: "1" }), "NOT_FOUND");
  });
});
