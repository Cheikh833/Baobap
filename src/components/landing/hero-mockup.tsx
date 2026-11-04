import { CheckCircle2, FolderKanban, LayoutDashboard, Target, Wallet } from "lucide-react";
import type { Messages } from "@/i18n/messages/fr";

/**
 * Aperçu animé du produit dans le hero. C'est une ILLUSTRATION de l'interface (mention visible),
 * pas des données d'organisations réelles : aucune valeur n'est présentée comme un résultat.
 */
export function HeroMockup({ m }: { m: Messages }) {
  const L = m.landing;
  const bars = [62, 84, 48, 92, 71, 58, 88];
  return (
    <div className="relative mx-auto w-full max-w-xl" aria-hidden>
      {/* halo */}
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-brand-400/30 via-transparent to-ochre/30 blur-2xl" />

      <div className="relative animate-[pop-in_.8s_cubic-bezier(.2,.7,.2,1)_.15s_both] overflow-hidden rounded-2xl border border-white/15 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur">
        {/* barre de fenêtre */}
        <div className="flex items-center gap-1.5 border-b border-line bg-canvas/80 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <span className="ml-3 h-5 flex-1 rounded-md bg-white text-[10px] leading-5 text-slate-400">&nbsp;&nbsp;baobab · {L.mockToday}</span>
        </div>
        <div className="flex">
          {/* mini barre latérale */}
          <div className="hidden w-12 flex-col items-center gap-3 bg-gradient-to-b from-brand-deep to-navy py-4 text-white/70 sm:flex">
            <span className="h-6 w-6 rounded-md bg-brand" />
            <LayoutDashboard className="h-4 w-4 text-ochre" /><Target className="h-4 w-4" /><FolderKanban className="h-4 w-4" /><Wallet className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-3 p-4 text-navy">
            <div className="grid grid-cols-3 gap-2">
              {[
                [L.mockProjects, "24", "from-brand to-brand-400"],
                [L.mockCoverage, "78 %", "from-navy to-[#1E4A6E]"],
                [L.mockBudget, "1,2 Md", "from-ochre to-[#F0C06E]"],
              ].map(([k, v, g], i) => (
                <div key={k} className="animate-[pop-in_.6s_both] rounded-xl border border-line p-2.5" style={{ animationDelay: `${300 + i * 120}ms` }}>
                  <span className={`mb-1.5 block h-1.5 w-8 rounded-full bg-gradient-to-r ${g}`} />
                  <p className="truncate text-[10px] text-slate-500">{k}</p>
                  <p className="font-display text-base font-bold">{v}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-3 rounded-xl border border-line p-3">
                <div className="flex h-24 items-end gap-1.5">
                  {bars.map((h, i) => (
                    <span key={i} className="flex-1 origin-bottom animate-grow-y rounded-t-md bg-gradient-to-t from-brand to-brand-300" style={{ height: `${h}%`, animationDelay: `${500 + i * 80}ms` }} />
                  ))}
                </div>
              </div>
              <div className="col-span-2 flex items-center justify-center rounded-xl border border-line p-2">
                <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#E4EAE7" strokeWidth="10" />
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#087F68" strokeWidth="10" strokeLinecap="round" strokeDasharray="188.5" className="animate-draw" style={{ ["--dash" as string]: 188.5, ["--dash-to" as string]: 41, strokeDashoffset: 41, animationDelay: "700ms" }} />
                  <circle cx="40" cy="40" r="18" fill="none" stroke="#E3A13B" strokeWidth="6" strokeLinecap="round" strokeDasharray="113" className="animate-draw" style={{ ["--dash" as string]: 113, ["--dash-to" as string]: 45, strokeDashoffset: 45, animationDelay: "900ms" }} />
                </svg>
              </div>
            </div>
            <div className="space-y-2 rounded-xl border border-line p-3">
              {[78, 54, 91].map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="h-2 w-16 rounded bg-slate-200" />
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full origin-left animate-grow-x rounded-full bg-gradient-to-r from-brand to-brand-400" style={{ width: `${w}%`, animationDelay: `${900 + i * 150}ms` }} /></span>
                </div>
              ))}
            </div>
            <p className="text-right text-[9px] text-slate-400">{L.illustration}</p>
          </div>
        </div>
      </div>

      {/* cartes flottantes */}
      {[
        [L.mockFloat1, "-left-4 bottom-20 sm:-left-12", "0s", "text-brand"],
        [L.mockFloat2, "-right-4 top-6 sm:-right-10", "-2s", "text-ochre-600"],
        [L.mockFloat3, "-bottom-5 right-10", "-4s", "text-navy"],
      ].map(([t, pos, delay, color]) => (
        <div key={t} className={`absolute ${pos} animate-float`} style={{ animationDelay: delay }}>
          <div className="flex animate-[pop-in_.6s_1.1s_both] items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-navy shadow-lift">
            <CheckCircle2 className={`h-4 w-4 ${color}`} />{t}
          </div>
        </div>
      ))}
    </div>
  );
}
