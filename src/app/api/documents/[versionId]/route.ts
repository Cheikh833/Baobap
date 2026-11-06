import { NextResponse, type NextRequest } from "next/server";
import { getTenantContext } from "@/server/context";
import { getVersionFile } from "@/server/services/documents";
import { AppError } from "@/server/errors";

// GET /api/documents/{versionId} — téléchargement d'une version, après contrôle des droits.
// Toujours en pièce jointe, avec « nosniff » et un bac à sable CSP : un fichier ne peut jamais s'exécuter dans l'application.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ versionId: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  try {
    const v = await getVersionFile(ctx, (await params).versionId);
    const ascii = v.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
    return new NextResponse(new Uint8Array(v.content), {
      headers: {
        "Content-Type": v.mimeType,
        "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(v.fileName)}`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'",
        "Cache-Control": "private, no-store",
        ETag: `"${v.sha256}"`,
      },
    });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.code === "FORBIDDEN" ? 403 : 404 });
    throw e;
  }
}
