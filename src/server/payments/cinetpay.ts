import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Intégration CinetPay (API Checkout v2) — Wave, Orange Money, MTN, Moov, cartes bancaires.
 * Documentation : https://docs.cinetpay.com
 *
 * Règle de sécurité : une notification ne suffit jamais à valider un paiement. Le statut est toujours
 * confirmé par l'appel serveur-à-serveur /v2/payment/check, et le montant et la devise sont comparés.
 */

const BASE = "https://api-checkout.cinetpay.com/v2";

export type CinetPayConfig = { apiKey: string; siteId: string; secretKey?: string };

export function cinetpayConfig(env: NodeJS.ProcessEnv = process.env): CinetPayConfig | null {
  if (!env.CINETPAY_API_KEY || !env.CINETPAY_SITE_ID) return null;
  return { apiKey: env.CINETPAY_API_KEY, siteId: env.CINETPAY_SITE_ID, secretKey: env.CINETPAY_SECRET_KEY || undefined };
}

type Fetch = typeof fetch;

export type InitInput = {
  transactionId: string;
  amount: number;
  description: string;
  notifyUrl: string;
  returnUrl: string;
  lang: "fr" | "en";
  customer: { name: string; email: string; phone?: string };
  metadata?: string;
};

export class PaymentProviderError extends Error {}

/** Crée la transaction chez CinetPay et renvoie l'URL de la page de paiement. */
export async function initPayment(cfg: CinetPayConfig, input: InitInput, f: Fetch = fetch) {
  if (input.amount <= 0 || input.amount % 5 !== 0) throw new PaymentProviderError("Le montant XOF doit être un multiple de 5.");
  const [surname, ...rest] = input.customer.name.trim().split(/\s+/);
  const res = await f(`${BASE}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: cfg.apiKey,
      site_id: cfg.siteId,
      transaction_id: input.transactionId,
      amount: input.amount,
      currency: "XOF",
      description: input.description.replace(/[^\p{L}\p{N} .,'-]/gu, " ").slice(0, 200),
      notify_url: input.notifyUrl,
      return_url: input.returnUrl,
      channels: "ALL",
      lang: input.lang,
      metadata: input.metadata ?? "",
      customer_name: rest.join(" ") || surname,
      customer_surname: surname,
      customer_email: input.customer.email,
      customer_phone_number: input.customer.phone ?? "",
    }),
  });
  const body = (await res.json().catch(() => null)) as { code?: string; message?: string; data?: { payment_url?: string; payment_token?: string } } | null;
  if (!body || body.code !== "201" || !body.data?.payment_url) {
    throw new PaymentProviderError(`CinetPay a refusé l'initialisation (${body?.code ?? res.status} ${body?.message ?? ""}).`.trim());
  }
  return { paymentUrl: body.data.payment_url, token: body.data.payment_token ?? null, raw: body };
}

export type CheckResult = {
  status: "ACCEPTED" | "REFUSED" | "PENDING";
  amount: number | null;
  currency: string | null;
  paymentMethod: string | null;
  raw: unknown;
};

/** Vérifie l'état réel d'une transaction auprès de CinetPay. */
export async function checkPayment(cfg: CinetPayConfig, transactionId: string, f: Fetch = fetch): Promise<CheckResult> {
  const res = await f(`${BASE}/payment/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: cfg.apiKey, site_id: cfg.siteId, transaction_id: transactionId }),
  });
  const body = (await res.json().catch(() => null)) as { code?: string; data?: { status?: string; amount?: string | number; currency?: string; payment_method?: string } } | null;
  if (!body) throw new PaymentProviderError(`Réponse illisible de CinetPay (${res.status}).`);
  const s = body.data?.status;
  const status: CheckResult["status"] = body.code === "00" && s === "ACCEPTED" ? "ACCEPTED" : s === "REFUSED" || ["600", "627"].includes(body.code ?? "") ? "REFUSED" : "PENDING";
  return {
    status,
    amount: body.data?.amount !== undefined ? Number(body.data.amount) : null,
    currency: body.data?.currency ?? null,
    paymentMethod: body.data?.payment_method ?? null,
    raw: body,
  };
}

/** Champs de la notification, dans l'ordre exigé pour le calcul du jeton HMAC (en-tête x-token). */
export const NOTIFY_TOKEN_FIELDS = [
  "cpm_site_id", "cpm_trans_id", "cpm_trans_date", "cpm_amount", "cpm_currency", "signature", "payment_method",
  "cel_phone_num", "cpm_phone_prefixe", "cpm_language", "cpm_version", "cpm_payment_config", "cpm_page_action",
  "cpm_custom", "cpm_designation", "cpm_error_message",
] as const;

export function notificationToken(fields: Record<string, string>, secretKey: string) {
  const data = NOTIFY_TOKEN_FIELDS.map((k) => fields[k] ?? "").join("");
  return createHmac("sha256", secretKey).update(data).digest("hex");
}

/** Vérifie l'en-tête x-token d'une notification (si une clé secrète est configurée). */
export function verifyNotificationToken(fields: Record<string, string>, token: string | null, secretKey: string): boolean {
  if (!token) return false;
  const expected = Buffer.from(notificationToken(fields, secretKey));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
