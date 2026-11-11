import QRCode from "qrcode";
import { CheckCircle2 } from "lucide-react";
import { headers } from "next/headers";
import { Logo } from "@/components/logo";
import { PrintButton } from "@/components/studio/print-button";
import { getMessages } from "@/i18n/server";

export const metadata = { title: "Affiche de stand", robots: { index: false } };

/** Affiche A4 pour les foires et salons : le QR code ouvre directement la démo en direct. */
export default async function SalonPoster() {
  const { m } = await getMessages();
  const G = m.guest;
  const h = await headers();
  const base = (process.env.APP_URL?.trim().replace(/\/$/, "") || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`);
  const target = `${base}/demo`;
  const svg = await QRCode.toString(target, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#073B3A", light: "#FFFFFF" } });
  return (
    <>
      <style>{"@page { size: A4; margin: 0; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }"}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <p className="text-sm text-slate-600">{G.posterHint}</p>
        <PrintButton label={G.posterPrint} />
      </div>
      <article className="relative mx-auto flex aspect-[210/297] w-full max-w-[210mm] flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_115%,#0F5A50_0%,#0B2E3A_50%,#081B28_100%)] p-[10%] text-white shadow-lift print:shadow-none">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-400/30 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-ochre/25 blur-3xl" aria-hidden />
        <div className="relative"><Logo light /></div>
        <p className="relative mt-[8%] text-[clamp(14px,2.2vw,18px)] font-semibold uppercase tracking-[.25em] text-ochre">{m.landing.tagline}</p>
        <h1 className="relative mt-3 font-display text-[clamp(30px,6vw,54px)] font-extrabold leading-[1.05] tracking-tight">{G.posterTitle}</h1>
        <ul className="relative mt-[6%] space-y-3 text-[clamp(14px,2.3vw,20px)]">
          {G.posterPoints.map((p) => <li key={p} className="flex items-center gap-3"><CheckCircle2 className="h-6 w-6 shrink-0 text-brand-300" />{p}</li>)}
        </ul>
        <div className="relative mt-auto flex items-end justify-between gap-6">
          <div>
            <p className="font-display text-[clamp(18px,3.4vw,30px)] font-bold text-ochre">{G.posterScan} →</p>
            <p className="mt-2 break-all text-[clamp(11px,1.6vw,14px)] text-white/70">{target.replace(/^https?:\/\//, "")}</p>
          </div>
          <div className="w-[38%] shrink-0 rounded-3xl bg-white p-3 shadow-2xl [&_svg]:h-auto [&_svg]:w-full" aria-label={target} dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      </article>
    </>
  );
}
