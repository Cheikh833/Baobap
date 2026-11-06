import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { addVersion, createArticle, deleteDocument, getDocument, getVersionFile, listArticles, listDocuments, updateArticle, uploadDocument } from "@/server/services/documents";
import { createZip } from "@/lib/zip";
import { memberWithRole, ownerWithOrg, resetDb } from "./helpers";

const code = (e: unknown) => (e instanceof AppError ? e.code : e && typeof e === "object" && "name" in e && e.name === "ZodError" ? "ZOD" : String(e));
const expectCode = (p: Promise<unknown>, c: string) => expect(p.then(() => "OK", code)).resolves.toBe(c);
const file = (name: string, data: string | Buffer) => { const b = typeof data === "string" ? Buffer.from(data) : data; return { name, size: b.length, buffer: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer }; };
const docx = (t: string) => createZip([{ name: "word/document.xml", data: `<w:document><w:body><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:body></w:document>` }]);

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("documents", () => {
  it("dépôt, recherche dans le contenu, versions, téléchargement intact", async () => {
    const a = await ownerWithOrg("A");
    const d = await uploadDocument(a.ctx, { title: "Convention de financement", category: "AGREEMENT", tags: "convention, bailleur" }, file("convention.docx", docx("Article 4 : décaissement trimestriel à Kaffrine")));
    expect((await listDocuments(a.ctx, { q: "décaissement kaffrine" }))[0]).toMatchObject({ id: d.id });
    expect((await listDocuments(a.ctx, { q: "décaissement kaffrine" }))[0].snippet).toContain("décaissement");
    expect(await listDocuments(a.ctx, { q: "inexistant" })).toHaveLength(0);
    await expectCode(addVersion(a.ctx, d.id, file("convention.docx", docx("Article 4 : décaissement trimestriel à Kaffrine"))), "CONFLICT"); // identique
    await addVersion(a.ctx, d.id, file("convention-v2.docx", docx("Avenant n°1")), "Avenant signé");
    const full = await getDocument(a.ctx, d.id);
    expect(full.versions.map((v) => v.version)).toEqual([2, 1]);
    const v1 = await getVersionFile(a.ctx, full.versions[1].id);
    expect(Buffer.from(v1.content).equals(docx("Article 4 : décaissement trimestriel à Kaffrine"))).toBe(true);
    expect(await db.auditLog.count({ where: { organizationId: a.org.id, entityType: "Document" } })).toBe(2);
  });

  it("refuse les fichiers dangereux ou déguisés ; isolation ; droits", async () => {
    const a = await ownerWithOrg("A");
    const b = await ownerWithOrg("B");
    await expectCode(uploadDocument(a.ctx, { title: "X" }, file("page.html", "<script>alert(1)</script>")), "VALIDATION");
    await expectCode(uploadDocument(a.ctx, { title: "X" }, file("faux.pdf", "MZ executable")), "VALIDATION");
    await expectCode(uploadDocument(a.ctx, { title: "X" }, null), "VALIDATION");
    await expectCode(uploadDocument(a.ctx, { title: "X" }, file("gros.txt", Buffer.alloc(4 * 1024 * 1024 + 1, 65))), "VALIDATION");
    const d = await uploadDocument(a.ctx, { title: "Note" }, file("note.txt", "Note interne"));
    const vid = (await getDocument(a.ctx, d.id)).versions[0].id;
    await expectCode(getVersionFile(b.ctx, vid), "NOT_FOUND");
    expect(await listDocuments(b.ctx)).toHaveLength(0);
    const donor = await memberWithRole(a.org.id, "DONOR_VIEWER");
    await expectCode(listDocuments(donor.ctx), "FORBIDDEN");
    const team = await memberWithRole(a.org.id, "TEAM_MEMBER");
    await expectCode(addVersion(team.ctx, d.id, file("note.txt", "Autre")), "FORBIDDEN"); // pas l'auteur
    await expectCode(deleteDocument(team.ctx, d.id), "FORBIDDEN");
    await deleteDocument(a.ctx, d.id);
    await expectCode(getVersionFile(a.ctx, vid), "NOT_FOUND");
  });

  it("fiches de connaissances : recherche, droits de l'auteur", async () => {
    const a = await ownerWithOrg("A");
    const team = await memberWithRole(a.org.id, "TEAM_MEMBER");
    const art = await createArticle(team.ctx, { title: "Leçon : tournées en hivernage", category: "LESSON", body: "Prévoir des véhicules 4x4 et des stocks avancés avant juillet.", tags: "logistique" });
    expect((await listArticles(a.ctx, "véhicules juillet"))[0].id).toBe(art.id);
    await updateArticle(team.ctx, art.id, { title: "Leçon : tournées en hivernage", category: "LESSON", body: "Mise à jour", tags: "" });
    const other = await memberWithRole(a.org.id, "TEAM_MEMBER");
    await expectCode(updateArticle(other.ctx, art.id, { title: "X", body: "Y" }), "FORBIDDEN");
  });
});
