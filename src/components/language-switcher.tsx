"use client";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { LOCALES } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

/** Sélecteur de langue (formulaire natif → /api/locale, fonctionne aussi sans JavaScript). */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, m } = useI18n();
  const path = usePathname();
  return (
    <form method="post" action="/api/locale" className={`flex items-center gap-1.5 ${className}`}>
      <input type="hidden" name="next" value={path} />
      <Languages className="h-4 w-4 text-slate-500" aria-hidden />
      <label htmlFor="locale-select" className="sr-only">{m.common.language}</label>
      <select
        id="locale-select"
        name="locale"
        defaultValue={locale}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-8 rounded-md border border-line bg-white px-1.5 text-xs text-navy"
      >
        {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.name}{l.status === "beta" ? " (bêta)" : ""}</option>)}
      </select>
      <button className="sr-only focus:not-sr-only focus:text-xs">OK</button>
    </form>
  );
}
