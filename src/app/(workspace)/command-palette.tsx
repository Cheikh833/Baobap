"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search, X } from "lucide-react";
import { NAV } from "./nav";
import { useI18n } from "@/i18n/client";
import { cn } from "@/components/ui/cn";

type Hit = { group: string; title: string; subtitle?: string; href: string };

/** Recherche globale : Ctrl+K (ou ⌘K), navigation au clavier, résultats filtrés par les droits côté serveur. */
export function CommandPalette({ allowed }: { allowed: string[] }) {
  const { m } = useI18n();
  const S = m.search;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("baobab:search", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("baobab:search", onOpen); };
  }, []);
  useEffect(() => { if (open) { setTimeout(() => input.current?.focus(), 10); } else { setQ(""); setHits([]); } }, [open]);

  // Pages de l'application correspondant à la saisie (selon les droits).
  const pages = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return NAV.flatMap((g) => g.items).filter((i) => !i.phase && (!i.permission || allowed.includes(i.permission)))
      .filter((i) => m.nav[i.label].toLowerCase().includes(t)).map((i) => ({ group: "pages", title: m.nav[i.label], href: i.href }));
  }, [q, allowed, m]);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setHits([]); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(t)}`, { signal: ctrl.signal });
        if (r.ok) setHits((await r.json()).hits);
      } catch { /* requête annulée */ } finally { setLoading(false); }
    }, 180);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [q]);

  const all = [...pages, ...hits];
  useEffect(() => setActive(0), [q, hits.length]);
  const go = (h: Hit) => { setOpen(false); router.push(h.href); };
  if (!open) return null;
  let index = -1;
  const groups = [...new Set(all.map((h) => h.group))];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-navy/50 p-4 pt-[10vh] backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-label={S.title} onClick={() => setOpen(false)}>
      <div className="w-full max-w-2xl animate-pop-in overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-line" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className={cn("h-5 w-5 shrink-0", loading ? "animate-pulse text-brand" : "text-slate-400")} aria-hidden />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={S.placeholder} aria-label={S.placeholder}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, all.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter" && all[active]) { e.preventDefault(); go(all[active]); }
            }}
            className="h-14 min-w-0 flex-1 border-0 bg-transparent text-base focus:outline-none focus:ring-0" />
          <button onClick={() => setOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-canvas" aria-label={S.close}><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {q.trim().length < 2 && !pages.length ? <p className="px-3 py-6 text-center text-sm text-slate-500">{S.hint}</p>
            : all.length === 0 && !loading ? <p className="px-3 py-6 text-center text-sm text-slate-500">{S.none}</p>
            : groups.map((g) => (
              <div key={g} className="mb-2">
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{S.groups[g as keyof typeof S.groups] ?? g}</p>
                {all.filter((h) => h.group === g).map((h) => {
                  index++;
                  const i = index;
                  return (
                    <button key={h.href + h.title} onMouseEnter={() => setActive(i)} onClick={() => go(h)}
                      className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left", active === i ? "bg-brand-50 text-brand-deep" : "hover:bg-canvas")}>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{h.title}</span>{h.subtitle && <span className="block truncate text-xs text-slate-500">{h.subtitle}</span>}</span>
                      {active === i && <CornerDownLeft className="h-4 w-4 shrink-0 text-brand" aria-hidden />}
                    </button>
                  );
                })}
              </div>
            ))}
        </div>
        <p className="border-t border-line bg-canvas px-4 py-2 text-[11px] text-slate-500">{S.footer}</p>
      </div>
    </div>
  );
}
