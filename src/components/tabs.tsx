"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui/cn";

export function TabNav({ tabs }: { tabs: { href: string; label: string; exact?: boolean }[] }) {
  const path = usePathname();
  return (
    <nav className="-mx-4 mb-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" aria-label="Sections">
      <ul className="flex gap-1">
        {tabs.map((t) => {
          const active = t.exact ? path === t.href : path === t.href || path.startsWith(t.href + "/");
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={active ? "page" : undefined} className={cn("block whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium", active ? "border-brand text-brand-deep" : "border-transparent text-slate-600 hover:text-navy")}>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
