import type { NextRequest } from "next/server";
import { destroySession } from "@/server/auth/session";
import { forbiddenResponse, sameOrigin, seeOther } from "@/server/http";

// POST /api/auth/logout — ferme la session courante (supprimée en base) puis renvoie vers /login.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbiddenResponse();
  await destroySession();
  return seeOther(req, "/login");
}
