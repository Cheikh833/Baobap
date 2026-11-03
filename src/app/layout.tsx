import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getMessages } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";

const description = "Plateforme de pilotage des projets et programmes pour les ONG et institutions : suivi-évaluation, portefeuilles, programmes, projets. Essai gratuit 30 jours.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "BAOBAB — Planifier. Exécuter. Impacter.", template: "%s · BAOBAB" },
  description,
  applicationName: "BAOBAB",
  keywords: ["gestion de projet", "suivi-évaluation", "MEAL", "ONG", "cadre logique", "portefeuille", "programme", "Sénégal", "Afrique"],
  openGraph: { type: "website", siteName: "BAOBAB", title: "BAOBAB — Gérez vos projets. Maximisez votre impact.", description, locale: "fr_SN" },
  twitter: { card: "summary_large_image", title: "BAOBAB — Gérez vos projets. Maximisez votre impact.", description },
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
