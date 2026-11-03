import { z } from "zod";

// Les champs vides des formulaires deviennent undefined (les champs facultatifs ne bloquent jamais).
const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const optText = (max = 5000) => z.preprocess(blank, z.string().trim().max(max).optional());
export const reqText = (label: string, max = 200) =>
  z.string({ required_error: `${label} est obligatoire.` }).trim().min(1, `${label} est obligatoire.`).max(max);
export const optDate = z.preprocess(blank, z.coerce.date({ invalid_type_error: "Date invalide." }).optional());
export const optInt = z.preprocess(blank, z.coerce.number().int("Nombre entier attendu.").min(0, "Valeur positive attendue.").optional());
export const optAmount = z.preprocess(
  (v) => (typeof v === "string" ? blank(v.replace(/\s/g, "").replace(",", ".")) : v),
  z.coerce.number({ invalid_type_error: "Montant invalide." }).min(0, "Le montant doit être positif.").max(1e15).optional(),
);
export const code = z
  .string({ required_error: "Le code est obligatoire." })
  .trim()
  .min(2, "Le code doit contenir au moins 2 caractères.")
  .max(30)
  .regex(/^[A-Za-z0-9._-]+$/, "Code : lettres, chiffres, tirets, points ou tirets bas uniquement.")
  .transform((s) => s.toUpperCase());
export const currency = z.preprocess(blank, z.string().regex(/^[A-Z]{3}$/, "Devise ISO à 3 lettres (ex. XOF, EUR).").default("XOF"));
// Liste saisie sous forme "a, b, c" ou une valeur par ligne.
export const list = z.preprocess(
  (v) => (typeof v === "string" ? v.split(/[\n,;]/).map((s) => s.trim()).filter(Boolean) : v ?? []),
  z.array(z.string().max(200)).max(50),
);
export const optId = z.preprocess(blank, z.string().cuid().optional());

export const lifecycleStatus = z.enum(["DRAFT", "PREPARATION", "ACTIVE", "SUSPENDED", "CLOSED", "ARCHIVED"]);

export function dateRange<T extends z.ZodTypeAny>(schema: T) {
  return schema.refine(
    (d: { startDate?: Date; endDate?: Date }) => !d.startDate || !d.endDate || d.endDate >= d.startDate,
    { message: "La date de fin doit être postérieure ou égale à la date de début.", path: ["endDate"] },
  );
}

export function formToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$ACTION")) continue;
    if (k in out) out[k] = ([] as unknown[]).concat(out[k], v);
    else out[k] = v;
  }
  return out;
}

export type FieldErrors = Record<string, string>;
export function fieldErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}
