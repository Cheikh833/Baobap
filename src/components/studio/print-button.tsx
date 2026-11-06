"use client";
import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-glow hover:bg-brand-deep print:hidden">
      <Printer className="h-4 w-4" />{label}
    </button>
  );
}
