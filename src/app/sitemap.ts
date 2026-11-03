import type { MetadataRoute } from "next";

const BASE = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/pricing", "/signup", "/legal/terms", "/legal/privacy", "/legal/notice"].map((p) => ({
    url: `${BASE}${p}`,
    changeFrequency: p === "/" || p === "/pricing" ? "weekly" : "yearly",
    priority: p === "/" ? 1 : p === "/pricing" ? 0.8 : 0.4,
  }));
}
