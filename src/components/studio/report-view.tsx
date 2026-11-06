import type { DocBlock } from "@/lib/office";
import { cn } from "@/components/ui/cn";

/** Rendu « papier » d'un rapport (aperçu et impression). */
export function ReportView({ blocks, animated = true }: { blocks: DocBlock[]; animated?: boolean }) {
  return (
    <article className="report-paper mx-auto max-w-[210mm] rounded-2xl bg-white px-6 py-8 shadow-lift ring-1 ring-line sm:px-12 sm:py-12 print:max-w-none print:rounded-none print:p-0 print:shadow-none print:ring-0">
      <div className="mb-6 flex items-center gap-2 border-b-2 border-brand pb-3 text-xs font-bold uppercase tracking-[.2em] text-brand-deep">
        <span className="inline-block h-2 w-2 rounded-full bg-ochre" aria-hidden />BAOBAB
      </div>
      {blocks.map((b, i) => {
        const style = animated ? { animationDelay: `${Math.min(i, 20) * 45}ms` } : undefined;
        const anim = animated ? "animate-fade-up" : "";
        if (b.kind === "title") return <h1 key={i} className={cn("font-display text-3xl font-bold leading-tight text-navy", anim)} style={style}>{b.text}</h1>;
        if (b.kind === "heading") return <h2 key={i} className={cn("mt-7 break-after-avoid border-l-4 border-brand pl-3 font-display text-lg font-semibold text-brand-deep", anim)} style={style}>{b.text}</h2>;
        if (b.kind === "paragraph") return <p key={i} className={cn("mt-2 whitespace-pre-line", b.muted ? "text-xs text-slate-500" : "text-[14.5px] leading-relaxed text-slate-800", anim)} style={style}>{b.text}</p>;
        const kv = b.head.every((h) => h === "");
        return (
          <div key={i} className={cn("mt-3 overflow-x-auto", anim)} style={style}>
            <table className="w-full break-inside-auto border-collapse text-[13px]">
              {!kv && <thead><tr>{b.head.map((h, j) => <th key={j} className="border border-line bg-brand-50 px-2 py-1.5 text-left font-semibold text-brand-deep">{h}</th>)}</tr></thead>}
              <tbody>
                {b.rows.map((r, j) => (
                  <tr key={j} className="break-inside-avoid odd:bg-white even:bg-canvas/60">
                    {r.map((c, k) => <td key={k} className={cn("border border-line px-2 py-1.5 align-top", kv && k === 0 && "w-2/5 font-medium text-slate-600")}>{c ?? ""}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </article>
  );
}
