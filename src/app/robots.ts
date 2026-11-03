import type { MetadataRoute } from "next";

const BASE = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Seules les pages publiques sont indexables ; l'espace de travail et l'API ne le sont pas.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/pricing", "/legal/"], disallow: ["/api/", "/dashboard", "/organization", "/portfolios", "/programs", "/projects", "/onboarding", "/invitation/", "/reset-password/"] }],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
