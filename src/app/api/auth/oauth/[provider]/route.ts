import type { NextRequest } from "next/server";
import { startOAuth } from "@/server/auth/oauth-flow";

// GET /api/auth/oauth/{google|apple}?next=/chemin — démarre la connexion via le fournisseur.
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  return startOAuth(req, (await params).provider);
}
