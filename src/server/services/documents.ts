import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, forbidden, notFound } from "@/server/errors";
import { audit, diff } from "@/server/audit";
import { assertCan, can, type TenantContext } from "@/server/permissions/check";
import { documentSchema, knowledgeSchema } from "@/lib/validation/schemas";
import { detectType, extractText, MAX_FILE_BYTES, snippet } from "@/lib/documents";
import { getPlan } from "@/lib/plans";

type Tx = Prisma.TransactionClient;
type Upload = { name: string; size: number; buffer: ArrayBuffer } | null;
const alive = { deletedAt: null };
const versionMeta = { id: true, version: true, fileName: true, mimeType: true, size: true, sha256: true, comment: true, createdById: true, createdAt: true } as const;
const log = (tx: Tx, ctx: TenantContext, action: string, entityType: string, entityId: string, summary: string, changes?: Prisma.InputJsonValue) =>
  audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action, entityType, entityId, summary, changes });

/** Termes de recherche : mots d'au moins 2 caractères, 8 au maximum. */
export const terms = (q?: string | null) => (q ?? "").trim().split(/\s+/).filter((t) => t.length >= 2).slice(0, 8);

async function checkProject(tx: Tx | typeof db, ctx: TenantContext, projectId?: string) {
  if (projectId && !(await tx.project.findFirst({ where: { id: projectId, organizationId: ctx.organizationId, deletedAt: null } }))) throw new AppError("VALIDATION", "Projet introuvable.");
}

/** Espace utilisé par les fichiers de l'organisation (toutes versions). */
export async function storageUsed(organizationId: string) {
  return (await db.documentVersion.aggregate({ where: { organizationId }, _sum: { size: true } }))._sum.size ?? 0;
}

async function prepareFile(ctx: TenantContext, file: Upload) {
  if (!file || !file.size) throw new AppError("VALIDATION", "Choisissez un fichier.");
  if (file.size > MAX_FILE_BYTES) throw new AppError("VALIDATION", "Fichier trop volumineux : 4 Mo maximum.");
  const data = Buffer.from(file.buffer);
  const mime = detectType(file.name, data);
  if (!mime) throw new AppError("VALIDATION", "Type de fichier non accepté (PDF, Word, Excel, PowerPoint, OpenDocument, CSV, texte, PNG, JPEG, WebP), ou contenu qui ne correspond pas à l'extension.");
  const limit = getPlan(ctx.plan).limits.storageGb;
  if (limit !== null && (await storageUsed(ctx.organizationId)) + data.length > limit * 1024 ** 3) throw new AppError("CONFLICT", `Espace de stockage du plan atteint (${limit} Go). Supprimez des fichiers ou changez de plan.`);
  return { data, mime, name: file.name.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 200), sha256: createHash("sha256").update(data).digest("hex"), text: extractText(file.name, data) };
}

export async function listDocuments(ctx: TenantContext, opts: { q?: string; projectId?: string; category?: string } = {}) {
  assertCan(ctx, "documents:view");
  const words = terms(opts.q);
  const where: Prisma.DocumentWhereInput = {
    organizationId: ctx.organizationId, ...alive,
    ...(opts.projectId ? { projectId: opts.projectId } : {}),
    ...(opts.category ? { category: opts.category as never } : {}),
    AND: words.map((w) => ({ OR: [
      { title: { contains: w, mode: "insensitive" } }, { description: { contains: w, mode: "insensitive" } }, { tags: { has: w } },
      { versions: { some: { text: { contains: w, mode: "insensitive" } } } },
    ] })),
  };
  const docs = await db.document.findMany({
    where, orderBy: { updatedAt: "desc" }, take: 200,
    include: { project: { select: { id: true, code: true } }, versions: { select: { ...versionMeta, text: !!words.length }, orderBy: { version: "desc" }, take: 1 } },
  });
  return docs.map(({ versions, ...d }) => {
    const v = versions[0] as (typeof versions)[number] & { text?: string | null };
    return { ...d, current: v ? { ...v, text: undefined } : null, snippet: words.length ? snippet(v?.text ?? null, words) : null };
  });
}

export async function getDocument(ctx: TenantContext, id: string) {
  assertCan(ctx, "documents:view");
  const d = await db.document.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive }, include: { project: { select: { id: true, code: true, name: true } }, versions: { select: versionMeta, orderBy: { version: "desc" } } } });
  if (!d) throw notFound("Document introuvable.");
  return d;
}

export async function uploadDocument(ctx: TenantContext, input: unknown, file: Upload) {
  assertCan(ctx, "documents:create");
  const data = documentSchema.parse(input);
  const f = await prepareFile(ctx, file);
  return db.$transaction(async (tx) => {
    await checkProject(tx, ctx, data.projectId);
    const doc = await tx.document.create({ data: { ...data, organizationId: ctx.organizationId, createdById: ctx.userId } });
    await tx.documentVersion.create({ data: { organizationId: ctx.organizationId, documentId: doc.id, version: 1, fileName: f.name, mimeType: f.mime, size: f.data.length, sha256: f.sha256, content: f.data, text: f.text, createdById: ctx.userId } });
    await log(tx, ctx, "document.create", "Document", doc.id, `Document « ${doc.title} » déposé (${f.name})`);
    return doc;
  }, { timeout: 30_000 });
}

/** Nouvelle version : l'auteur du document ou documents:edit. Les versions précédentes restent téléchargeables. */
export async function addVersion(ctx: TenantContext, documentId: string, file: Upload, comment?: string) {
  const doc = await db.document.findFirst({ where: { id: documentId, organizationId: ctx.organizationId, ...alive } });
  if (!doc) throw notFound("Document introuvable.");
  if (!(can(ctx, "documents:edit") || (doc.createdById === ctx.userId && can(ctx, "documents:create")))) throw forbidden();
  const f = await prepareFile(ctx, file);
  return db.$transaction(async (tx) => {
    const last = await tx.documentVersion.findFirst({ where: { documentId }, orderBy: { version: "desc" }, select: { version: true, sha256: true } });
    if (last?.sha256 === f.sha256) throw new AppError("CONFLICT", "Ce fichier est identique à la version actuelle.");
    const v = await tx.documentVersion.create({ data: { organizationId: ctx.organizationId, documentId, version: (last?.version ?? 0) + 1, fileName: f.name, mimeType: f.mime, size: f.data.length, sha256: f.sha256, content: f.data, text: f.text, comment: comment?.slice(0, 500) || null, createdById: ctx.userId } });
    await tx.document.update({ where: { id: documentId }, data: { updatedAt: new Date() } });
    await log(tx, ctx, "document.version", "Document", documentId, `Nouvelle version ${v.version} de « ${doc.title} »`);
    return v;
  }, { timeout: 30_000 });
}

export async function updateDocument(ctx: TenantContext, id: string, input: unknown) {
  const before = await db.document.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
  if (!before) throw notFound("Document introuvable.");
  if (!(can(ctx, "documents:edit") || (before.createdById === ctx.userId && can(ctx, "documents:create")))) throw forbidden();
  const data = documentSchema.parse(input);
  await db.$transaction(async (tx) => {
    await checkProject(tx, ctx, data.projectId);
    const full = { description: null, projectId: null, ...data };
    await tx.document.update({ where: { id }, data: full });
    await log(tx, ctx, "document.update", "Document", id, `Document « ${data.title} » modifié`, diff(before, full));
  });
}

export async function deleteDocument(ctx: TenantContext, id: string) {
  assertCan(ctx, "documents:delete");
  await db.$transaction(async (tx) => {
    const d = await tx.document.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!d) throw notFound("Document introuvable.");
    await tx.document.update({ where: { id }, data: { deletedAt: new Date() } });
    await log(tx, ctx, "document.delete", "Document", id, `Document « ${d.title} » supprimé`);
  });
}

/** Fichier d'une version, après contrôle des droits et de l'organisation. */
export async function getVersionFile(ctx: TenantContext, versionId: string) {
  assertCan(ctx, "documents:view");
  const v = await db.documentVersion.findFirst({ where: { id: versionId, organizationId: ctx.organizationId, document: { deletedAt: null } }, select: { fileName: true, mimeType: true, content: true, sha256: true } });
  if (!v) throw notFound("Document introuvable.");
  return v;
}

// ───────────── Fiches de connaissances ─────────────

export async function listArticles(ctx: TenantContext, q?: string) {
  assertCan(ctx, "documents:view");
  const words = terms(q);
  const rows = await db.knowledgeArticle.findMany({
    where: { organizationId: ctx.organizationId, ...alive, AND: words.map((w) => ({ OR: [{ title: { contains: w, mode: "insensitive" } }, { body: { contains: w, mode: "insensitive" } }, { tags: { has: w } }] })) },
    include: { project: { select: { id: true, code: true } } }, orderBy: { updatedAt: "desc" }, take: 200,
  });
  return rows.map((r) => ({ ...r, snippet: words.length ? snippet(r.body, words) : r.body.slice(0, 200) + (r.body.length > 200 ? "…" : "") }));
}

export async function getArticle(ctx: TenantContext, id: string) {
  assertCan(ctx, "documents:view");
  const a = await db.knowledgeArticle.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive }, include: { project: { select: { id: true, code: true, name: true } } } });
  if (!a) throw notFound("Fiche introuvable.");
  return a;
}

export async function createArticle(ctx: TenantContext, input: unknown) {
  assertCan(ctx, "documents:create");
  const data = knowledgeSchema.parse(input);
  return db.$transaction(async (tx) => {
    await checkProject(tx, ctx, data.projectId);
    const a = await tx.knowledgeArticle.create({ data: { ...data, organizationId: ctx.organizationId, authorId: ctx.userId } });
    await log(tx, ctx, "knowledge.create", "KnowledgeArticle", a.id, `Fiche « ${a.title} » publiée`);
    return a;
  });
}

export async function updateArticle(ctx: TenantContext, id: string, input: unknown) {
  const before = await db.knowledgeArticle.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
  if (!before) throw notFound("Fiche introuvable.");
  if (!(can(ctx, "documents:edit") || (before.authorId === ctx.userId && can(ctx, "documents:create")))) throw forbidden();
  const data = knowledgeSchema.parse(input);
  await db.$transaction(async (tx) => {
    await checkProject(tx, ctx, data.projectId);
    const full = { projectId: null, ...data };
    await tx.knowledgeArticle.update({ where: { id }, data: full });
    await log(tx, ctx, "knowledge.update", "KnowledgeArticle", id, `Fiche « ${data.title} » modifiée`, diff(before, full));
  });
}

export async function deleteArticle(ctx: TenantContext, id: string) {
  assertCan(ctx, "documents:delete");
  await db.$transaction(async (tx) => {
    const a = await tx.knowledgeArticle.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
    if (!a) throw notFound("Fiche introuvable.");
    await tx.knowledgeArticle.update({ where: { id }, data: { deletedAt: new Date() } });
    await log(tx, ctx, "knowledge.delete", "KnowledgeArticle", id, `Fiche « ${a.title} » supprimée`);
  });
}
