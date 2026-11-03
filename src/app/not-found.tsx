import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";
import { getMessages } from "@/i18n/server";

export default async function NotFound() {
  const { m } = await getMessages();
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <EmptyState icon={SearchX} title={m.states.notFoundTitle} description={m.states.notFoundText} action={<ButtonLink href="/dashboard">{m.states.backDashboard}</ButtonLink>} />
    </div>
  );
}
