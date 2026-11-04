import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

const control =
  "block w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-navy shadow-sm transition placeholder:text-slate-400 hover:border-brand/30 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:bg-canvas aria-[invalid=true]:border-danger";

export function Field({ label, name, error, hint, required, children }: { label: string; name: string; error?: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-navy">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
      </label>
      {children}
      {hint && !error && <p id={`${name}-hint`} className="text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${name}-error`} className="text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}

type Ctl = { error?: string };
const aria = (name: string | undefined, error?: string) => ({
  id: name,
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `${name}-error` : undefined,
});

export function Input({ className, error, ...p }: Ctl & ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...aria(p.name, error)} {...p} />;
}
export function Textarea({ className, error, ...p }: Ctl & ComponentProps<"textarea">) {
  return <textarea rows={4} className={cn(control, className)} {...aria(p.name, error)} {...p} />;
}
export function Select({ className, error, ...p }: Ctl & ComponentProps<"select">) {
  return <select className={cn(control, "h-10", className)} {...aria(p.name, error)} {...p} />;
}

export function FormMessage({ state }: { state: { ok: boolean; message?: string } | null }) {
  if (!state?.message) return null;
  return (
    <div role={state.ok ? "status" : "alert"} className={cn("rounded-lg border px-3 py-2 text-sm", state.ok ? "border-success/30 bg-green-50 text-green-800" : "border-danger/30 bg-red-50 text-red-800")}>
      {state.message}
    </div>
  );
}
