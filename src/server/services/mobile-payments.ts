import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/server/db";
import { AppError, forbidden, notFound } from "@/server/errors";
import { audit } from "@/server/audit";
import { can, type TenantContext } from "@/server/permissions/check";
import { layout, sendMail } from "@/server/mail/mailer";
import { getPlan, planName, SOLIDARITY_DISCOUNT } from "@/lib/plans";
import { activateIn } from "./billing";

/**
 * Paiement par transfert Mobile Money (Wave, Orange Money) vers le numéro de l'éditeur,
 * en attendant un compte marchand. Le client déclare son transfert (identifiant de transaction) ;
 * un administrateur plateforme confirme la réception sur son téléphone, ce qui active l'abonnement.
 * Rien n'est activé automatiquement sur simple déclaration.
 */
export type MobileConfig = { number: string; name: string; operators: string[] };

export function mobilePaymentConfig(env: NodeJS.ProcessEnv = process.env): MobileConfig | null {
  if (!env.PAYMENT_MOBILE_NUMBER) return null;
  return {
    number: env.PAYMENT_MOBILE_NUMBER,
    name: env.PAYMENT_MOBILE_NAME ?? "",
    operators: (env.PAYMENT_MOBILE_OPERATORS ?? "Wave,Orange Money").split(",").map((s) => s.trim()).filter(Boolean),
  };
}

export const platformAdminEmails = (env: NodeJS.ProcessEnv = process.env) =>
  (env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

export const isPlatformAdmin = (email: string | null | undefined) => !!email && platformAdminEmails().includes(email.toLowerCase());

/** Montant attendu en FCFA (tarif solidaire −30 %, arrondi au multiple de 5 inférieur). */
export function expectedAmount(plan: string, cycle: "MONTHLY" | "YEARLY", solidarity: boolean) {
  const p = getPlan(plan);
  const base = cycle === "YEARLY" ? p.yearlyXof : p.monthlyXof;
  if (base === null) throw new AppError("VALIDATION", "Plan non payable en ligne (le plan Entreprise est sur devis).");
  return solidarity ? Math.floor((base * (1 - SOLIDARITY_DISCOUNT)) / 5) * 5 : base;
}

/** Référence à indiquer dans le motif du transfert. */
export const transferReference = (orgCode: string) => `BAOBAB-${orgCode}`;

const declareSchema = z.object({
  plan: z.enum(["ESSENTIEL", "PROFESSIONNEL", "INSTITUTION"], { errorMap: () => ({ message: "Plan non payable en ligne (le plan Entreprise est sur devis)." }) }),
  cycle: z.enum(["MONTHLY", "YEARLY"]).default("YEARLY"),
  operator: z.string().trim().min(2).max(40),
  reference: z.string({ required_error: "L'identifiant de la transaction est obligatoire." }).trim().min(4, "L'identifiant de la transaction est obligatoire.").max(80),
  senderPhone: z.string({ required_error: "Le numéro ayant effectué le paiement est obligatoire." }).trim().min(6, "Le numéro ayant effectué le paiement est obligatoire.").max(30),
  solidarity: z.preprocess((v) => v === "on" || v === true, z.boolean()).default(false),
});

export async function declareMobilePayment(ctx: TenantContext, input: unknown) {
  if (!can({ ...ctx, readOnly: false }, "billing:manage")) throw forbidden();
  const cfg = mobilePaymentConfig();
  if (!cfg) throw new AppError("CONFLICT", "Le paiement par Mobile Money n'est pas configuré sur cette installation.");
  const data = declareSchema.parse(input);
  if (!cfg.operators.includes(data.operator)) throw new AppError("VALIDATION", "Opérateur non pris en charge.");
  const pending = await db.payment.count({ where: { organizationId: ctx.organizationId, provider: "mobile_manual", status: "PENDING" } });
  if (pending) throw new AppError("CONFLICT", "Un paiement déclaré est déjà en attente de vérification pour cette organisation.");
  const amount = expectedAmount(data.plan, data.cycle, data.solidarity);
  const payment = await db.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        organizationId: ctx.organizationId, provider: "mobile_manual", transactionId: `MAN${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString("hex").toUpperCase()}`,
        plan: data.plan, cycle: data.cycle, amountXof: amount, paymentMethod: data.operator, externalReference: data.reference,
        senderPhone: data.senderPhone, requestedById: ctx.userId, providerData: { solidarity: data.solidarity },
      },
    });
    await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "payment.declared", entityType: "Payment", entityId: p.id, summary: `Paiement ${data.operator} déclaré : ${amount} FCFA, réf. ${data.reference} (${planName(data.plan)})` });
    return p;
  });
  // Prévenir les administrateurs plateforme (si l'envoi d'emails est configuré).
  const admins = platformAdminEmails();
  if (admins.length) {
    const { html, text } = layout("Paiement Mobile Money à vérifier", [
      `${ctx.organizationName} déclare avoir payé ${amount} FCFA par ${data.operator} (réf. ${data.reference}, depuis le ${data.senderPhone}) pour le plan ${planName(data.plan)} ${data.cycle === "YEARLY" ? "annuel" : "mensuel"}.`,
      "Vérifiez la réception sur votre téléphone puis confirmez dans l'administration de la plateforme (/admin).",
    ]);
    await Promise.all(admins.map((to) => sendMail({ to, subject: `BAOBAB — Paiement à vérifier (${ctx.organizationName})`, html, text })));
  }
  return payment;
}

type Admin = { id: string; email: string };
const assertAdmin = (admin: Admin) => { if (!isPlatformAdmin(admin.email)) throw forbidden(); };

/** Vue d'ensemble pour l'administration plateforme (toutes organisations). */
export async function platformOverview(admin: Admin) {
  assertAdmin(admin);
  const [payments, requests, orgs] = await Promise.all([
    db.payment.findMany({ where: { provider: "mobile_manual", status: "PENDING" }, include: { organization: { select: { name: true, code: true } } }, orderBy: { createdAt: "asc" } }),
    db.planRequest.findMany({ where: { status: "PENDING" }, include: { organization: { select: { name: true, code: true } } }, orderBy: { createdAt: "asc" } }),
    db.organization.findMany({ select: { id: true, name: true, code: true, plan: true, subscriptionStatus: true, trialEndsAt: true, currentPeriodEnd: true, createdAt: true, _count: { select: { memberships: true, projects: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return { payments, requests, orgs };
}

/** L'administrateur confirme (argent reçu) ou rejette un paiement déclaré. */
export async function reviewMobilePayment(admin: Admin, paymentId: string, received: boolean) {
  assertAdmin(admin);
  const p = await db.payment.findUnique({ where: { id: paymentId } });
  if (!p || p.provider !== "mobile_manual") throw notFound("Paiement introuvable.");
  return db.$transaction(async (tx) => {
    const won = await tx.payment.updateMany({
      where: { id: p.id, status: "PENDING" },
      data: { status: received ? "ACCEPTED" : "REFUSED", reviewedById: admin.id, ...(received ? { paidAt: new Date() } : {}) },
    });
    if (!won.count) throw new AppError("CONFLICT", "Ce paiement a déjà été traité.");
    if (received) await activateIn(tx, p.organizationId, p.plan, p.cycle, new Date(), `paiement ${p.paymentMethod} réf. ${p.externalReference} confirmé`);
    await audit(tx, { organizationId: p.organizationId, actorId: admin.id, action: received ? "payment.confirmed" : "payment.rejected", entityType: "Payment", entityId: p.id, summary: received ? `Paiement ${p.paymentMethod} réf. ${p.externalReference} confirmé par l'administration` : `Paiement ${p.paymentMethod} réf. ${p.externalReference} non reçu — rejeté` });
  });
}

/** Active un abonnement à partir d'une demande (virement, tarif solidaire, devis). */
export async function activateFromRequest(admin: Admin, requestId: string) {
  assertAdmin(admin);
  const r = await db.planRequest.findUnique({ where: { id: requestId } });
  if (!r || r.status !== "PENDING") throw notFound("Demande introuvable ou déjà traitée.");
  await db.$transaction((tx) => activateIn(tx, r.organizationId, r.plan, r.cycle, new Date(), "demande traitée par l'administration"));
}
