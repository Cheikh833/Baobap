import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "BAOBAB — Planifier. Exécuter. Impacter.", template: "%s · BAOBAB" },
  description: "Plateforme intelligente de pilotage des organisations, portefeuilles, programmes, projets et impacts.",
};
export const viewport: Viewport = { themeColor: "#087F68", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans">{children}</body>
    </html>
  );
}
