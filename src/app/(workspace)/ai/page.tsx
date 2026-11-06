import Link from "next/link";
import { Plus, ShieldCheck, Sparkles } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { aiEnabled, aiQuota, getConversation, listConversations } from "@/server/services/ai";
import { Card, PageHeader } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { AskBox } from "@/components/ai/ask-box";
import { RichText } from "@/components/ai/rich-text";
import { cn } from "@/components/ui/cn";
import { formatDate } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { Forbidden } from "../forbidden";
import { orNotFound } from "../guard";
import { askAction, deleteChatAction } from "./actions";

export const metadata = { title: "BAOBAB AI" };
// Une question peut demander plusieurs appels d'outils : on laisse jusqu'à 60 s à la réponse.
export const maxDuration = 60;

export default async function AiPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "ai:view")) return <Forbidden />;
  const { c } = await searchParams;
  const [{ m, locale }, convs, quota] = await Promise.all([getMessages(), listConversations(ctx), aiQuota(ctx)]);
  const A = m.ai;
  const conv = c ? await orNotFound(getConversation(ctx, c)) : null;
  const enabled = aiEnabled();
  const initials = ctx.userName.split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  return (
    <>
      <PageHeader title={A.title} description={A.intro} />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-3 lg:order-none">
          <Link href="/ai" className="flex items-center justify-center gap-2 rounded-xl bg-navy px-3 py-2.5 text-sm font-semibold text-white shadow hover:bg-navy/90"><Plus className="h-4 w-4" />{A.newChat}</Link>
          <Card className="p-3">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{A.history}</p>
            {convs.length === 0 ? <p className="px-2 text-xs text-slate-500">{A.noHistory}</p> : (
              <ul className="max-h-[50vh] space-y-0.5 overflow-y-auto">
                {convs.map((x) => (
                  <li key={x.id}><Link href={`/ai?c=${x.id}`} className={cn("block truncate rounded-lg px-2 py-1.5 text-sm transition", x.id === c ? "bg-brand-50 font-semibold text-brand-deep" : "hover:bg-canvas")}>{x.title}<span className="block text-[10px] font-normal text-slate-400">{formatDate(x.updatedAt, locale)}</span></Link></li>
                ))}
              </ul>
            )}
          </Card>
          <p className="px-1 text-[11px] text-slate-500">{quota.limit === null ? fill(A.quotaUnlimited, { used: quota.used }) : fill(A.quota, { used: quota.used, limit: quota.limit })}</p>
        </aside>

        <section className="min-w-0 space-y-4">
          {!enabled && (
            <Card className="border-ochre/40 bg-amber-50/60">
              <p className="flex items-center gap-2 font-display font-semibold text-amber-900"><Sparkles className="h-4 w-4" />{A.disabledTitle}</p>
              <p className="mt-1 text-sm text-amber-900/80">{A.disabledText}</p>
            </Card>
          )}
          {!conv ? (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-[#0F3B4A] to-brand-deep p-6 text-white shadow-lift sm:p-10">
              <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 animate-drift rounded-full bg-brand-400/30 blur-3xl" aria-hidden />
              <div className="pointer-events-none absolute -bottom-24 left-10 h-60 w-60 animate-drift rounded-full bg-ochre/25 blur-3xl [animation-delay:-7s]" aria-hidden />
              <span className="relative flex h-14 w-14 animate-pop-in items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur"><Sparkles className="h-7 w-7 text-ochre" /></span>
              <h2 className="relative mt-4 font-display text-2xl font-bold sm:text-3xl">{fill(m.dashboard.hello, { name: ctx.userName.split(/\s+/)[0] })}</h2>
              <p className="relative mt-2 max-w-xl text-sm text-white/75">{A.intro}</p>
            </div>
          ) : (
            <Card className="space-y-5">
              {conv.messages.map((msg, i) => (
                <div key={msg.id} className={cn("flex animate-fade-up gap-3", msg.role === "user" && "flex-row-reverse")} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", msg.role === "user" ? "bg-ochre text-navy" : "bg-gradient-to-br from-brand to-brand-400 text-white")}>{msg.role === "user" ? initials : <Sparkles className="h-4 w-4" />}</span>
                  <div className={cn("min-w-0 max-w-[85%] rounded-2xl px-4 py-3", msg.role === "user" ? "bg-navy text-sm text-white" : "bg-canvas ring-1 ring-line")}>
                    {msg.role === "user" ? <p className="whitespace-pre-line">{msg.content}</p> : <RichText text={msg.content} />}
                    {msg.role === "assistant" && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                      <div className="mt-3 border-t border-line pt-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{A.sources}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">{(msg.sources as { label: string; href: string }[]).map((s) => <Link key={s.href} href={s.href} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand ring-1 ring-line hover:ring-brand">{s.label}</Link>)}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <span id="fin" />
            </Card>
          )}
          {enabled && <AskBox action={askAction.bind(null, conv?.id ?? null)} placeholder={A.placeholder} sendLabel={A.send} thinkingLabel={A.thinking} suggestions={conv ? undefined : A.suggestions} />}
          <p className="flex items-start gap-2 text-xs text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{A.charter}</p>
          {conv && <ActionForm action={deleteChatAction.bind(null, conv.id)} submitLabel={A.deleteChat} submitVariant="secondary" confirm={fill(m.ui.confirmDelete, { name: conv.title })} />}
        </section>
      </div>
    </>
  );
}
