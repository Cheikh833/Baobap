import type { NextRequest } from "next/server";
import { createSession, setActiveOrganization } from "@/server/auth/session";
import { forbiddenResponse, sameOrigin, seeOther } from "@/server/http";
import { isRateLimited, recordHit } from "@/server/rate-limit";
import { purgeExpiredGuests, startGuestDemo } from "@/server/services/guest-demo";

// POST /api/demo/visit — démo instantanée sans inscription (foires, salons) : espace fictif complet, propre au visiteur.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbiddenResponse();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `demo-visit:${ip}`;
  // Plafond par adresse (un stand partage souvent le même Wi-Fi : on reste large).
  if (isRateLimited(key, 40, 60 * 60_000)) return seeOther(req, "/demo?limit=1");
  recordHit(key);
  purgeExpiredGuests().catch((e) => console.error("Purge des démos visiteurs", e));
  const { user, org } = await startGuestDemo();
  await createSession(user.id, { guest: true });
  await setActiveOrganization(org.id);
  return seeOther(req, "/dashboard?welcome=demo");
}
