import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { addProjectMember, createStakeholder, getProjectTeam, quadrant, removeProjectMember, updateProjectMember } from "@/server/services/team";
import { myActions } from "@/server/services/inbox";
import { createProjectDraft } from "@/server/services/projects";
import { createIndicator, addValue } from "@/server/services/meal";
import { memberWithRole, ownerWithOrg, resetDb } from "./helpers";

const code = (e: unknown) => (e instanceof AppError ? e.code : e && typeof e === "object" && "name" in e && e.name === "ZodError" ? "ZOD" : String(e));
const expectCode = (p: Promise<unknown>, c: string) => expect(p.then(() => "OK", code)).resolves.toBe(c);

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("équipe projet et parties prenantes", () => {
  it("affectations contrôlées, contacts masqués pour les lecteurs, isolation", async () => {
    const a = await ownerWithOrg("A");
    const p = await createProjectDraft(a.ctx, { name: "Projet", code: "P1" });
    const pm = await memberWithRole(a.org.id, "PROJECT_MANAGER");
    const donor = await memberWithRole(a.org.id, "DONOR_VIEWER");
    const b = await ownerWithOrg("B");
    const m1 = await addProjectMember(a.ctx, p.id, { userId: pm.user.id, role: "Coordinatrice", allocation: "50" });
    await expectCode(addProjectMember(a.ctx, p.id, { userId: pm.user.id, role: "Doublon" }), "CONFLICT");
    await expectCode(addProjectMember(a.ctx, p.id, { userId: b.user.id, role: "Externe" }), "VALIDATION");
    await expectCode(addProjectMember(a.ctx, p.id, { userId: donor.user.id, role: "X", allocation: "150" }), "ZOD");
    await updateProjectMember(a.ctx, m1.id, { role: "Coordinatrice terrain", allocation: "80" });
    await createStakeholder(a.ctx, p.id, { name: "Mairie fictive", type: "LOCAL_AUTHORITY", influence: "3", interest: "1", email: "contact@mairie.example", phone: "+221 00 000 00 00" });
    await expectCode(createStakeholder(a.ctx, p.id, { name: "X", influence: "4", interest: "1" }), "ZOD");
    const full = await getProjectTeam(a.ctx, p.id);
    expect(full.members[0]).toMatchObject({ role: "Coordinatrice terrain", allocation: 80 });
    expect(full.stakeholders[0]).toMatchObject({ quadrant: "satisfy", email: "contact@mairie.example" });
    const seen = await getProjectTeam(donor.ctx, p.id);
    expect(seen.stakeholders[0]).toMatchObject({ email: null, phone: null });
    await expectCode(createStakeholder(donor.ctx, p.id, { name: "X", influence: "1", interest: "1" }), "FORBIDDEN");
    await expectCode(getProjectTeam(b.ctx, p.id), "NOT_FOUND");
    await expectCode(removeProjectMember(b.ctx, m1.id), "NOT_FOUND");
    await removeProjectMember(a.ctx, m1.id);
    expect(quadrant(3, 3)).toBe("manage");
    expect(quadrant(1, 3)).toBe("inform");
    expect(quadrant(1, 1)).toBe("monitor");
  });
});

describe("mes actions", () => {
  it("propose de valider ce que d'autres ont saisi, jamais ses propres saisies", async () => {
    const a = await ownerWithOrg("A");
    const p = await createProjectDraft(a.ctx, { name: "Projet", code: "P1" });
    const meal = await memberWithRole(a.org.id, "MEAL_MANAGER");
    const team = await memberWithRole(a.org.id, "TEAM_MEMBER");
    const ind = await createIndicator(a.ctx, p.id, { code: "I1", name: "Indicateur", definition: "Déf", unit: "u", baseline: "0", target: "10", source: "S" });
    await addValue(team.ctx, ind.id, { periodStart: "2026-01-01", periodEnd: "2026-03-31", value: "3", source: "S" });
    await addValue(meal.ctx, ind.id, { periodStart: "2026-04-01", periodEnd: "2026-06-30", value: "4", source: "S" });
    const mine = (await myActions(meal.ctx)).filter((x) => x.kind === "meal-validate");
    expect(mine).toHaveLength(1); // seulement la valeur saisie par le membre d'équipe
    expect((await myActions(team.ctx)).filter((x) => x.kind === "meal-validate")).toHaveLength(0); // pas de droit de validation
    expect((await myActions(a.ctx)).filter((x) => x.kind === "meal-validate")).toHaveLength(2); // propriétaire
  });
});
