"use client";
import { useRef } from "react";
import { Send, Sparkles } from "lucide-react";
import { useActionForm } from "@/components/forms/use-action-form";
import { FormMessage } from "@/components/ui/form";

type State = { ok: boolean; message?: string; errors?: Record<string, string>; data?: Record<string, string> } | null;

/** Zone de question : suggestions cliquables, envoi par Entrée (Maj+Entrée = nouvelle ligne), indicateur d'attente animé. */
export function AskBox({ action, placeholder, sendLabel, thinkingLabel, suggestions }: { action: (s: State, fd: FormData) => Promise<State>; placeholder: string; sendLabel: string; thinkingLabel: string; suggestions?: string[] }) {
  const { state, pending, onSubmit } = useActionForm(action);
  const ref = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <div className="space-y-3">
      {suggestions && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} type="button" disabled={pending} onClick={() => { if (ref.current) { ref.current.value = s; formRef.current?.requestSubmit(); } }}
              className="rounded-full border border-brand/20 bg-white px-3 py-1.5 text-xs font-medium text-brand-deep shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:bg-brand-50 disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
      )}
      <form ref={formRef} onSubmit={onSubmit} className="relative rounded-2xl border border-line bg-white p-2 shadow-lift focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        <FormMessage state={state} />
        <label className="sr-only" htmlFor="question">{placeholder}</label>
        <textarea id="question" ref={ref} name="question" rows={2} required maxLength={4000} placeholder={placeholder} disabled={pending}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); formRef.current?.requestSubmit(); } }}
          className="w-full resize-none border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-0" />
        <div className="flex items-center justify-between gap-2 px-1">
          {pending ? <span className="flex items-center gap-2 text-xs font-medium text-brand-deep"><Sparkles className="h-4 w-4 animate-spin [animation-duration:2.5s]" />{thinkingLabel}</span> : <span />}
          <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand to-brand-400 px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 disabled:opacity-60"><Send className="h-4 w-4" />{sendLabel}</button>
        </div>
      </form>
    </div>
  );
}
