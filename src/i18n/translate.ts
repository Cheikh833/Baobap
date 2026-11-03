import fr, { type Messages } from "./messages/fr";
import en from "./messages/en";
import wo from "./messages/wo";
import type { DeepPartial } from "./types";
import type { LocaleCode } from "./config";

const DICTS: Record<LocaleCode, DeepPartial<Messages>> = { fr, en, wo };

function merge<T>(base: T, over: unknown): T {
  if (Array.isArray(base) || typeof base !== "object" || base === null) return (over ?? base) as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries((over as Record<string, unknown>) ?? {})) {
    if (v !== undefined) out[k] = merge((base as Record<string, unknown>)[k], v);
  }
  return out as T;
}

/** Dictionnaire complet d'une langue : les clés manquantes retombent sur le français. */
export const messagesFor = (locale: LocaleCode): Messages => (locale === "fr" ? fr : merge(fr, DICTS[locale]));

/** Remplace les variables {nom} d'un texte. */
export function fill(text: string, vars?: Record<string, string | number>) {
  return vars ? text.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`)) : text;
}
