import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { createReport, deleteReport, finalizeReport, getReport, listReports, updateNarrative } from "@/server/services/studio";
import { createBudgetLine, createExpense, reviewExpense } from "@/server/services/finance";
import { createProjectDraft } from "@/server/services/projects";
import { reportBlocks, reportSheets } from "@/lib/report-render";
import { buildDocx, buildXlsx } from "@/lib/office";
import { extractText } from "@/lib/documents";
import fr from "@/i18n/messages/fr";
import { memberWithRole, ownerWithOrg, resetDb } from "./helpers";

const code = (e: unknown) => (e instanceof AppError ? e.code : e && typeof e === "object" && "name" in e && e.name === "ZodError" ? "ZOD" : String(e));
const expectCode = (p: Promise<unknown>, c: string) => expect(p.then(() => "OK", code)).resolves.toBe(c);

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("studio", () => {
  it("brouillon recalculé, validation qui fige les chiffres, exports", async () => {
    const a = await ownerWithOrg("A");
    const fin = await memberWithRole(a.org.id, "FINANCE_MANAGER");
    const p = await createProjectDraft(a.ctx, { name: "Projet", code: "P1" });
    const line = await createBudgetLine(a.ctx, p.id, { code: "B1", label: "Ateliers", plannedAmount: "1000000" });
    const e1 = await createExpense(fin.ctx, p.id, { budgetLineId: line.id, date: "2026-02-10", amount: "200000", description: "Atelier 1" });
    await reviewExpense(a.ctx, e1.id, true);
    const r = await createReport(a.ctx, { type: "PROJECT_FINANCIAL", projectId: p.id, title: "Rapport financier T1", startDate: "2026-01-01", endDate: "2026-03-31" });
    await updateNarrative(a.ctx, r.id, { summary: "Bonne exécution." });
    let rep = await getReport(a.ctx, r.id);
    expect((rep.data as Record<string, unknown>).finance).toMatchObject({ spent: 200000, periodSpent: 200000 });
    await finalizeReport(a.ctx, r.id);
    // nouvelle dépense après validation : le rapport validé ne bouge pas
    const e2 = await createExpense(fin.ctx, p.id, { budgetLineId: line.id, date: "2026-03-01", amount: "100000", description: "Atelier 2" });
    await reviewExpense(a.ctx, e2.id, true);
    rep = await getReport(a.ctx, r.id);
    expect(rep.status).toBe("FINAL");
    expect((rep.data as Record<string, unknown>).finance).toMatchObject({ spent: 200000, periodSpent: 200000 });
    await expectCode(updateNarrative(a.ctx, r.id, { summary: "X" }), "CONFLICT");
    await expectCode(finalizeReport(a.ctx, r.id), "CONFLICT");
    const blocks = reportBlocks(rep, rep.data, rep.narrative, fr, "fr");
    const docx = buildDocx(blocks);
    expect(extractText("r.docx", docx)).toContain("Rapport financier T1");
    expect(extractText("r.docx", docx)).toContain("Atelier 1");
    expect(extractText("r.docx", docx)).not.toContain("Atelier 2");
    expect(buildXlsx(reportSheets(blocks, "Studio")).length).toBeGreaterThan(500);
  });

  it("droits : bailleur ne voit que les rapports validés ; validation réservée ; isolation", async () => {
    const a = await ownerWithOrg("A");
    const p = await createProjectDraft(a.ctx, { name: "Projet", code: "P1" });
    const r1 = await createReport(a.ctx, { type: "PROJECT_PROGRESS", projectId: p.id, title: "Brouillon" });
    const r2 = await createReport(a.ctx, { type: "ORGANIZATION_SUMMARY", title: "Synthèse" });
    await expectCode(createReport(a.ctx, { type: "PROJECT_PROGRESS", title: "Sans projet" }), "VALIDATION");
    const pm = await memberWithRole(a.org.id, "PROJECT_MANAGER");
    await expectCode(finalizeReport(pm.ctx, r2.id), "FORBIDDEN");
    await finalizeReport(a.ctx, r2.id);
    const donor = await memberWithRole(a.org.id, "DONOR_VIEWER");
    expect((await listReports(donor.ctx)).map((r) => r.title)).toEqual(["Synthèse"]);
    await expectCode(getReport(donor.ctx, r1.id), "NOT_FOUND");
    expect(((await getReport(donor.ctx, r2.id)).data as Record<string, unknown>).org).toBeTruthy();
    const b = await ownerWithOrg("B");
    await expectCode(getReport(b.ctx, r1.id), "NOT_FOUND");
    await expectCode(deleteReport(pm.ctx, r2.id), "FORBIDDEN"); // validé : réservé à reports:delete
    await deleteReport(a.ctx, r1.id);
  });
});
