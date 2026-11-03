// Logo BAOBAB : silhouette géométrique d'un baobab (tronc + houppier), sans folklore.
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#087F68" />
      <path d="M7 12c0-3 3.5-5 9-5s9 2 9 5c0 2-2 3-4 3h-1.5l-.5 10h-6l-.5-10H11c-2 0-4-1-4-3Z" fill="#fff" />
      <path d="M13 15l3 3 3-3" stroke="#087F68" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className={`text-lg font-bold tracking-[0.12em] ${light ? "text-white" : "text-navy"}`}>BAOBAB</span>
    </span>
  );
}
