import { NextResponse, type NextRequest } from "next/server";
import { getTenantContext } from "@/server/context";
import { getReport } from "@/server/services/studio";
import { AppError } from "@/server/errors";
import { can } from "@/server/permissions/check";
import { buildDocx, buildXlsx } from "@/lib/office";
import { reportBlocks, reportSheets } from "@/lib/report-render";
import { getMessages } from "@/i18n/server";

const TYPES = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

// GET /api/reports/{id}/{docx|xlsx} — export d'un rapport du Studio (mêmes données que l'aperçu).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; format: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const { id, format } = await params;
  if (format !== "docx" && format !== "xlsx") return NextResponse.json({ error: "Format inconnu." }, { status: 404 });
  if (!can(ctx, "reports:view")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  try {
    const [r, { m, locale }] = await Promise.all([getReport(ctx, id), getMessages()]);
    const blocks = reportBlocks(r, r.data, r.narrative, m, locale);
    const body = format === "docx" ? buildDocx(blocks) : buildXlsx(reportSheets(blocks, m.studio.title));
    const name = `${r.title}`.replace(/[^\p{L}\p{N} _-]+/gu, "").trim().slice(0, 80) || "rapport";
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": TYPES[format],
        "Content-Disposition": `attachment; filename="rapport.${format}"; filename*=UTF-8''${encodeURIComponent(`${name}.${format}`)}`,
        "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: 404 });
    throw e;
  }
}
