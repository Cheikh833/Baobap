import { ImageResponse } from "next/og";

// Icônes PNG de l'application installable (192 et 512 px), dessinées à partir du logo.
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const s = (await params).size === "512" ? 512 : 192;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #087F68 0%, #073B3A 100%)" }}>
        <svg width={s * 0.62} height={s * 0.62} viewBox="0 0 32 32">
          <path d="M7 12c0-3 3.5-5 9-5s9 2 9 5c0 2-2 3-4 3h-1.5l-.5 10h-6l-.5-10H11c-2 0-4-1-4-3Z" fill="#fff" />
          <path d="M13 15l3 3 3-3" stroke="#087F68" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: s, height: s, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
