/**
 * Back-office abonnements (équipe BAOBAB) tant que le paiement en ligne n'est pas intégré.
 *
 *   npm run billing -- list                         demandes en attente
 *   npm run billing -- activate <CODE_ORG> <PLAN> <MONTHLY|YEARLY>
 *
 * À exécuter uniquement après réception effective du paiement (Mobile Money, virement…).
 */
import { db } from "../src/server/db";
import { activateSubscription } from "../src/server/services/billing";
import { planName, PLANS } from "../src/lib/plans";

async function main() {
  const [cmd, code, plan, cycle] = process.argv.slice(2);
  if (cmd === "list") {
    const rows = await db.planRequest.findMany({ where: { status: "PENDING" }, include: { organization: { select: { code: true, name: true } } }, orderBy: { createdAt: "asc" } });
    if (!rows.length) return console.log("Aucune demande en attente.");
    for (const r of rows) console.log(`${r.createdAt.toISOString().slice(0, 10)}  ${r.organization.code.padEnd(12)} ${r.organization.name} → ${planName(r.plan)} ${r.cycle}${r.solidarity ? " (solidaire)" : ""} ${r.contactPhone ?? ""} ${r.message ?? ""}`);
    return;
  }
  if (cmd === "activate") {
    if (!code || !PLANS.some((p) => p.code === plan) || !["MONTHLY", "YEARLY"].includes(cycle)) {
      throw new Error("Usage : activate <CODE_ORG> <ESSENTIEL|PROFESSIONNEL|INSTITUTION|ENTREPRISE> <MONTHLY|YEARLY>");
    }
    const org = await db.organization.findUnique({ where: { code: code.toUpperCase() } });
    if (!org) throw new Error(`Organisation ${code} introuvable.`);
    const res = await activateSubscription(org.id, plan, cycle as "MONTHLY" | "YEARLY");
    return console.log(`Abonnement ${planName(plan)} actif pour ${org.name} jusqu'au ${res.currentPeriodEnd?.toISOString().slice(0, 10)}.`);
  }
  console.log("Commandes : list | activate <CODE_ORG> <PLAN> <MONTHLY|YEARLY>");
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
