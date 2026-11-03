import Link from "next/link";
import { Check } from "lucide-react";
import { PROJECT_STEPS } from "@/lib/validation/schemas";
import { cn } from "./ui/cn";

export function WizardStepper({ current, reached, projectId }: { current: number; reached: number; projectId?: string }) {
  return (
    <ol className="mb-6 flex gap-1 overflow-x-auto pb-1" aria-label="Étapes de création">
      {PROJECT_STEPS.map((s) => {
        const done = s.n < reached && s.n !== current;
        const can = projectId && s.n <= reached;
        const body = (
          <span className={cn("flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium", s.n === current ? "border-brand bg-brand text-white" : done ? "border-brand/30 bg-brand-50 text-brand-deep" : "border-line bg-white text-slate-500")}>
            {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : <span>{s.n}</span>}
            {s.label}
          </span>
        );
        return (
          <li key={s.n} aria-current={s.n === current ? "step" : undefined}>
            {can && s.n !== current ? <Link href={`/projects/new/${projectId}/${s.n}`}>{body}</Link> : body}
          </li>
        );
      })}
    </ol>
  );
}
