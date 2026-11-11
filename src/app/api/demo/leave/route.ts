import type { NextRequest } from "next/server";
import { destroySession } from "@/server/auth/session";
import { forbiddenResponse, sameOrigin, seeOther } from "@/server/http";

// POST /api/demo/leave — quitte la démo visiteur et ouvre la création d'un vrai compte.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbiddenResponse();
  await destroySession();
  return seeOther(req, "/signup?new=1");
}
