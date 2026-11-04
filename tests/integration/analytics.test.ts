import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { deleteDataset, getDataset, importDataset, listDatasets, setColumnType } from "@/server/services/analytics";
import { memberWithRole, ownerWithOrg, resetDb } from "./helpers";

const code = (e: unknown) => (e instanceof AppError ? e.code : e && typeof e === "object" && "name" in e && e.name === "ZodError" ? "ZOD" : String(e));
const expectCode = (p: Promise<unknown>, c: string) => expect(p.then(() => "OK", code)).resolves.toBe(c);
const file = (text: string | Uint8Array, name = "enquete.csv") => {
  const bytes = typeof text === "string" ? new TextEncoder().encode(text) : text;
  return { name, size: bytes.byteLength, buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer };
};

beforeEach(resetDb);
afterAll(() => db.$disconnect());

const CSV = "id;sexe;age;revenu\n1;F;34;12 500\n2;H;NA;9 000\n3;F;29;\n3;F;29;\n";

describe("analyse de données", () => {
  it("importe un CSV, infère les types et mesure la qualité sans modifier les cellules", async () => {
    const a = await ownerWithOrg("A");
    const ds = await importDataset(a.ctx, { name: "Enquête" }, file(CSV));
    const d = await getDataset(a.ctx, ds.id);
    expect(d.rowCount).toBe(4);
    expect(d.rows[0]).toEqual(["1", "F", "34", "12 500"]);
    expect(Object.fromEntries(d.columns.map((c) => [c.name, c.type]))).toEqual({ id: "number", sexe: "categorical", age: "number", revenu: "number" });
    expect(d.quality.duplicates).toBe(1);
    expect(d.quality.missingCells).toBe(3); // « NA » + 2 revenus vides
    await setColumnType(a.ctx, ds.id, "id", "text");
    expect((await getDataset(a.ctx, ds.id)).columns[0]).toMatchObject({ type: "text", inferred: "number", overridden: true });
    await expectCode(setColumnType(a.ctx, ds.id, "inconnue", "text"), "VALIDATION");
    const audit = await db.auditLog.count({ where: { organizationId: a.org.id, entityType: "Dataset" } });
    expect(audit).toBe(2);
  });

  it("lit les exports Excel en Windows-1252 et refuse les fichiers invalides", async () => {
    const a = await ownerWithOrg("A");
    const latin1 = new Uint8Array([...new TextEncoder().encode("région\n"), 0x54, 0x68, 0x69, 0xe8, 0x73, 0x0a]); // « Thiès » en Windows-1252
    const ds = await importDataset(a.ctx, { name: "Régions" }, file(latin1));
    const d = await getDataset(a.ctx, ds.id);
    expect(d.rows[0][0]).toBe("Thiès");
    await expectCode(importDataset(a.ctx, { name: "X" }, file("a,b\n1,2", "data.xlsx")), "VALIDATION");
    await expectCode(importDataset(a.ctx, { name: "X" }, file("a,b\n1,2,3\n")), "VALIDATION");
    await expectCode(importDataset(a.ctx, { name: "X" }, null), "VALIDATION");
    await expectCode(importDataset(a.ctx, { name: "" }, file(CSV)), "ZOD");
  });

  it("isolation entre organisations, permissions et plan", async () => {
    const a = await ownerWithOrg("A");
    const b = await ownerWithOrg("B");
    const ds = await importDataset(a.ctx, { name: "Enquête" }, file(CSV));
    await expectCode(getDataset(b.ctx, ds.id), "NOT_FOUND");
    await expectCode(deleteDataset(b.ctx, ds.id), "NOT_FOUND");
    expect(await listDatasets(b.ctx)).toHaveLength(0);
    const donor = await memberWithRole(a.org.id, "DONOR_VIEWER");
    await expectCode(listDatasets(donor.ctx), "FORBIDDEN");
    const viewer = await memberWithRole(a.org.id, "VIEWER");
    expect(await listDatasets(viewer.ctx)).toHaveLength(1);
    await expectCode(importDataset(viewer.ctx, { name: "X" }, file(CSV)), "FORBIDDEN");
    await expectCode(importDataset({ ...a.ctx, plan: "ESSENTIEL" }, { name: "X" }, file(CSV)), "FORBIDDEN");
    await deleteDataset(a.ctx, ds.id);
    expect(await listDatasets(a.ctx)).toHaveLength(0);
  });
});
