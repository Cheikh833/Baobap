import { ImageResponse } from "next/og";
import { LOGO_TREE } from "@/components/logo";

// Icônes PNG de l'application installable (192 et 512 px), dessinées à partir du logo.
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const s = (await params).size === "512" ? 512 : 192;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #16BC95 0%, #087F68 55%, #05333A 100%)" }}>
        <svg width={s * 0.78} height={s * 0.78} viewBox="0 0 64 64">
          <circle cx="32" cy="30" r="17" fill="#F6C66B" />
          <path d={LOGO_TREE} fill="#052A30" />
        </svg>
      </div>
    ),
    { width: s, height: s, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
