import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";

type Tx = Prisma.TransactionClient | typeof db;

export async function audit(
  tx: Tx,
  entry: {
    organizationId: string | null;
    actorId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    changes?: Prisma.InputJsonValue;
  },
) {
  await tx.auditLog.create({ data: { ...entry, entityId: entry.entityId ?? null } });
}

// Calcule les différences champ par champ entre deux états (pour l'historique).
export function diff(before: object, after: object): Prisma.InputJsonObject {
  const b = before as Record<string, unknown>;
  const out: Record<string, { from: Prisma.InputJsonValue | null; to: Prisma.InputJsonValue | null }> = {};
  for (const [key, value] of Object.entries(after)) {
    const x = normalize(b[key]);
    const y = normalize(value);
    if (JSON.stringify(x ?? null) !== JSON.stringify(y ?? null)) out[key] = { from: (x ?? null) as Prisma.InputJsonValue | null, to: (y ?? null) as Prisma.InputJsonValue | null };
  }
  return out;
}

function normalize(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (v && typeof v === "object" && "toFixed" in v) return Number(String(v)); // Prisma.Decimal
  return v;
}
