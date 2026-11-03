import type { NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { forbiddenResponse, sameOrigin, seeOther } from "@/server/http";
import { safeNext } from "@/lib/safe-next";

// POST /api/locale — enregistre la langue choisie (cookie 1 an) et revient sur la page d'origine.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbiddenResponse();
  const fd = await req.formData();
  const locale = fd.get("locale");
  const back = safeNext(fd.get("next")) ?? "/";
  const res = seeOther(req, back);
  if (isLocale(locale)) res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: process.env.COOKIE_SECURE === "true" });
  return res;
}
