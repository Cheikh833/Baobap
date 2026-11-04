import { Sparkles } from "lucide-react";
import { requireTenant } from "@/server/context";
import { db } from "@/server/db";
import { hasDemo } from "@/server/services/demo";
import { Card } from "@/components/ui/display";
import { ActionForm } from "@/components/forms/action-form";
import { getMessages } from "@/i18n/server";
import { openDemoAction } from "../../demo-actions";

/** Proposé quand l'organisation est vide ; masqué si l'on est déjà dans la démo. */
export async function DemoCard() {
  const ctx = await requireTenant();
  const [{ m }, org, exists] = await Promise.all([
    getMessages(),
    db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId }, select: { isDemo: true } }),
    hasDemo(ctx.userId),
  ]);
  if (org.isDemo) return null;
  return (
    <Card className="relative overflow-hidden border-ochre/30 bg-gradient-to-br from-white to-ochre-50">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-ochre/20 blur-2xl" aria-hidden />
      <h2 className="relative flex items-center gap-2 font-display font-semibold"><Sparkles className="h-4 w-4 text-ochre" aria-hidden />{m.demo.title}</h2>
      <p className="relative mt-1 text-sm text-slate-600">{m.demo.text}</p>
      <div className="relative mt-4"><ActionForm action={openDemoAction} submitLabel={exists ? m.demo.open : m.demo.create} submitVariant="secondary" className="space-y-2" /></div>
    </Card>
  );
}
