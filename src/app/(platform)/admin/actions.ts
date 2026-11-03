"use server";
import { runAction, type ActionState } from "@/server/action";
import { requireUser } from "@/server/context";
import { activateFromRequest, reviewMobilePayment } from "@/server/services/mobile-payments";

export async function reviewPaymentAction(id: string, received: boolean, _: ActionState) {
  const user = await requireUser();
  return runAction(() => reviewMobilePayment(user, id, received), received ? "Abonnement activé." : "Paiement rejeté.");
}

export async function activateRequestAction(id: string, _: ActionState) {
  const user = await requireUser();
  return runAction(() => activateFromRequest(user, id), "Abonnement activé.");
}
