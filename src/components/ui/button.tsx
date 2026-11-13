import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "./cn";

const variants = {
  primary: "bg-gradient-to-r from-[#0C9478] to-[#16BC95] text-white shadow-[0_8px_20px_-8px_rgba(8,127,104,.75)] hover:-translate-y-0.5 hover:from-brand-deep hover:to-brand hover:shadow-glow disabled:from-brand/50 disabled:to-brand/50 disabled:shadow-none",
  secondary: "border border-line bg-white text-navy shadow-sm hover:border-brand/40 hover:bg-brand-50/40 disabled:text-slate-400",
  ghost: "text-navy hover:bg-brand-50",
  danger: "bg-danger text-white hover:bg-red-700 disabled:bg-danger/50",
};
const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };

type Common = { variant?: keyof typeof variants; size?: keyof typeof sizes };
const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 active:scale-[.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed";

export function Button({ variant = "primary", size = "md", className, ...p }: Common & ComponentProps<"button">) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...p} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...p }: Common & ComponentProps<typeof Link>) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...p} />;
}
