"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, Plus, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/components/ui/cn";
import { NAV } from "./nav";
import { useI18n } from "@/i18n/client";
import { fill } from "@/i18n/translate";
import { LanguageSwitcher } from "@/components/language-switcher";

type Props = {
  user: { name: string; email: string };
  org: { id: string; name: string; roleName: string };
  orgs: { id: string; name: string }[];
  allowed: string[];
  platformAdmin?: boolean;
  subscription: { phase: "trial" | "active" | "grace" | "expired"; daysLeft: number | null; canManage: boolean };
  children: React.ReactNode;
};

export function Shell({ user, org, orgs, allowed, subscription, platformAdmin, children }: Props) {
  const { m } = useI18n();
  const N = m.nav;
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" aria-label={N.dashboard}><Logo /></Link>
        <button className="rounded-md p-2 lg:hidden" onClick={() => setOpen(false)} aria-label={N.closeMenu}><X className="h-5 w-5" /></button>
      </div>
      <div className="px-4 pb-3">
        <form method="post" action="/api/organizations/switch" className="space-y-1">
          <label htmlFor="organizationId" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{N.activeOrg}</label>
          <select
            id="organizationId"
            name="organizationId"
            defaultValue={org.id}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="block h-9 w-full rounded-lg border border-line bg-white px-2 text-sm"
          >
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button className="sr-only focus:not-sr-only focus:text-xs focus:text-brand">{N.changeOrg}</button>
        </form>
        <p className="mt-1 text-xs text-slate-500">{fill(N.role, { role: org.roleName })}</p>
        <Link href="/onboarding" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"><Plus className="h-3 w-3" />{N.newOrg}</Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label={N.pilotage}>
        {NAV.map((group) => {
          const items = group.items.filter((i) => !i.permission || allowed.includes(i.permission) || i.phase);
          if (!items.length) return null;
          return (
            <div key={group.section} className="mt-4">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{N[group.section]}</p>
              <ul className="mt-1 space-y-0.5">
                {items.map(({ href, label, icon: Icon, phase }) => {
                  if (phase) {
                    return (
                      <li key={href}>
                        <span className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-400" aria-disabled="true" title={fill(N.plannedPhase, { phase: phase })}>
                          <Icon className="h-4 w-4" aria-hidden />
                          <span className="flex-1">{N[label]}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium">{m.common.soon}</span>
                        </span>
                      </li>
                    );
                  }
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn("flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors", active ? "bg-brand-50 text-brand-deep" : "text-navy hover:bg-canvas")}
                      >
                        <Icon className={cn("h-4 w-4", active ? "text-brand" : "text-slate-500")} aria-hidden />
                        {N[label]}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-line p-4">
        {platformAdmin && <Link href="/admin" className="mb-3 block text-xs font-semibold text-brand hover:underline">{m.admin.navLink}</Link>}
        <LanguageSwitcher className="mb-3" />
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
        <form method="post" action="/api/auth/logout">
          <button className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-danger"><LogOut className="h-3.5 w-3.5" />{m.common.logout}</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">{m.common.skipToContent}</a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={N.pilotage}>
          <div className="absolute inset-0 bg-navy/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
          <button className="rounded-md p-2" onClick={() => setOpen(true)} aria-label={N.openMenu}><Menu className="h-5 w-5" /></button>
          <span className="truncate text-sm font-semibold">{org.name}</span>
        </header>
        <SubscriptionBanner s={subscription} />
        <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function SubscriptionBanner({ s }: { s: Props["subscription"] }) {
  const { m } = useI18n();
  if (s.phase === "active" || (s.phase === "trial" && (s.daysLeft ?? 0) > 7 && !s.canManage)) return null;
  const text = s.phase === "trial" ? fill(m.banner.trial, { days: s.daysLeft ?? 0 }) : s.phase === "grace" ? fill(m.banner.grace, { days: s.daysLeft ?? 0 }) : m.banner.expired;
  const tone = s.phase === "expired" ? "bg-red-50 text-red-900 border-red-200" : s.phase === "grace" || (s.daysLeft ?? 0) <= 7 ? "bg-amber-50 text-amber-900 border-amber-200" : "bg-brand-50 text-brand-deep border-brand-100";
  return (
    <div role="status" className={cn("flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm sm:px-6 lg:px-8", tone)}>
      <span>{text}</span>
      <Link href={s.canManage ? "/organization/billing" : "/pricing"} className="font-medium underline underline-offset-2">{m.banner.action}</Link>
    </div>
  );
}
