import { NextResponse } from "next/server";
import { getTenantContext } from "@/server/context";
import { exportOrganization } from "@/server/services/administration";
import { AppError } from "@/server/errors";

// GET /api/administration/export — archive ZIP de toutes les données de l'organisation (administration:export).
export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  try {
    const { zip, name } = await exportOrganization(ctx);
    return new NextResponse(new Uint8Array(zip), {
      headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${name}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}
