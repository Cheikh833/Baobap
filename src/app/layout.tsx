import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getMessages } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";

export const metadata: Metadata = {
  title: { default: "BAOBAB — Planifier. Exécuter. Impacter.", template: "%s · BAOBAB" },
  description: "Plateforme intelligente de pilotage des organisations, portefeuilles, programmes, projets et impacts.",
};
export const viewport: Viewport = { themeColor: "#087F68", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, m, meta } = await getMessages();
  return (
    <html lang={locale} dir={meta.dir}>
      <body className="font-sans">
        <I18nProvider locale={locale} m={m}>{children}</I18nProvider>
      </body>
    </html>
  );
}
