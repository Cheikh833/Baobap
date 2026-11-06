import Link from "next/link";
import { Download, KeyRound, Laptop, Link2, ShieldCheck } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { currentSessionId } from "@/server/auth/session";
import { mySecurity, usage } from "@/server/services/administration";
import { db } from "@/server/db";
import { Badge, Card, PageHeader } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { Meter } from "@/components/charts/charts";
import { fmtSize } from "@/components/documents/fields";
import { formatDate } from "@/lib/metrics";
import { roleLabel } from "@/i18n/roles";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { revokeOthersAction, unlinkAction } from "./actions";

export const metadata = { title: "Administration" };

const device = (ua: string | null) => {
  if (!ua) return "—";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return [br, os].filter(Boolean).join(" · ") || ua.slice(0, 40);
};

export default async function AdministrationPage() {
  const ctx = await requireTenant();
  const [{ m, locale }, sec, current] = await Promise.all([getMessages(), mySecurity(ctx.userId), currentSessionId()]);
  const A = m.admin2;
  const u = can(ctx, "administration:view") ? await usage(ctx) : null;
  const names = u ? new Map((await db.user.findMany({ where: { id: { in: u.sensitive.map((s) => s.actorId!).filter(Boolean) } }, select: { id: true, name: true } })).map((x) => [x.id, x.name])) : new Map();
  const gauge = (label: string, used: number, limit: number | null, fmt: (n: number) => string = String, hint?: string) => (
    <div key={label}>
      <div className="flex items-baseline justify-between gap-2"><p className="text-sm font-medium text-slate-600">{label}</p><p className="text-sm font-semibold tabular">{limit === null ? `${fmt(used)} · ${A.unlimited}` : fill(A.of, { used: fmt(used), limit: fmt(limit) })}</p></div>
      <div className="mt-2"><Meter value={limit ? Math.min(100, (used / limit) * 100) : 0} label={label} color={limit && used / limit > 0.9 ? "#DC2626" : limit && used / limit > 0.75 ? "#D97706" : undefined} /></div>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
  return (
    <>
      <PageHeader title={A.title} description={A.intro} />
      <div className="space-y-6">
        {u ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display font-semibold">{A.usage}</h2><Badge tone="brand">{fill(A.plan, { plan: (m.plans as unknown as Record<string, { name?: string }>)[u.plan]?.name ?? u.plan })}</Badge></div>
              <div className="grid gap-5 sm:grid-cols-2">
                {gauge(A.members, u.members, u.limits.members, String, A.membersHint)}
                {gauge(A.projects, u.projects, u.limits.projects)}
                {gauge(A.storage, u.storage, u.limits.storageGb === null ? null : u.limits.storageGb * 1024 ** 3, (x) => fmtSize(x, locale))}
                {gauge(A.ai, u.ai, u.limits.aiRequestsPerMonth)}
              </div>
              {can(ctx, "billing:view") && <Link href="/organization/billing" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">{A.manageBilling} →</Link>}
            </Card>
            <Card>
              <h2 className="mb-3 font-display font-semibold">{A.byRole}</h2>
              <ul className="space-y-1.5 text-sm">{u.byRole.sort((a, b) => b.count - a.count).map((r) => <li key={r.role.id} className="flex justify-between gap-2"><span>{roleLabel(r.role, m)}</span><span className="font-semibold tabular">{r.count}</span></li>)}</ul>
            </Card>
            <Card className="lg:col-span-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display font-semibold">{A.sensitive}</h2>{can(ctx, "audit:view") && <Link href="/organization/audit" className="text-xs font-semibold text-brand hover:underline">{A.seeAudit} →</Link>}</div>
              {u.sensitive.length === 0 ? <p className="text-sm text-slate-500">{A.noSensitive}</p> : (
                <ul className="divide-y divide-line text-sm">{u.sensitive.map((s) => <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{s.summary}</span><span className="text-xs text-slate-500">{names.get(s.actorId ?? "") ?? "—"} · {formatDate(s.createdAt, locale)}</span></li>)}</ul>
              )}
            </Card>
          </div>
        ) : <Card><p className="text-sm text-slate-600">{A.orgOnly}</p></Card>}

        <h2 className="flex items-center gap-2 pt-2 font-display text-xl font-bold"><ShieldCheck className="h-5 w-5 text-brand" />{A.security}</h2>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h3 className="mb-3 font-display font-semibold">{A.sessions}</h3>
            <ul className="divide-y divide-line">
              {sec.sessions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <Laptop className="h-4 w-4 text-slate-400" aria-hidden />
                  <span className="min-w-0 flex-1"><span className="font-medium">{device(s.userAgent)}</span><span className="block text-xs text-slate-500">{fill(A.since, { date: formatDate(s.createdAt, locale) })} · {fill(A.expires, { date: formatDate(s.expiresAt, locale) })}</span></span>
                  {s.id === current && <Badge tone="success">{A.current}</Badge>}
                </li>
              ))}
            </ul>
            {sec.sessions.length > 1 && <div className="mt-3"><ActionForm action={revokeOthersAction} submitLabel={A.revokeOthers} submitVariant="secondary" confirm={A.revokeConfirm} /></div>}
          </Card>
          <div className="space-y-6">
            <Card>
              <h3 className="mb-3 flex items-center gap-2 font-display font-semibold"><Link2 className="h-4 w-4 text-brand" />{A.accounts}</h3>
              {sec.accounts.length === 0 ? <p className="text-sm text-slate-500">{A.noAccounts}</p> : (
                <ul className="space-y-2 text-sm">{sec.accounts.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold capitalize">{a.provider}</span><span className="min-w-0 flex-1 truncate text-xs text-slate-500">{a.email} · {fill(A.lastUsed, { date: formatDate(a.lastUsedAt, locale) })}</span>
                    <ActionForm action={unlinkAction.bind(null, a.id)} submitLabel={A.unlink} submitVariant="secondary" className="space-y-0" />
                  </li>
                ))}</ul>
              )}
            </Card>
            <Card>
              <h3 className="mb-2 flex items-center gap-2 font-display font-semibold"><KeyRound className="h-4 w-4 text-brand" />{A.password}</h3>
              <p className="text-sm text-slate-600">{sec.hasPassword ? fill(A.passwordSet, { email: sec.email }) : A.passwordNone}</p>
              <Link href="/forgot-password" className="mt-2 inline-block text-sm font-semibold text-brand hover:underline">{A.passwordLink} →</Link>
            </Card>
          </div>
        </div>

        {can(ctx, "administration:export") && (
          <Card className="border-brand/20 bg-gradient-to-br from-white to-brand-50/60">
            <h2 className="font-display font-semibold">{A.export}</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">{A.exportText}</p>
            <a href="/api/administration/export" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-brand-deep"><Download className="h-4 w-4" />{A.exportBtn}</a>
          </Card>
        )}
      </div>
    </>
  );
}
