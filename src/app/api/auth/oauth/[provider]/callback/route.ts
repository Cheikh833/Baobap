import type { NextRequest } from "next/server";
import { finishOAuth } from "@/server/auth/oauth-flow";

// Retour du fournisseur : GET (Google) ou POST form_post (Apple). Le « state » protège contre la falsification.
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  return finishOAuth(req, (await params).provider, req.nextUrl.searchParams);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const form = await req.formData();
  const sp = new URLSearchParams();
  for (const [k, v] of form.entries()) if (typeof v === "string") sp.set(k, v);
  return finishOAuth(req, (await params).provider, sp);
}
