import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { exportOrganization, mySecurity, revokeOtherSessions, unlinkAccount, usage } from "@/server/services/administration";
import { signInWithOAuth } from "@/server/services/auth";
import { createProjectDraft } from "@/server/services/projects";
import { readZip } from "@/lib/zip";
import { toCsv } from "@/lib/csv-write";
import { memberWithRole, ownerWithOrg, resetDb } from "./helpers";

const code = (e: unknown) => (e instanceof AppError ? e.code : String(e));
const expectCode = (p: Promise<unknown>, c: string) => expect(p.then(() => "OK", code)).resolves.toBe(c);

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("administration", () => {
  it("utilisation, export complet protégé contre les formules, droits", async () => {
    const a = await ownerWithOrg("A");
    await createProjectDraft(a.ctx, { name: "=HYPERLINK(\"http://x\")", code: "P1" });
    const u = await usage(a.ctx);
    expect(u).toMatchObject({ members: 1, projects: 1, storage: 0, ai: 0 });
    const { zip, name } = await exportOrganization(a.ctx);
    expect(name).toMatch(/^baobab-export-/);
    const files = readZip(zip);
    expect([...files.keys()]).toEqual(expect.arrayContaining(["LISEZ-MOI.txt", "projets.csv", "depenses.csv", "journal_audit.csv", "membres.csv"]));
    expect(files.get("projets.csv")!.toString()).toContain("'=HYPERLINK");
    expect(await db.auditLog.count({ where: { organizationId: a.org.id, action: "administration.export" } })).toBe(1);
    const pm = await memberWithRole(a.org.id, "PROJECT_MANAGER");
    await expectCode(exportOrganization(pm.ctx), "FORBIDDEN");
    await expectCode(usage(pm.ctx), "FORBIDDEN");
    expect(toCsv(["a"], [["-2+3"], [-5], ["x;y"]])).toBe("﻿a\r\n'-2+3\r\n-5\r\n\"x;y\"\r\n");
  });

  it("sécurité du compte : autres appareils déconnectés, compte externe non détachable s'il est le seul accès", async () => {
    const { user } = await signInWithOAuth("google", { sub: "g-9", email: "seul@example.org", email_verified: true });
    for (const id of ["s1", "s2", "s3"]) await db.session.create({ data: { id, userId: user.id, expiresAt: new Date(Date.now() + 86_400_000) } });
    expect(await revokeOtherSessions(user.id, "s2")).toBe(2);
    expect((await mySecurity(user.id)).sessions.map((s) => s.id)).toEqual(["s2"]);
    const acc = (await mySecurity(user.id)).accounts[0];
    await expectCode(unlinkAccount(user.id, acc.id), "CONFLICT");
    await signInWithOAuth("microsoft", { sub: "m-9", email: "seul@example.org", email_verified: true });
    await unlinkAccount(user.id, acc.id);
    expect((await mySecurity(user.id)).accounts.map((x) => x.provider)).toEqual(["microsoft"]);
  });
});
