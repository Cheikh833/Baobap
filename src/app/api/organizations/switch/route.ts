import type { NextRequest } from "next/server";
import { getSessionUser, setActiveOrganization } from "@/server/auth/session";
import { loadTenantContext } from "@/server/tenant";
import { forbiddenResponse, sameOrigin, seeOther } from "@/server/http";

// POST /api/organizations/switch — change l'organisation active, uniquement vers une organisation dont l'utilisateur est membre actif.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbiddenResponse();
  const user = await getSessionUser();
  if (!user) return seeOther(req, "/login");
  const id = String((await req.formData()).get("organizationId") ?? "");
  if (await loadTenantContext(user.id, id)) await setActiveOrganization(id);
  return seeOther(req, "/dashboard");
}
