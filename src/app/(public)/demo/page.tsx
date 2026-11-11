import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { GuestDemoButton } from "@/components/guest-demo-button";
import { getMessages } from "@/i18n/server";

export const metadata = { title: "Démo en direct", description: "Essayez BAOBAB en 3 secondes, sans inscription : un espace complet et fictif s'ouvre pour vous." };

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ limit?: string }> }) {
  const { m } = await getMessages();
  const G = m.guest;
  const limit = (await searchParams).limit;
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main className="relative isolate overflow-hidden bg-[radial-gradient(ellipse_at_50%_110%,#0F5A50_0%,#0B2E3A_45%,#081B28_100%)] px-4 py-20 text-white sm:py-28">
        <div className="mesh -z-10" aria-hidden>
          <span className="left-[5%] top-[10%] h-[45%] w-[40%] animate-drift bg-brand-400/35" />
          <span className="bottom-0 right-[5%] h-[45%] w-[40%] animate-drift bg-ochre/25 [animation-delay:-8s]" />
        </div>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="animate-word-in font-display text-4xl font-extrabold tracking-tight sm:text-6xl">{G.pageTitle}</h1>
          <p className="mx-auto mt-5 max-w-xl animate-fade-up text-lg text-white/80 [animation-delay:300ms]">{G.pageText}</p>
          {limit && <p role="alert" className="mx-auto mt-6 max-w-lg rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{G.limit}</p>}
          <div className="mt-10 flex animate-fade-up justify-center [animation-delay:500ms]"><GuestDemoButton label={G.start} dark /></div>
          <ul className="mx-auto mt-8 flex max-w-xl animate-fade-up flex-col items-center gap-2 text-sm text-white/80 [animation-delay:700ms]">
            {G.points.map((p) => <li key={p} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand-300" />{p}</li>)}
          </ul>
          <p className="mt-10 text-sm text-white/60">{G.or} <Link href="/signup?new=1" className="font-semibold text-white underline underline-offset-4 hover:text-ochre">{G.createAccount}</Link></p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
