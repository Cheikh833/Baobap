import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/display";
import { getMessages } from "@/i18n/server";

export async function Forbidden() {
  const { m } = await getMessages();
  return <EmptyState icon={ShieldAlert} title={m.states.forbiddenTitle} description={m.states.forbiddenText} />;
}
