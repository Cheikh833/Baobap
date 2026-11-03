import { NextResponse, type NextRequest } from "next/server";
import { cinetpayConfig, verifyNotificationToken } from "@/server/payments/cinetpay";
import { confirmPayment } from "@/server/services/payments";
import { AppError } from "@/server/errors";

// URL de notification CinetPay (serveur à serveur).
// GET : CinetPay vérifie que l'URL répond. POST : notification d'une transaction.
// La notification ne fait que déclencher la vérification : le statut est confirmé par l'API CinetPay.

export async function GET() {
  return new NextResponse("OK", { status: 200 });
}

export async function POST(req: NextRequest) {
  const cfg = cinetpayConfig();
  if (!cfg) return NextResponse.json({ error: "Paiement en ligne non configuré." }, { status: 503 });
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  const fields = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
  if (cfg.secretKey && !verifyNotificationToken(fields, req.headers.get("x-token"), cfg.secretKey)) {
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }
  const transactionId = fields.cpm_trans_id;
  if (!transactionId) return NextResponse.json({ error: "Transaction manquante." }, { status: 400 });
  try {
    const status = await confirmPayment(transactionId);
    return NextResponse.json({ status });
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") return NextResponse.json({ error: e.message }, { status: 404 });
    console.error("Notification CinetPay", e);
    return NextResponse.json({ error: "Erreur de traitement." }, { status: 500 });
  }
}
