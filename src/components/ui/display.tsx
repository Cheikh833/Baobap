import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";
import { T } from "@/i18n/T";

export function Card({ className, children, interactive }: { className?: string; children: ReactNode; interactive?: boolean }) {
  return (
    <section className={cn("min-w-0 animate-fade-up rounded-3xl border border-white bg-white/90 p-5 shadow-soft ring-1 ring-line/70 backdrop-blur transition duration-300 hover:shadow-[0_2px_4px_rgba(16,42,67,.05),0_14px_36px_-14px_rgba(16,42,67,.2)] sm:p-6", interactive && "hover:-translate-y-0.5 hover:shadow-lift", className)}>
      {children}
    </section>
  );
}

export function PageHeader({ title, description, actions, breadcrumb }: { title: string; description?: ReactNode; actions?: ReactNode; breadcrumb?: ReactNode }) {
  return (
    <div className="mb-7 flex animate-fade-up flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb && <nav aria-label="breadcrumb" className="mb-2 inline-flex max-w-full items-center rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-line">{breadcrumb}</nav>}
        <h1 className="flex items-center gap-3 font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-navy sm:text-[2.1rem]">
          <span className="h-8 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-[#16BC95] via-brand to-ochre" aria-hidden /><span className="min-w-0 truncate">{title}</span>
        </h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const tones = {
  neutral: "bg-slate-100 text-slate-700",
  brand: "bg-brand-50 text-brand-deep",
  success: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
};
export type Tone = keyof typeof tones;
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ring-black/5", tones[tone])}>{children}</span>;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex animate-fade-up flex-col items-center rounded-2xl border border-dashed border-brand/25 bg-gradient-to-b from-white to-brand-50/40 px-6 py-14 text-center">
      <div className="relative">
        <span className="absolute inset-0 animate-pulse2 rounded-2xl bg-brand/15 blur-md" aria-hidden />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-deep text-white shadow-glow">
          <Icon className="h-7 w-7" aria-hidden />
        </span>
      </div>
      <h2 className="mt-4 font-display text-lg font-semibold text-navy">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const statTones = {
  brand: "from-[#16BC95] via-[#0C9478] to-[#066555] text-white",
  navy: "from-[#1B4F72] via-[#123A5A] to-[#0A2238] text-white",
  ochre: "from-[#FFD27A] via-[#F4B043] to-[#E58A2B] text-navy",
  teal: "from-[#2CC9C0] via-[#0E9AA0] to-[#0B6B7C] text-white",
};
/** Chiffre clé : carte colorée en dégradé, grande valeur, icône en filigrane. */
export function Stat({ label, value, hint, icon: Icon, tone = "brand", index = 0 }: { label: string; value: ReactNode; hint?: ReactNode; icon?: LucideIcon; tone?: keyof typeof statTones; index?: number }) {
  const dark = tone !== "ochre";
  return (
    <section className={cn("group relative min-w-0 animate-fade-up overflow-hidden rounded-3xl bg-gradient-to-br p-5 shadow-[0_14px_34px_-16px_rgba(7,59,58,.55)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-16px_rgba(7,59,58,.6)]", statTones[tone])} style={{ animationDelay: `${index * 70}ms` }}>
      <span className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl transition-transform duration-500 group-hover:scale-125" aria-hidden />
      {Icon && <Icon className={cn("pointer-events-none absolute -bottom-3 -right-2 h-20 w-20 transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-6", dark ? "text-white/15" : "text-navy/10")} aria-hidden />}
      <div className="relative flex items-center gap-2">
        {Icon && <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", dark ? "bg-white/15" : "bg-navy/10")}><Icon className="h-4 w-4" aria-hidden /></span>}
        <span className={cn("text-sm font-semibold", dark ? "text-white/85" : "text-navy/80")}>{label}</span>
      </div>
      <div className="relative mt-3 font-display text-[2.1rem] font-extrabold leading-none tabular">{value}</div>
      {hint && <div className={cn("relative mt-2 text-xs", dark ? "text-white/75" : "text-navy/70")}>{hint}</div>}
    </section>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full origin-left animate-grow-x rounded-full bg-gradient-to-r from-brand to-brand-400" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function DefinitionList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{k}</dt>
          <dd className="mt-0.5 whitespace-pre-line text-sm text-navy">{v || <span className="text-slate-400"><T k="ui.notProvided" /></span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="animate-fade-up overflow-x-auto rounded-3xl border border-white bg-white/90 shadow-soft ring-1 ring-line/70">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="bg-gradient-to-r from-brand-50/70 via-canvas to-white">
          <tr>{head.map((h) => <th key={h} scope="col" className="whitespace-nowrap px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[.08em] text-brand-deep/80">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cn("px-4 py-3 align-top text-navy", className)}>{children}</td>;
