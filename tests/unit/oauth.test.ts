import { describe, expect, it } from "vitest";
import { createHash, createPublicKey, createSign, createVerify, generateKeyPairSync } from "node:crypto";
import { appleClientSecret, authorizeUrl, pkceChallenge, verifyIdToken } from "@/server/auth/oauth";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1", alg: "RS256", use: "sig" };
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const sign = (claims: Record<string, unknown>, kid = "k1", key = privateKey) => {
  const h = b64({ alg: "RS256", kid }), p = b64(claims);
  return `${h}.${p}.${createSign("RSA-SHA256").update(`${h}.${p}`).sign(key).toString("base64url")}`;
};
let calls = 0;
const fetcher = (async () => { calls++; return new Response(JSON.stringify({ keys: [jwk] })); }) as unknown as typeof fetch;
const now = Date.UTC(2026, 10, 5);
const good = { iss: "https://accounts.google.com", aud: "client-123", sub: "g-1", email: "awa@example.org", email_verified: true, nonce: "n1", exp: now / 1000 + 600 };
const opts = (url: string, extra = {}) => ({ jwksUrl: url, issuer: ["https://accounts.google.com", "accounts.google.com"], audience: "client-123", nonce: "n1", now, fetcher, ...extra });

describe("jeton d'identité OpenID Connect", () => {
  it("accepte un jeton valide et met les clés en cache", async () => {
    calls = 0;
    expect((await verifyIdToken(sign(good), opts("https://jwks.test/a"))).sub).toBe("g-1");
    await verifyIdToken(sign(good), opts("https://jwks.test/a"));
    expect(calls).toBe(1);
  });
  it("refuse signature falsifiée, autre clé, audience, émetteur, nonce, expiration, algorithme", async () => {
    const t = sign(good);
    const [h, , s] = t.split(".");
    const forged = `${h}.${b64({ ...good, email: "pirate@example.org" })}.${s}`;
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
    const bad = [
      forged, sign(good, "k1", other), sign({ ...good, aud: "autre" }), sign({ ...good, iss: "https://evil.example" }),
      sign({ ...good, nonce: "n2" }), sign({ ...good, exp: now / 1000 - 3600 }), sign(good, "inconnue"),
      `${b64({ alg: "none", kid: "k1" })}.${b64(good)}.`,
    ];
    for (const tok of bad) await expect(verifyIdToken(tok, opts("https://jwks.test/b"))).rejects.toThrow(/OAuth/);
  });
  it("recharge les clés en cas de rotation (kid inconnu)", async () => {
    let keys: unknown[] = [];
    const f = (async () => new Response(JSON.stringify({ keys }))) as unknown as typeof fetch;
    await expect(verifyIdToken(sign(good), { ...opts("https://jwks.test/c"), fetcher: f })).rejects.toThrow();
    keys = [jwk];
    expect((await verifyIdToken(sign(good), { ...opts("https://jwks.test/c"), fetcher: f })).email).toBe("awa@example.org");
  });
});

describe("PKCE et secret Apple", () => {
  it("défi PKCE S256 et URL d'autorisation", () => {
    const v = "verificateur-de-test";
    expect(pkceChallenge(v)).toBe(createHash("sha256").update(v).digest("base64url"));
    const u = new URL(authorizeUrl({ id: "apple", authorizeUrl: "https://appleid.apple.com/auth/authorize", tokenUrl: "", jwksUrl: "", issuer: "", clientId: "sn.baobab.web", scope: "name email", responseMode: "form_post", clientSecret: () => "" }, "https://app/cb", "st", "no", v));
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ client_id: "sn.baobab.web", response_type: "code", state: "st", nonce: "no", code_challenge_method: "S256", response_mode: "form_post", redirect_uri: "https://app/cb" });
  });
  it("secret client Apple signé ES256", () => {
    const k = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const jwt = appleClientSecret("TEAM", "sn.baobab.web", "KEY1", k.privateKey.export({ format: "pem", type: "pkcs8" }).toString(), now);
    const [h, p, s] = jwt.split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({ alg: "ES256", kid: "KEY1" });
    expect(JSON.parse(Buffer.from(p, "base64url").toString())).toMatchObject({ iss: "TEAM", sub: "sn.baobab.web", aud: "https://appleid.apple.com" });
    expect(createVerify("SHA256").update(`${h}.${p}`).verify({ key: k.publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"))).toBe(true);
  });
});

import { normalizeClaims } from "@/server/auth/oauth";
describe("Microsoft", () => {
  const msUrl = "https://jwks.test/ms";
  const ms = { iss: "https://login.microsoftonline.com/tenant-a/v2.0", tid: "tenant-a", aud: "client-123", sub: "m-1", email: "a@contoso.example", nonce: "n1", exp: now / 1000 + 600 };
  const o = { ...opts(msUrl), issuer: "https://login.microsoftonline.com/{tid}/v2.0" };
  it("émetteur propre au locataire du compte", async () => {
    expect((await verifyIdToken(sign(ms), o)).sub).toBe("m-1");
    await expect(verifyIdToken(sign({ ...ms, iss: "https://login.microsoftonline.com/autre/v2.0" }), o)).rejects.toThrow(/OAuth/);
    await expect(verifyIdToken(sign({ ...ms, tid: undefined }), o)).rejects.toThrow(/OAuth/);
  });
  it("email retenu seulement s'il est garanti (compte personnel ou domaine vérifié)", () => {
    expect(normalizeClaims("microsoft", ms).email_verified).toBe(false);
    expect(normalizeClaims("microsoft", { ...ms, xms_edov: true }).email_verified).toBe(true);
    expect(normalizeClaims("microsoft", { ...ms, tid: "9188040d-6c67-4c5b-b112-36a304b66dad" }).email_verified).toBe(true);
    expect(normalizeClaims("google", { sub: "g", email_verified: false }).email_verified).toBe(false);
  });
});
