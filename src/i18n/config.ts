// Langues de l'interface BAOBAB.
// - "complete" : interface traduite et relue.
// - "beta" : traduction partielle, À FAIRE VALIDER par des locuteurs natifs ; les textes manquants s'affichent en français.
// Ajouter une langue : créer src/i18n/messages/<code>.ts (objet partiel) puis l'inscrire ici. Voir docs/product/langues.md.

export type LocaleCode = "fr" | "en" | "wo";

export const LOCALES: { code: LocaleCode; name: string; status: "complete" | "beta"; dir: "ltr" | "rtl" }[] = [
  { code: "fr", name: "Français", status: "complete", dir: "ltr" },
  { code: "en", name: "English", status: "complete", dir: "ltr" },
  { code: "wo", name: "Wolof", status: "beta", dir: "ltr" },
];

export const DEFAULT_LOCALE: LocaleCode = "fr";
export const LOCALE_COOKIE = "baobab_locale";

export const isLocale = (v: unknown): v is LocaleCode => LOCALES.some((l) => l.code === v);

/** Choisit la langue à partir de l'en-tête Accept-Language (ex. "en-US,en;q=0.9,fr;q=0.8"). */
export function negotiate(acceptLanguage: string | null | undefined): LocaleCode {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const prefs = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return prefs.find((p) => isLocale(p.lang))?.lang as LocaleCode | undefined ?? DEFAULT_LOCALE;
}
