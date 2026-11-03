import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "./cn";

const variants = {
  primary: "bg-brand text-white hover:bg-brand-deep disabled:bg-brand/50",
  secondary: "border border-line bg-white text-navy hover:bg-canvas disabled:text-slate-400",
  ghost: "text-navy hover:bg-brand-50",
  danger: "bg-danger text-white hover:bg-red-700 disabled:bg-danger/50",
};
const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };

type Common = { variant?: keyof typeof variants; size?: keyof typeof sizes };
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed";

export function Button({ variant = "primary", size = "md", className, ...p }: Common & ComponentProps<"button">) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...p} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...p }: Common & ComponentProps<typeof Link>) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...p} />;
}
