"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Home, LogOut, Menu, Plus, Search, Sparkles, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/components/ui/cn";
import { NAV } from "./nav";
import { CommandPalette } from "./command-palette";
import { useI18n } from "@/i18n/client";
import { fill } from "@/i18n/translate";
import { LanguageSwitcher } from "@/components/language-switcher";

type Props = {
  user: { name: string; email: string };
  org: { id: string; name: string; roleName: string };
  orgs: { id: string; name: string }[];
  allowed: string[];
  platformAdmin?: boolean;
  isDemo?: boolean;
  /** Nombre d'actions en attente (page « Mes actions »). */
  actionsCount?: number;
  /** Démo visiteur (foire) : bandeau d'invitation à créer un compte. */
  guest?: boolean;
  subscription: { phase: "trial" | "active" | "grace" | "expired"; daysLeft: number | null; canManage: boolean };
  children: React.ReactNode;
};

export function Shell({ user, org, orgs, allowed, subscription, platformAdmin, isDemo, actionsCount = 0, guest = false, children }: Props) {
  const { m } = useI18n();
  const N = m.nav;
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/" aria-label={N.home} title={N.home} className="transition-transform duration-300 hover:scale-[1.03]"><Logo light /></Link>
        <button className="rounded-md p-2 text-white/80 hover:bg-white/10 lg:hidden" onClick={() => setOpen(false)} aria-label={N.closeMenu}><X className="h-5 w-5" /></button>
      </div>
      <div className="mx-3 mb-2 rounded-2xl border border-white/10 bg-white/[.06] p-3">
        <form method="post" action="/api/organizations/switch" className="space-y-1">
          <label htmlFor="organizationId" className="text-[10px] font-semibold uppercase tracking-[.14em] text-white/50">{N.activeOrg}</label>
          <select
            id="organizationId"
            name="organizationId"
            defaultValue={org.id}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="block h-9 w-full rounded-lg border border-white/15 bg-navy-900/40 px-2 text-sm font-medium text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-brand-300/60"
          >
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button className="sr-only focus:not-sr-only focus:text-xs focus:text-white">{N.changeOrg}</button>
        </form>
        <p className="mt-1.5 text-xs text-white/60">{fill(N.role, { role: org.roleName })}</p>
        {isDemo && <p className="mt-2 inline-flex rounded-full bg-ochre/90 px-2 py-0.5 text-[11px] font-semibold text-navy">{m.demo.badge}</p>}
        <Link href="/onboarding" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-300 hover:text-white"><Plus className="h-3 w-3" />{N.newOrg}</Link>
      </div>
      <div className="px-3 pt-1">
        <Link href="/" className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/75 ring-1 ring-white/10 transition hover:bg-white/[.08] hover:text-white">
          <Home className="h-4 w-4 text-ochre transition-transform group-hover:scale-110" aria-hidden />{N.home}
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4 [scrollbar-color:rgba(255,255,255,.2)_transparent]" aria-label={N.pilotage}>
        {NAV.map((group) => {
          const items = group.items.filter((i) => !i.permission || allowed.includes(i.permission) || i.phase);
          if (!items.length) return null;
          return (
            <div key={group.section} className="mt-4">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[.14em] text-white/40">{N[group.section]}</p>
              <ul className="mt-1 space-y-0.5">
                {items.map(({ href, label, icon: Icon, phase }) => {
                  if (phase) {
                    return (
                      <li key={href}>
                        <span className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/35" aria-disabled="true" title={fill(N.plannedPhase, { phase: phase })}>
                          <Icon className="h-4 w-4" aria-hidden />
                          <span className="flex-1">{N[label]}</span>
                          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/50">{m.common.soon}</span>
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
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                          active ? "bg-gradient-to-r from-brand to-[#12A886]/70 text-white shadow-[0_8px_24px_-10px_rgba(18,184,146,.9)]" : "text-white/70 hover:translate-x-0.5 hover:bg-white/[.07] hover:text-white",
                        )}
                      >
                        {active && <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-ochre" aria-hidden />}
                        <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", active ? "text-white" : "text-white/55")} aria-hidden />
                        <span className="flex-1">{N[label]}</span>
                        {href === "/actions" && actionsCount > 0 && <span className="min-w-5 rounded-full bg-ochre px-1.5 py-0.5 text-center text-[10px] font-bold text-navy tabular" aria-label={fill(N.actionsBadge, { n: actionsCount })}>{actionsCount > 99 ? "99+" : actionsCount}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        {platformAdmin && <Link href="/admin" className="mb-3 block text-xs font-semibold text-ochre hover:text-white">{m.admin.navLink}</Link>}
        <LanguageSwitcher className="mb-3 [&_select]:border-white/15 [&_select]:bg-navy-900/40 [&_select]:text-white [&_select]:[color-scheme:dark] [&_svg]:text-white/60" />
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ochre to-[#F0C06E] text-sm font-bold text-navy" aria-hidden>
            {user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-white/50">{user.email}</p>
          </div>
        </div>
        <form method="post" action="/api/auth/logout">
          <button className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/60 transition-colors hover:text-white"><LogOut className="h-3.5 w-3.5" />{m.common.logout}</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="app-bg min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">{m.common.skipToContent}</a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-gradient-to-b from-[#07222B] via-[#061A26] to-[#030F17] lg:block">
        <div className="pointer-events-none absolute -left-20 -top-16 h-64 w-64 rounded-full bg-brand/35 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -right-24 bottom-10 h-56 w-56 rounded-full bg-ochre/15 blur-3xl" aria-hidden />
        <div className="relative h-full">{sidebar}</div>
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={N.pilotage}>
          <div className="absolute inset-0 animate-fade-in bg-navy/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-[fade-in_.25s_ease-out] bg-gradient-to-b from-[#07222B] via-[#061A26] to-[#030F17] shadow-2xl">{sidebar}</aside>
        </div>
      )}
      <CommandPalette allowed={allowed} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b border-white/10 bg-[#07222B]/95 px-2 text-white backdrop-blur lg:hidden">
          <button className="rounded-md p-2" onClick={() => setOpen(true)} aria-label={N.openMenu}><Menu className="h-5 w-5" /></button>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{org.name}</span>
          <button className="rounded-md p-2" onClick={() => window.dispatchEvent(new Event("baobab:search"))} aria-label={m.search.open}><Search className="h-5 w-5" /></button>
          <Link href="/" className="rounded-md p-2" aria-label={N.home}><Home className="h-5 w-5" /></Link>
        </header>
        {/* Barre supérieure (ordinateur) : recherche, retour à l'accueil, raccourcis */}
        <header className="sticky top-0 z-20 hidden h-16 items-center gap-3 border-b border-line/70 bg-white/75 px-8 backdrop-blur-xl lg:flex">
          <button type="button" onClick={() => window.dispatchEvent(new Event("baobab:search"))} className="group flex h-10 w-full max-w-md items-center gap-2 rounded-full bg-canvas px-4 text-sm text-slate-500 ring-1 ring-line transition hover:bg-white hover:ring-brand/40 hover:shadow-soft">
            <Search className="h-4 w-4 transition-colors group-hover:text-brand" aria-hidden /><span className="min-w-0 flex-1 truncate text-left">{m.search.placeholder}</span><kbd className="rounded-md bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-500 ring-1 ring-line">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-navy transition hover:bg-brand-50 hover:text-brand-deep"><Home className="h-4 w-4" aria-hidden />{N.home}</Link>
            {allowed.includes("ai:view") && <Link href="/ai" className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-navy to-[#0F4C5C] px-4 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"><Sparkles className="h-4 w-4 text-ochre" aria-hidden />{N.ai}</Link>}
            <Link href="/actions" className="relative flex h-10 w-10 items-center justify-center rounded-full text-navy transition hover:bg-brand-50" aria-label={actionsCount ? fill(N.actionsBadge, { n: actionsCount }) : N.notifications}>
              <Bell className="h-5 w-5" aria-hidden />
              {actionsCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ochre px-1 text-[10px] font-bold text-navy ring-2 ring-white">{actionsCount > 99 ? "99+" : actionsCount}</span>}
            </Link>
            <Link href="/administration" title={user.name} className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-ochre to-[#F0C06E] text-sm font-bold text-navy shadow-soft ring-2 ring-white transition hover:scale-105">
              {user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
            </Link>
          </div>
        </header>
        {guest ? (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b border-ochre/30 bg-gradient-to-r from-amber-50 to-white px-4 py-2 text-sm text-amber-900 sm:px-6 lg:px-8">
            <span>{m.guest.banner}</span>
            <form method="post" action="/api/demo/leave"><button className="rounded-lg bg-navy px-3 py-1 text-xs font-semibold text-white shadow hover:bg-navy/90">{m.guest.bannerCta}</button></form>
          </div>
        ) : <SubscriptionBanner s={subscription} />}
        <main id="main" key={pathname} className="mx-auto max-w-7xl animate-fade-in px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
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
