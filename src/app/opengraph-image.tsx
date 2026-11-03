import { ImageResponse } from "next/og";

// Image d'aperçu lors du partage d'un lien (WhatsApp, LinkedIn, Facebook…).
export const alt = "BAOBAB — Gérez vos projets. Maximisez votre impact.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg, #073B3A 0%, #0B5B55 50%, #102A43 100%)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, background: "#087F68", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, fontWeight: 700 }}>B</div>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: 8 }}>BAOBAB</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>Gérez vos projets.</div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>Maximisez votre impact.</div>
        <div style={{ marginTop: 32, fontSize: 28, color: "#A7F3D0" }}>Suivi-évaluation · Portefeuilles · Programmes · Projets — essai gratuit 30 jours</div>
      </div>
    ),
    size,
  );
}
