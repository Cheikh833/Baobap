import { requireUser } from "@/server/context";
import { platformOverview } from "@/server/services/mobile-payments";
import { subscriptionState } from "@/lib/plans";
import { Badge, Card, PageHeader, Table, Td } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { formatDate } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { activateRequestAction, reviewPaymentAction } from "./actions";

export const metadata = { title: "Administration" };

export default async function AdminPage() {
  const user = await requireUser();
  const [{ payments, requests, orgs }, { m, locale }] = await Promise.all([platformOverview(user), getMessages()]);
  const A = m.admin;
  const money = (n: number) => `${new Intl.NumberFormat("fr-FR").format(n)} FCFA`;
  const cycle = (c: string) => (c === "YEARLY" ? m.pricing.yearly : m.pricing.monthly);
  return (
    <>
      <PageHeader title={A.title} description={A.description} />
      <section className="space-y-3">
        <h2 className="font-semibold">{A.pendingPayments} ({payments.length})</h2>
        {payments.length === 0 ? <Card><p className="text-sm text-slate-500">{A.none}</p></Card> : (
          <Table head={[...A.paymentsHead, m.ui.actions]}>
            {payments.map((p) => (
              <tr key={p.id}>
                <Td className="whitespace-nowrap text-xs">{formatDate(p.createdAt, locale)}</Td>
                <Td><p className="font-medium">{p.organization.name}</p><p className="text-xs text-slate-500">{p.organization.code}</p></Td>
                <Td>{m.plans[p.plan].name} · {cycle(p.cycle)}{(p.providerData as { solidarity?: boolean } | null)?.solidarity && <Badge tone="warning">−30 %</Badge>}</Td>
                <Td className="whitespace-nowrap font-semibold">{money(p.amountXof)}</Td>
                <Td>{p.paymentMethod}<p className="font-mono text-xs">{p.externalReference}</p></Td>
                <Td className="whitespace-nowrap">{p.senderPhone}</Td>
                <Td>
                  <div className="flex flex-col gap-2">
                    <ActionForm action={reviewPaymentAction.bind(null, p.id, true)} submitLabel={A.confirm} className="space-y-1" confirm={fill(A.confirmReceived, { amount: new Intl.NumberFormat("fr-FR").format(p.amountXof), ref: p.externalReference ?? "" })} />
                    <ActionForm action={reviewPaymentAction.bind(null, p.id, false)} submitLabel={A.reject} submitVariant="secondary" className="space-y-1" />
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-semibold">{A.pendingRequests} ({requests.length})</h2>
        {requests.length === 0 ? <Card><p className="text-sm text-slate-500">{A.none}</p></Card> : (
          <Table head={[...A.requestsHead, m.ui.actions]}>
            {requests.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap text-xs">{formatDate(r.createdAt, locale)}</Td>
                <Td><p className="font-medium">{r.organization.name}</p><p className="text-xs text-slate-500">{r.organization.code}</p></Td>
                <Td>{m.plans[r.plan].name} · {cycle(r.cycle)}{r.solidarity && <Badge tone="warning">−30 %</Badge>}</Td>
                <Td>{r.contactPhone ?? "—"}</Td>
                <Td className="max-w-xs text-xs">{r.message ?? "—"}</Td>
                <Td><ActionForm action={activateRequestAction.bind(null, r.id)} submitLabel={A.activate} className="space-y-1" /></Td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-semibold">{A.orgs} ({orgs.length})</h2>
        <Table head={A.orgsHead}>
          {orgs.map((o) => {
            const st = subscriptionState(o);
            return (
              <tr key={o.id}>
                <Td><p className="font-medium">{o.name}</p><p className="text-xs text-slate-500">{o.code}</p></Td>
                <Td>{m.plans[o.plan].name}</Td>
                <Td><Badge tone={st.phase === "expired" ? "danger" : st.phase === "trial" ? "info" : st.phase === "grace" ? "warning" : "success"}>{m.billing.phase[st.phase]}</Badge></Td>
                <Td className="whitespace-nowrap text-xs">{formatDate(o.subscriptionStatus === "TRIALING" ? o.trialEndsAt : o.currentPeriodEnd, locale)}</Td>
                <Td>{o._count.memberships}</Td>
                <Td>{o._count.projects}</Td>
                <Td className="whitespace-nowrap text-xs">{formatDate(o.createdAt, locale)}</Td>
              </tr>
            );
          })}
        </Table>
      </section>
    </>
  );
}
