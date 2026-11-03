import { NextResponse, type NextRequest } from "next/server";

/**
 * Protection CSRF des endpoints POST appelés par formulaire natif :
 * l'en-tête Origin (ou Referer) doit correspondre à l'hôte de la requête.
 * (Les Server Actions de Next.js appliquent déjà ce contrôle nativement.)
 */
export function sameOrigin(req: NextRequest): boolean {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!host || !origin) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const forbiddenResponse = () => NextResponse.json({ error: "Origine de la requête refusée." }, { status: 403 });

/** Redirection 303 (POST → GET) vers un chemin interne. */
export const seeOther = (req: NextRequest, path: string) => NextResponse.redirect(new URL(path, req.url), 303);
