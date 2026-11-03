import "server-only";
import { cookies, headers } from "next/headers";
import { isLocale, LOCALE_COOKIE, LOCALES, negotiate, type LocaleCode } from "./config";
import { messagesFor } from "./translate";

/** Langue de la requête : cookie choisi par l'utilisateur, sinon préférences du navigateur, sinon français. */
export async function getLocale(): Promise<LocaleCode> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  return negotiate((await headers()).get("accept-language"));
}

export async function getMessages() {
  const locale = await getLocale();
  return { locale, m: messagesFor(locale), meta: LOCALES.find((l) => l.code === locale)! };
}
