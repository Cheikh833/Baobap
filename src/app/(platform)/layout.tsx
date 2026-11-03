import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/context";
import { isPlatformAdmin } from "@/server/services/mobile-payments";
import { Logo } from "@/components/logo";
import { getMessages } from "@/i18n/server";

// Espace réservé à l'équipe BAOBAB (emails listés dans PLATFORM_ADMIN_EMAILS). Pour les autres : 404.
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) notFound();
  const { m } = await getMessages();
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/admin"><Logo /></Link>
          <Link href="/dashboard" className="text-sm font-medium text-brand hover:underline">{m.states.backDashboard}</Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
