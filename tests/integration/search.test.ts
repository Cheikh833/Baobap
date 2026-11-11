import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { globalSearch } from "@/server/services/search";
import { createProjectDraft } from "@/server/services/projects";
import { createRisk } from "@/server/services/risks";
import { memberWithRole, ownerWithOrg, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("recherche globale", () => {
  it("trouve projets et risques, en respectant droits et organisation", async () => {
    const a = await ownerWithOrg("A");
    const p = await createProjectDraft(a.ctx, { name: "Cliniques mobiles Kaffrine", code: "P1" });
    await createRisk(a.ctx, p.id, { code: "R1", title: "Inondations à Kaffrine", probability: "3", impact: "3" });
    const hits = await globalSearch(a.ctx, "kaffrine");
    expect(hits.map((h) => h.group).sort()).toEqual(["projects", "risks"]);
    expect(hits.find((h) => h.group === "projects")!.href).toBe(`/projects/${p.id}`);
    const donor = await memberWithRole(a.org.id, "DONOR_VIEWER");
    expect((await globalSearch(donor.ctx, "kaffrine")).map((h) => h.group)).toEqual(["projects"]); // pas d'accès aux risques
    const b = await ownerWithOrg("B");
    expect(await globalSearch(b.ctx, "kaffrine")).toEqual([]);
    expect(await globalSearch(a.ctx, "k")).toEqual([]);
  });
});
