import { Badge } from "@/components/ui/display";
import { STATUS_LABELS } from "@/lib/labels";
import { T } from "@/i18n/T";

export function StatusBadge({ status }: { status: string }) {
  const [, tone] = STATUS_LABELS[status] ?? [status, "neutral"];
  return <Badge tone={tone}>{STATUS_LABELS[status] ? <T k={`status.${status}`} /> : status}</Badge>;
}
