import { Badge } from "@/components/ui/display";
import { STATUS_LABELS } from "@/lib/labels";

export function StatusBadge({ status }: { status: string }) {
  const [label, tone] = STATUS_LABELS[status] ?? [status, "neutral"];
  return <Badge tone={tone}>{label}</Badge>;
}
