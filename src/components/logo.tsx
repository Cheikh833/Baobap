// Logo BAOBAB : silhouette d'un baobab devant le soleil levant, sur fond émeraude.
// Lisible de 16 px (favicon) à l'affiche ; les mêmes tracés servent à l'icône du site et de l'application.
export const LOGO_TREE = "M22 54c-1-8 1.500-13 4.500-18.500 1-1.800 1.300-3.500 1.500-5.500C24 28 19.500 26.500 13 26c7-1.800 12-.5 15.500 2-1-5-3.500-9-8-12.500 6 1.500 9.500 5 11.500 10 2-5 5.500-8.500 11.500-10-4.500 3.500-7 7.500-8 12.500 3.500-2.500 8.500-3.800 15.500-2-6.500.5-11 2-15 4 .2 2 .5 3.700 1.500 5.500 3 5.500 5.500 10.500 4.500 18.500Z";

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="bb-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#16BC95" /><stop offset=".55" stopColor="#087F68" /><stop offset="1" stopColor="#05333A" /></linearGradient>
        <linearGradient id="bb-sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFD98A" /><stop offset="1" stopColor="#F2A93B" /></linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#bb-bg)" />
      <circle cx="32" cy="30" r="17" fill="url(#bb-sun)" />
      <path d={LOGO_TREE} fill="#052A30" />
    </svg>
  );
}

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark />
      <span className={`font-display text-[1.15rem] font-extrabold tracking-[0.16em] ${light ? "text-white" : "text-navy"}`}>BAOBAB</span>
    </span>
  );
}
