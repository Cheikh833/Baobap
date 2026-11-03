import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/server/db";
import { AppError, forbidden, notFound } from "@/server/errors";
import { audit } from "@/server/audit";
import { assertCan, can, type TenantContext } from "@/server/permissions/check";
import { checkPayment, cinetpayConfig, initPayment, PaymentProviderError, type CinetPayConfig } from "@/server/payments/cinetpay";
import { getPlan, planName } from "@/lib/plans";
import { activateIn } from "./billing";

type Deps = { config?: CinetPayConfig | null; fetch?: typeof fetch; now?: Date };

export const onlinePaymentEnabled = (cfg = cinetpayConfig()) => cfg !== null;

const startSchema = z.object({
  plan: z.enum(["ESSENTIEL", "PROFESSIONNEL", "INSTITUTION"], { errorMap: () => ({ message: "Plan non payable en ligne (le plan Entreprise est sur devis)." }) }),
  cycle: z.enum(["MONTHLY", "YEARLY"]).default("YEARLY"),
  phone: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(30).optional()),
});

/** Identifiant de transaction unique, alphanumérique (exigence CinetPay). */
const newTransactionId = () => `BAO${Date.now().toString(36).toUpperCase()}${randomBytes(4).toString("hex").toUpperCase()}`;

/**
 * Démarre un paiement en ligne. Autorisé en lecture seule (c'est le moyen d'en sortir), réservé à billing:manage.
 * Le tarif solidaire n'est pas payable en ligne : il nécessite un justificatif (demande manuelle).
 */
export async function startOnlinePayment(ctx: TenantContext, input: unknown, opts: { baseUrl: string; lang: "fr" | "en" }, deps: Deps = {}) {
  if (!can({ ...ctx, readOnly: false }, "billing:manage")) throw forbidden();
  const cfg = deps.config === undefined ? cinetpayConfig() : deps.config;
  if (!cfg) throw new AppError("CONFLICT", "Le paiement en ligne n'est pas encore activé sur cette installation. Utilisez la demande d'activation.");
  const data = startSchema.parse(input);
  const plan = getPlan(data.plan);
  const amount = data.cycle === "YEARLY" ? plan.yearlyXof! : plan.monthlyXof!;
  const user = await db.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { name: true, email: true } });
  const payment = await db.payment.create({
    data: { organizationId: ctx.organizationId, transactionId: newTransactionId(), plan: plan.code, cycle: data.cycle, amountXof: amount, requestedById: ctx.userId },
  });
  try {
    const res = await initPayment(cfg, {
      transactionId: payment.transactionId,
      amount,
      description: `BAOBAB ${planName(plan.code)} ${data.cycle === "YEARLY" ? "annuel" : "mensuel"}`,
      notifyUrl: `${opts.baseUrl}/api/payments/cinetpay/notify`,
      returnUrl: `${opts.baseUrl}/organization/billing?payment=${payment.id}`,
      lang: opts.lang,
      customer: { name: user.name, email: user.email, phone: data.phone },
      metadata: payment.id,
    }, deps.fetch);
    await db.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { paymentUrl: res.paymentUrl } });
      await audit(tx, { organizationId: ctx.organizationId, actorId: ctx.userId, action: "payment.start", entityType: "Payment", entityId: payment.id, summary: `Paiement en ligne initié : ${planName(plan.code)} ${data.cycle === "YEARLY" ? "annuel" : "mensuel"}, ${amount} FCFA` });
    });
    return { paymentId: payment.id, paymentUrl: res.paymentUrl };
  } catch (e) {
    await db.payment.update({ where: { id: payment.id }, data: { status: "CANCELED", providerData: { error: String(e instanceof Error ? e.message : e) } } });
    if (e instanceof PaymentProviderError) throw new AppError("CONFLICT", "Le prestataire de paiement est momentanément indisponible. Réessayez ou utilisez la demande d'activation.");
    throw e;
  }
}

/**
 * Confirme un paiement auprès de CinetPay et active l'abonnement. Idempotent et sûr en cas d'appels
 * concurrents (notification + retour du client) : une seule activation par paiement.
 */
export async function confirmPayment(transactionId: string, deps: Deps = {}) {
  const cfg = deps.config === undefined ? cinetpayConfig() : deps.config;
  if (!cfg) throw new AppError("CONFLICT", "Paiement en ligne non configuré.");
  const payment = await db.payment.findUnique({ where: { transactionId } });
  if (!payment) throw notFound("Transaction inconnue.");
  if (payment.status !== "PENDING") return payment.status;

  const check = await checkPayment(cfg, transactionId, deps.fetch);
  const now = deps.now ?? new Date();
  if (check.status === "PENDING") return "PENDING";

  const amountOk = check.amount === payment.amountXof && (check.currency ?? "XOF") === "XOF";
  if (check.status === "ACCEPTED" && amountOk) {
    return db.$transaction(async (tx) => {
      // Mise à jour conditionnelle : si un autre appel a déjà traité ce paiement, on s'arrête.
      const won = await tx.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: { status: "ACCEPTED", paidAt: now, paymentMethod: check.paymentMethod, providerData: check.raw as object },
      });
      if (won.count === 0) return "ACCEPTED" as const;
      await activateIn(tx, payment.organizationId, payment.plan, payment.cycle, now, `paiement CinetPay ${transactionId}`);
      await audit(tx, { organizationId: payment.organizationId, actorId: null, action: "payment.accepted", entityType: "Payment", entityId: payment.id, summary: `Paiement reçu : ${payment.amountXof} FCFA (${check.paymentMethod ?? "CinetPay"})` });
      return "ACCEPTED" as const;
    });
  }

  await db.$transaction(async (tx) => {
    const won = await tx.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "REFUSED", providerData: check.raw as object, paymentMethod: check.paymentMethod } });
    if (won.count) {
      await audit(tx, {
        organizationId: payment.organizationId, actorId: null, action: amountOk ? "payment.refused" : "payment.anomaly", entityType: "Payment", entityId: payment.id,
        summary: amountOk ? "Paiement refusé ou annulé" : `Anomalie : montant reçu ${check.amount} ${check.currency} ≠ attendu ${payment.amountXof} XOF — abonnement non activé`,
      });
    }
  });
  return "REFUSED";
}

export async function listPayments(ctx: TenantContext) {
  assertCan({ ...ctx, readOnly: false }, "billing:view");
  return db.payment.findMany({ where: { organizationId: ctx.organizationId, status: { not: "CANCELED" } }, orderBy: { createdAt: "desc" }, take: 10 });
}

/** Pour la page de retour : ne renvoie que les paiements de l'organisation active. */
export async function getOwnPayment(ctx: TenantContext, id: string) {
  return db.payment.findFirst({ where: { id, organizationId: ctx.organizationId } });
}
