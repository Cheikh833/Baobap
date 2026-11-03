import type { Plan } from "@/lib/plans";
import { xofToEur } from "@/lib/plans";
import type { Messages } from "@/i18n/messages/fr";
import { fill } from "@/i18n/translate";

const fmt = (n: number, locale: string) => new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(n);

export function PlanPrice({ plan, m, locale, cycle }: { plan: Plan; m: Messages; locale: string; cycle: "MONTHLY" | "YEARLY" }) {
  const xof = cycle === "YEARLY" ? plan.yearlyXof : plan.monthlyXof;
  if (xof === null) return <p className="text-2xl font-semibold">{m.common.onQuote}</p>;
  return (
    <div>
      <p className="text-3xl font-semibold tracking-tight">{fmt(xof, locale)} <span className="text-base font-medium">FCFA</span></p>
      <p className="text-sm text-slate-500">{cycle === "YEARLY" ? m.common.perYear : m.common.perMonth} · {fill(m.pricing.eurEquivalent, { eur: fmt(xofToEur(xof), locale) })}</p>
    </div>
  );
}
