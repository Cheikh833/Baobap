import type { MetadataRoute } from "next";

// Application installable (écran d'accueil du téléphone, ordinateur).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BAOBAB — Pilotage de projets et d'impact",
    short_name: "BAOBAB",
    description: "Stratégie, projets, suivi-évaluation, finances, risques, rapports et IA pour les organisations à impact.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#081B28",
    theme_color: "#087F68",
    lang: "fr",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
