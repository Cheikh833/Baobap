import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { getBillingOverview } from "@/server/services/billing";
import { Badge, Card, ProgressBar, Table, Td } from "@/components/ui/display";
import { ActionForm, SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import { PlanPrice } from "@/components/plan-price";
import { PLANS } from "@/lib/plans";
import { formatDate } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { Forbidden } from "../../forbidden";
import { requestPlanAction } from "../actions";

export const metadata = { title: "Abonnement" };

export default async function BillingPage() {
  const ctx = await requireTenant();
  if (!can({ ...ctx, readOnly: false }, "billing:view")) return <Forbidden />;
  const [{ org, plan, state, usage, requests }, { m, locale }] = await Promise.all([getBillingOverview({ ...ctx, readOnly: false }), getMessages()]);
  const B = m.billing;
  const manage = can({ ...ctx, readOnly: false }, "billing:manage");
  const tone = state.phase === "expired" ? "danger" : state.phase === "grace" ? "warning" : state.phase === "trial" ? "info" : "success";
  const meter = (used: number, max: number | null) => (max === null ? null : Math.min(100, Math.round((used / max) * 100)));
  const mm = meter(usage.members, plan.limits.members);
  const pm = meter(usage.projects, plan.limits.projects);
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{B.currentPlan}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{m.plans[plan.code].name}</h2>
            <Badge tone={tone}>{B.phase[state.phase]}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600">{m.plans[plan.code].audience}</p>
          <div className="mt-4"><PlanPrice plan={plan} m={m} locale={locale} cycle={org.billingCycle} /></div>
          <p className="mt-3 text-sm">
            {state.phase === "trial" && org.trialEndsAt && fill(B.trialEnds, { date: formatDate(org.trialEndsAt), days: state.daysLeft ?? 0 })}
            {state.phase !== "trial" && org.currentPeriodEnd && fill(B.periodEnds, { date: formatDate(org.currentPeriodEnd) })}
          </p>
          {state.readOnly && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">{m.banner.expired}</p>}
        </Card>
        <Card>
          <h2 className="font-semibold">{B.usage}</h2>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <div className="mb-1 flex justify-between"><span>{B.membersUsage}</span><span className="font-medium">{usage.members} / {plan.limits.members ?? "∞"}</span></div>
              {mm !== null && <ProgressBar value={mm} label={B.membersUsage} />}
            </div>
            <div>
              <div className="mb-1 flex justify-between"><span>{B.projectsUsage}</span><span className="font-medium">{usage.projects} / {plan.limits.projects ?? "∞"}</span></div>
              {pm !== null && <ProgressBar value={pm} label={B.projectsUsage} />}
            </div>
            <p className="text-xs text-slate-500">{B.freeViewers}</p>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold">{B.requestTitle}</h2>
        <p className="mb-4 mt-1 text-sm text-slate-600">{B.requestText}</p>
        {manage ? (
          <ActionForm action={requestPlanAction} submitLabel={B.submit} resetOnSuccess>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField name="plan" label={B.plan} options={PLANS.map((p) => [p.code, m.plans[p.code].name] as const)} defaultValue={plan.code} />
              <SelectField name="cycle" label={B.cycle} options={[["YEARLY", m.pricing.yearly], ["MONTHLY", m.pricing.monthly]]} defaultValue="YEARLY" />
              <TextField name="contactPhone" label={B.phone} type="tel" autoComplete="tel" />
            </div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="solidarity" className="mt-0.5 h-4 w-4 rounded border-line text-brand" />{B.solidarity}</label>
            <TextAreaField name="message" label={B.message} rows={2} />
          </ActionForm>
        ) : (
          <p className="text-sm text-slate-500">{B.readOnlyRole}</p>
        )}
      </Card>

      {requests.length > 0 && (
        <div>
          <h2 className="mb-2 font-semibold">{B.requests}</h2>
          <Table head={["Date", B.plan, B.cycle, B.status]}>
            {requests.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap">{formatDate(r.createdAt)}</Td>
                <Td>{m.plans[r.plan].name}{r.solidarity && " · −30 %"}</Td>
                <Td>{r.cycle === "YEARLY" ? m.pricing.yearly : m.pricing.monthly}</Td>
                <Td><Badge tone={r.status === "PENDING" ? "warning" : r.status === "DONE" ? "success" : "neutral"}>{B.requestStatus[r.status]}</Badge></Td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </div>
  );
}
