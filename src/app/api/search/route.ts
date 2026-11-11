import { NextResponse, type NextRequest } from "next/server";
import { getTenantContext } from "@/server/context";
import { globalSearch } from "@/server/services/search";

// GET /api/search?q=… — recherche globale de l'espace de travail (droits appliqués côté serveur).
export async function GET(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  return NextResponse.json({ hits: await globalSearch(ctx, q) }, { headers: { "Cache-Control": "private, no-store" } });
}
