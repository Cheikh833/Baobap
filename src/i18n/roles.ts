import { SYSTEM_ROLES } from "@/server/permissions/catalog";
import type { Messages } from "./messages/fr";

/** Nom affiché d'un rôle : traduit pour un rôle système non renommé, sinon le nom choisi par l'organisation. */
export function roleLabel(r: { key: string; name: string }, m: Messages) {
  const def = SYSTEM_ROLES.find((x) => x.key === r.key);
  const tr = (m.roleNames as Record<string, string>)[r.key];
  return def && r.name === def.name && tr ? tr : r.name;
}
