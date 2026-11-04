import { z } from "zod";
import { db } from "@/server/db";
import { AppError, forbidden, notFound } from "@/server/errors";
import { audit } from "@/server/audit";
import { assertCan, type TenantContext } from "@/server/permissions/check";
import { optId, optText, reqText } from "@/lib/validation/common";
import { CSV_LIMITS, CsvError, toDataset } from "@/lib/analysis/csv";
import { COL_TYPES, column, duplicateRows, inferType, profileColumn, type ColType } from "@/lib/analysis/stats";

const alive = { deletedAt: null };
export const datasetSchema = z.object({ name: reqText("Le nom", 160), description: optText(1000), projectId: optId });

/** Plans incluant l'analyse de données (l'essai gratuit donne accès au plan Professionnel). */
const ANALYTICS_PLANS = ["PROFESSIONNEL", "INSTITUTION", "ENTREPRISE"];

/** Décode un fichier texte : UTF-8, sinon Windows-1252 (exports Excel courants). */
export function decodeText(buf: ArrayBuffer) {
  const utf8 = new TextDecoder("utf-8").decode(buf);
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(buf) : utf8;
}

export async function listDatasets(ctx: TenantContext) {
  assertCan(ctx, "analytics:view");
  return db.dataset.findMany({
    where: { organizationId: ctx.organizationId, ...alive },
    select: { id: true, name: true, description: true, fileName: true, rowCount: true, columnCount: true, createdAt: true, project: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function importDataset(ctx: TenantContext, input: unknown, file: { name: string; size: number; buffer: ArrayBuffer } | null) {
  assertCan(ctx, "analytics:create");
  if (!ANALYTICS_PLANS.includes(ctx.plan)) throw forbidden("L'analyse de données est incluse à partir du plan Professionnel.");
  const data = datasetSchema.parse(input);
  if (!file || !file.size) throw new AppError("VALIDATION", "Choisissez un fichier CSV.");
  if (!/\.(csv|txt|tsv)$/i.test(file.name)) throw new AppError("VALIDATION", "Format non pris en charge : importez un fichier .csv (depuis Excel : « Enregistrer sous » → CSV).");
  if (file.size > CSV_LIMITS.bytes) throw new AppError("VALIDATION", "Fichier trop volumineux : 4 Mo maximum.");
  let parsed;
  try {
    parsed = toDataset(decodeText(file.buffer));
  } catch (e) {
    if (e instanceof CsvError) throw new AppError("VALIDATION", e.message);
    throw e;
  }
  if (data.projectId && !(await db.project.findFirst({ where: { id: data.projectId, organizationId: ctx.organizationId, ...alive } }))) throw new AppError("VALIDATION", "Projet introuvable.");
  return db.$transaction(async (tx) => {
    const ds = await tx.dataset.create({
      data: { ...data, organizationId: ctx.organizationId, fileName: file.name.slice(0, 200), delimiter: parsed.delimiter, headers: parsed.headers, rows: parsed.rows, rowCount: parsed.rows.length, columnCount: parsed.headers.length, createdById: ctx.userId },
    });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "analytics.import", entityType: "Dataset", entityId: ds.id, summary: `Import du jeu de données « ${ds.name} » (${ds.rowCount} lignes, ${ds.columnCount} colonnes)` });
    return ds;
  });
}

export async function getDataset(ctx: TenantContext, id: string) {
  assertCan(ctx, "analytics:view");
  const ds = await db.dataset.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive }, include: { project: { select: { id: true, code: true, name: true } } } });
  if (!ds) throw notFound("Jeu de données introuvable.");
  const rows = ds.rows as string[][];
  const overrides = (ds.columnTypes ?? {}) as Record<string, ColType>;
  const columns = ds.headers.map((name, i) => {
    const values = column(rows, i);
    const inferred = inferType(values);
    const type = overrides[name] ?? inferred;
    return { name, index: i, inferred, type, overridden: !!overrides[name], ...profileColumn(values, type) };
  });
  const cells = rows.length * ds.headers.length;
  const missingCells = columns.reduce((s, c) => s + c.missing, 0);
  return { ...ds, rows, columns, quality: { duplicates: duplicateRows(rows), missingCells, missingPct: cells ? (missingCells / cells) * 100 : 0, invalidCells: columns.reduce((s, c) => s + c.invalid, 0), emptyColumns: columns.filter((c) => c.inferred === "empty").length } };
}

export async function setColumnType(ctx: TenantContext, id: string, columnName: string, type: string) {
  assertCan(ctx, "analytics:create");
  const ds = await db.dataset.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
  if (!ds) throw notFound("Jeu de données introuvable.");
  if (!ds.headers.includes(columnName)) throw new AppError("VALIDATION", "Colonne inconnue.");
  const overrides = { ...((ds.columnTypes ?? {}) as Record<string, string>) };
  if (type === "auto") delete overrides[columnName];
  else if ((COL_TYPES as string[]).includes(type)) overrides[columnName] = type;
  else throw new AppError("VALIDATION", "Type de colonne invalide.");
  await db.$transaction(async (tx) => {
    await tx.dataset.update({ where: { id }, data: { columnTypes: overrides } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "analytics.columnType", entityType: "Dataset", entityId: id, summary: `Type de la colonne « ${columnName} » : ${type}` });
  });
}

export async function deleteDataset(ctx: TenantContext, id: string) {
  assertCan(ctx, "analytics:delete");
  const ds = await db.dataset.findFirst({ where: { id, organizationId: ctx.organizationId, ...alive } });
  if (!ds) throw notFound("Jeu de données introuvable.");
  await db.$transaction(async (tx) => {
    await tx.dataset.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "analytics.delete", entityType: "Dataset", entityId: id, summary: `Suppression du jeu de données « ${ds.name} »` });
  });
}
