import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8" aria-label="Retour à l'accueil"><Logo /></Link>
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">{children}</div>
    </div>
  );
}
