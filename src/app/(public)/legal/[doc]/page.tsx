import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { legalDocs, type LegalKey } from "@/content/legal";
import { getMessages } from "@/i18n/server";
import { formatDate } from "@/lib/metrics";

const KEYS: LegalKey[] = ["terms", "privacy", "notice"];

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!KEYS.includes(doc as LegalKey)) notFound();
  const { m, locale } = await getMessages();
  const docs = legalDocs(locale);
  const d = docs[doc as LegalKey];
  return (
    <div className="bg-white">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <nav className="mb-6 flex flex-wrap gap-3 text-sm" aria-label="legal">
          {KEYS.map((k) => <Link key={k} href={`/legal/${k}`} aria-current={k === doc ? "page" : undefined} className={k === doc ? "font-semibold text-brand-deep" : "text-slate-600 hover:text-brand"}>{docs[k].title}</Link>)}
        </nav>
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{m.legal.draftNotice}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{d.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{m.legal.updated} {formatDate(new Date(d.updated), locale)}</p>
        <div className="mt-8 space-y-6">
          {d.sections.map(([h, ps]) => (
            <section key={h}>
              <h2 className="text-lg font-semibold">{h}</h2>
              {ps.map((p) => <p key={p} className="mt-2 text-sm leading-relaxed text-slate-700">{p}</p>)}
            </section>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
