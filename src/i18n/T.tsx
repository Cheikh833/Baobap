"use client";
import { useI18n } from "./client";
import { fill } from "./translate";

/** Texte traduit par clé pointée (ex. "ui.notProvided"), utilisable dans les composants partagés. */
export function T({ k, vars }: { k: string; vars?: Record<string, string | number> }) {
  const { m } = useI18n();
  const v = k.split(".").reduce<unknown>((o, p) => (o && typeof o === "object" ? (o as Record<string, unknown>)[p] : undefined), m);
  return <>{typeof v === "string" ? fill(v, vars) : k}</>;
}
