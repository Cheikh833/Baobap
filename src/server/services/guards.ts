import type { Prisma } from "@prisma/client";
import { AppError } from "@/server/errors";

type Tx = Prisma.TransactionClient;

// Vérifie qu'une référence pointe bien vers une ressource de la MÊME organisation (isolation des tenants).
export async function assertMember(tx: Tx, organizationId: string, userId: string | undefined, label = "Le responsable") {
  if (!userId) return;
  const m = await tx.membership.findUnique({ where: { userId_organizationId: { userId, organizationId } } });
  if (!m || m.status !== "ACTIVE") throw new AppError("VALIDATION", `${label} doit être un membre actif de l'organisation.`);
}

export async function assertPortfolio(tx: Tx, organizationId: string, id: string | undefined) {
  if (!id) return null;
  const p = await tx.portfolio.findFirst({ where: { id, organizationId, deletedAt: null } });
  if (!p) throw new AppError("VALIDATION", "Portefeuille introuvable dans cette organisation.");
  return p;
}

export async function assertProgram(tx: Tx, organizationId: string, id: string | undefined) {
  if (!id) return null;
  const p = await tx.program.findFirst({ where: { id, organizationId, deletedAt: null } });
  if (!p) throw new AppError("VALIDATION", "Programme introuvable dans cette organisation.");
  return p;
}

export function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
}
