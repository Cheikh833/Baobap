import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { isGuestEmail, purgeExpiredGuests, startGuestDemo } from "@/server/services/guest-demo";
import { ownerWithOrg, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("démo visiteur (foire)", () => {
  it("crée un espace complet par visiteur, puis le supprime entièrement après 24 h", async () => {
    const real = await ownerWithOrg("A");
    const g1 = await startGuestDemo();
    const g2 = await startGuestDemo();
    expect(isGuestEmail(g1.user.email)).toBe(true);
    expect(g1.org.id).not.toBe(g2.org.id);
    expect(await db.project.count({ where: { organizationId: g1.org.id } })).toBe(5);
    expect(await db.documentVersion.count({ where: { organizationId: g1.org.id } })).toBeGreaterThan(0);
    // rien n'est purgé avant 24 h
    expect(await purgeExpiredGuests()).toBe(0);
    const later = new Date(Date.now() + 25 * 3_600_000);
    expect(await purgeExpiredGuests(later)).toBe(2);
    for (const g of [g1, g2]) {
      expect(await db.organization.count({ where: { id: g.org.id } })).toBe(0);
      expect(await db.user.count({ where: { id: g.user.id } })).toBe(0);
      for (const m of ["project", "indicatorValue", "expense", "auditLog", "document", "report", "role", "membership"] as const) {
        expect(await (db[m] as unknown as { count: (a: unknown) => Promise<number> }).count({ where: { organizationId: g.org.id } })).toBe(0);
      }
    }
    // la vraie organisation est intacte
    expect(await db.organization.count({ where: { id: real.org.id } })).toBe(1);
    expect(await db.user.count({ where: { id: real.user.id } })).toBe(1);
  });
});
