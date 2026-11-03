import "server-only";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { AppError } from "@/server/errors";
import { fieldErrors, type FieldErrors } from "@/lib/validation/common";

export type ActionState = { ok: boolean; message?: string; errors?: FieldErrors; data?: Record<string, string> } | null;

/** Exécute une action métier et traduit les erreurs en état affichable (jamais de faux succès). */
export async function runAction(fn: () => Promise<ActionState | void>, successMessage?: string): Promise<ActionState> {
  try {
    const res = await fn();
    // Les pages sont toutes dynamiques : on invalide l'arbre pour que la réponse de l'action
    // embarque l'interface à jour (pas de rafraîchissement côté client nécessaire).
    if (!res?.data?.redirect) revalidatePath("/", "layout");
    return res ?? { ok: true, message: successMessage };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, errors: fieldErrors(e), message: "Certains champs sont invalides." };
    if (e instanceof AppError) return { ok: false, message: e.message };
    // Les redirections Next.js doivent être propagées.
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
    console.error(e);
    return { ok: false, message: "Une erreur inattendue est survenue. Réessayez ; si le problème persiste, contactez l'administrateur." };
  }
}

/** Résultat de succès demandant une navigation (chargement complet, effectué par le formulaire). */
export const navigateTo = (url: string): ActionState => ({ ok: true, data: { redirect: url } });
