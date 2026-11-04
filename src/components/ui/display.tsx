import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";
import { T } from "@/i18n/T";

export function Card({ className, children, interactive }: { className?: string; children: ReactNode; interactive?: boolean }) {
  return (
    <section className={cn("min-w-0 animate-fade-up rounded-2xl border border-line/80 bg-white p-5 shadow-soft", interactive && "transition duration-300 hover:-translate-y-0.5 hover:shadow-lift", className)}>
      {children}
    </section>
  );
}

export function PageHeader({ title, description, actions, breadcrumb }: { title: string; description?: ReactNode; actions?: ReactNode; breadcrumb?: ReactNode }) {
  return (
    <div className="mb-7 flex animate-fade-up flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb && <nav aria-label="breadcrumb" className="mb-1.5 text-xs font-medium text-slate-500">{breadcrumb}</nav>}
        <h1 className="truncate font-display text-[1.7rem] font-bold leading-tight tracking-tight text-navy">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
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
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
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
  brand: "from-brand to-brand-400 text-white",
  navy: "from-navy to-[#1E4A6E] text-white",
  ochre: "from-ochre to-[#F0C06E] text-navy",
  teal: "from-[#0E9384] to-[#5FC4A8] text-white",
};
export function Stat({ label, value, hint, icon: Icon, tone = "brand", index = 0 }: { label: string; value: ReactNode; hint?: ReactNode; icon?: LucideIcon; tone?: keyof typeof statTones; index?: number }) {
  return (
    <section className="group min-w-0 animate-fade-up rounded-2xl border border-line/80 bg-white p-4 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-lift" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        {Icon && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm transition-transform duration-300 group-hover:scale-110", statTones[tone])}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      <div className="mt-1 font-display text-[1.65rem] font-bold leading-tight text-navy tabular">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
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
    <div className="animate-fade-up overflow-x-auto rounded-2xl border border-line/80 bg-white shadow-soft">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="bg-gradient-to-r from-canvas to-white">
          <tr>{head.map((h) => <th key={h} scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cn("px-4 py-3 align-top text-navy", className)}>{children}</td>;
