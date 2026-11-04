import { Badge, type Tone } from "@/components/ui/display";
import { intlLocale } from "@/lib/metrics";
import type { Messages } from "@/i18n/messages/fr";

export type Track = "good" | "watch" | "critical" | "unknown";
const TRACK_TONE: Record<Track, Tone> = { good: "success", watch: "warning", critical: "danger", unknown: "neutral" };
export const TRACK_COLOR: Record<Track, string> = { good: "#16A34A", watch: "#D97706", critical: "#DC2626", unknown: "#CBD5E1" };

export const TrackBadge = ({ status, m }: { status: Track; m: Messages }) => <Badge tone={TRACK_TONE[status]}>{m.meal.track[status]}</Badge>;

export const numFmt = (locale: string) => {
  const f = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 2 });
  return (n: number | null | undefined) => (n === null || n === undefined ? "—" : f.format(n).replace(/ /g, " "));
};

/** Jauge du taux d'atteinte, avec repère du taux attendu à date. */
export function RateMeter({ rate, expected, status, label }: { rate: number | null; expected: number | null; status: Track; label: string }) {
  const v = rate === null ? 0 : Math.max(0, Math.min(100, rate));
  return (
    <div className="relative h-2 rounded-full bg-slate-100" role="progressbar" aria-valuenow={rate ?? undefined} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full origin-left animate-grow-x rounded-full" style={{ width: `${v}%`, background: TRACK_COLOR[status] }} />
      {expected !== null && <span className="absolute -top-1 h-4 w-0.5 rounded bg-navy/70" style={{ left: `${expected}%` }} aria-hidden />}
    </div>
  );
}
