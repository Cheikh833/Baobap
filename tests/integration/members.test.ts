import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { acceptInvitation, changeMemberRole, inviteMember, setMemberStatus } from "@/server/services/members";
import { createRole, deleteRole, updateRole } from "@/server/services/roles";
import { createUnit, updateUnit } from "@/server/services/units";
import { authenticate, registerUser } from "@/server/services/auth";
import { loadTenantContext } from "@/server/tenant";
import { memberWithRole, ownerWithOrg, resetDb } from "./helpers";

const code = (e: unknown) => (e instanceof AppError ? e.code : String(e));
const expectCode = (p: Promise<unknown>, c: string) => expect(p.then(() => "OK", code)).resolves.toBe(c);
const roleId = (orgId: string, key: string) => db.role.findUniqueOrThrow({ where: { organizationId_key: { organizationId: orgId, key } } }).then((r) => r.id);

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("authentification", () => {
  it("refuse un mauvais mot de passe et un email déjà utilisé", async () => {
    await registerUser({ name: "A", email: "a@test.sn", password: "motdepasse123" });
    await expectCode(registerUser({ name: "A", email: "A@test.sn", password: "motdepasse123" }), "CONFLICT");
    await expectCode(authenticate({ email: "a@test.sn", password: "faux-mdp-123" }, "t1"), "UNAUTHENTICATED");
    expect((await authenticate({ email: "a@test.sn", password: "motdepasse123" }, "t1")).email).toBe("a@test.sn");
  });
  it("limite les tentatives de connexion", async () => {
    await registerUser({ name: "B", email: "b@test.sn", password: "motdepasse123" });
    for (let i = 0; i < 8; i++) await authenticate({ email: "b@test.sn", password: "x" }, "rl").catch(() => {});
    await expectCode(authenticate({ email: "b@test.sn", password: "motdepasse123" }, "rl"), "RATE_LIMITED");
  });
  it("ne stocke jamais le mot de passe en clair", async () => {
    const u = await registerUser({ name: "C", email: "c@test.sn", password: "motdepasse123" });
    expect(u.passwordHash).not.toContain("motdepasse123");
  });
});

describe("invitations", () => {
  it("une invitation n'est utilisable que par l'email invité, une seule fois", async () => {
    const a = await ownerWithOrg("A");
    const { token } = await inviteMember(a.ctx, { email: "invite@test.sn", roleId: await roleId(a.org.id, "TEAM_MEMBER") });
    const intrus = await registerUser({ name: "I", email: "intrus@test.sn", password: "motdepasse123" });
    await expectCode(acceptInvitation(intrus, token), "FORBIDDEN");
    const invite = await registerUser({ name: "Inv", email: "invite@test.sn", password: "motdepasse123" });
    expect(await acceptInvitation(invite, token)).toBe(a.org.id);
    expect((await loadTenantContext(invite.id, a.org.id))?.roleKey).toBe("TEAM_MEMBER");
    await expectCode(acceptInvitation(invite, token), "NOT_FOUND");
    const inv = await db.invitation.findFirstOrThrow({ where: { email: "invite@test.sn" } });
    expect(inv.tokenHash).not.toBe(token);
  });
  it("un administrateur ne peut pas inviter un propriétaire", async () => {
    const a = await ownerWithOrg("A");
    const admin = await memberWithRole(a.org.id, "ORG_ADMIN");
    await expectCode(inviteMember(admin.ctx, { email: "x@test.sn", roleId: await roleId(a.org.id, "ORG_OWNER") }), "FORBIDDEN");
  });
  it("une invitation expirée est refusée", async () => {
    const a = await ownerWithOrg("A");
    const { token } = await inviteMember(a.ctx, { email: "late@test.sn", roleId: await roleId(a.org.id, "VIEWER") });
    await db.invitation.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const u = await registerUser({ name: "L", email: "late@test.sn", password: "motdepasse123" });
    await expectCode(acceptInvitation(u, token), "NOT_FOUND");
  });
});

describe("protection des propriétaires et rôles", () => {
  it("l'organisation conserve toujours un propriétaire actif", async () => {
    const a = await ownerWithOrg("A");
    await expectCode(changeMemberRole(a.ctx, a.ctx.membershipId, await roleId(a.org.id, "VIEWER")), "CONFLICT");
    await expectCode(setMemberStatus(a.ctx, a.ctx.membershipId, "SUSPENDED"), "CONFLICT");
  });
  it("un administrateur ne peut pas rétrograder un propriétaire", async () => {
    const a = await ownerWithOrg("A");
    const admin = await memberWithRole(a.org.id, "ORG_ADMIN");
    await expectCode(changeMemberRole(admin.ctx, a.ctx.membershipId, await roleId(a.org.id, "VIEWER")), "FORBIDDEN");
  });
  it("rôles personnalisés : permissions validées, rôle propriétaire intouchable, rôle utilisé non supprimable", async () => {
    const a = await ownerWithOrg("A");
    await expectCode(createRole(a.ctx, { name: "Bad", permissions: ["project:hack"] }), "VALIDATION");
    const r = await createRole(a.ctx, { name: "Analyste", permissions: ["project:view", "portfolio:view"] });
    await expectCode(updateRole(a.ctx, await roleId(a.org.id, "ORG_OWNER"), { name: "X", permissions: [] }), "CONFLICT");
    const m = await memberWithRole(a.org.id, "VIEWER");
    await changeMemberRole(a.ctx, m.ctx.membershipId, r.id);
    await expectCode(deleteRole(a.ctx, r.id), "CONFLICT");
    await expectCode(deleteRole(a.ctx, await roleId(a.org.id, "VIEWER")), "CONFLICT");
  });
  it("les modifications sensibles sont auditées", async () => {
    const a = await ownerWithOrg("A");
    const m = await memberWithRole(a.org.id, "VIEWER");
    await changeMemberRole(a.ctx, m.ctx.membershipId, await roleId(a.org.id, "PROJECT_MANAGER"));
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "member.role_change" } });
    expect(log.organizationId).toBe(a.org.id);
    expect(log.actorId).toBe(a.user.id);
  });
});

describe("structures internes", () => {
  it("refuse les cycles dans l'arbre", async () => {
    const a = await ownerWithOrg("A");
    const dir = await createUnit(a.ctx, { name: "Direction", type: "DIRECTORATE" });
    const dep = await createUnit(a.ctx, { name: "Département", type: "DEPARTMENT", parentId: dir.id });
    await expectCode(updateUnit(a.ctx, dir.id, { name: "Direction", type: "DIRECTORATE", parentId: dep.id }), "VALIDATION");
  });
});

describe("authentification — email inconnu", () => {
  it("renvoie la même erreur qu'un mauvais mot de passe", async () => {
    await expectCode(authenticate({ email: "inconnu@test.sn", password: "motdepasse123" }, "t9"), "UNAUTHENTICATED");
  });
});

describe("limitation des tentatives", () => {
  it("les connexions réussies ne consomment pas le quota", async () => {
    await registerUser({ name: "D", email: "d@test.sn", password: "motdepasse123" });
    for (let i = 0; i < 12; i++) await authenticate({ email: "d@test.sn", password: "motdepasse123" }, "ok-client");
    expect((await authenticate({ email: "d@test.sn", password: "motdepasse123" }, "ok-client")).email).toBe("d@test.sn");
  });
});
