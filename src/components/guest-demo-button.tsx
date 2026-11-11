import { Play } from "lucide-react";
import { cn } from "@/components/ui/cn";

/** Bouton « Voir la démo en direct » : formulaire POST natif (fonctionne sans JavaScript). */
export function GuestDemoButton({ label, hint, className, dark = false }: { label: string; hint?: string; className?: string; dark?: boolean }) {
  return (
    <form action="/api/demo/visit" method="post" className={cn("inline-flex flex-col items-start gap-1", className)}>
      <button type="submit" className={cn("group inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold shadow-lift transition hover:-translate-y-0.5", dark ? "bg-ochre text-navy hover:shadow-[0_0_40px_4px_rgba(246,198,107,.45)]" : "bg-gradient-to-r from-brand to-brand-400 text-white hover:brightness-110")}>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-full transition group-hover:scale-110", dark ? "bg-navy text-ochre" : "bg-white/20")}><Play className="h-3.5 w-3.5 fill-current" /></span>
        {label}
      </button>
      {hint && <span className={cn("pl-2 text-xs", dark ? "text-white/70" : "text-slate-500")}>{hint}</span>}
    </form>
  );
}
