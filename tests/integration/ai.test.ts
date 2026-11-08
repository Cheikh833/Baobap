import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { ask, getConversation, listConversations } from "@/server/services/ai";
import { createProjectDraft } from "@/server/services/projects";
import { createBudgetLine } from "@/server/services/finance";
import { memberWithRole, ownerWithOrg, resetDb } from "./helpers";

const code = (e: unknown) => (e instanceof AppError ? e.code : String(e));
const expectCode = (p: Promise<unknown>, c: string) => expect(p.then(() => "OK", code)).resolves.toBe(c);

/** Faux client : rejoue une suite de réponses et enregistre les requêtes envoyées. */
function fakeClient(script: ((req: Record<string, any>) => Record<string, unknown>)[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const requests: Record<string, any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  let i = 0;
  const client = { beta: { messages: { create: async (req: Record<string, unknown>) => { requests.push(JSON.parse(JSON.stringify(req))); return { usage: { input_tokens: 100, output_tokens: 20 }, ...script[Math.min(i++, script.length - 1)](req) }; } } } };
  return { client: client as never, requests };
}
const toolUse = (name: string, input: Record<string, unknown> = {}) => () => ({ stop_reason: "tool_use", content: [{ type: "tool_use", id: `t-${name}`, name, input }] });
const final = (text: string) => () => ({ stop_reason: "end_turn", content: [{ type: "text", text }] });

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("BAOBAB AI", () => {
  it("boucle d'outils sur les données réelles, sources, historique et quota", async () => {
    const a = await ownerWithOrg("A");
    const p = await createProjectDraft(a.ctx, { name: "Cliniques", code: "P1" });
    await createBudgetLine(a.ctx, p.id, { code: "B1", label: "Ateliers", plannedAmount: "500000" });
    const { client, requests } = fakeClient([toolUse("project_details", { code: "p1" }), final("Le budget détaillé de **P1** est de 500 000 XOF.")]);
    const r = await ask(a.ctx, null, "Quel est le budget de P1 ?", "fr", client);
    expect(r.answer).toContain("500 000");
    expect(r.sources).toEqual([{ label: "P1 · Cliniques", href: `/projects/${p.id}` }]);
    // le résultat d'outil renvoyé au modèle contient les vraies données
    const toolResult = requests[1].messages.at(-1).content[0];
    expect(JSON.parse(toolResult.content).finance).toMatchObject({ planned: 500000, currency: "XOF" });
    expect(requests[0]).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default", betas: ["server-side-fallback-2026-07-01"], output_config: { effort: "medium" } });
    expect(requests[0].tools.every((t: { strict: boolean }) => t.strict)).toBe(true);
    // 2e question : l'historique (texte) est renvoyé
    const second = fakeClient([final("Oui.")]);
    await ask(a.ctx, r.conversationId, "Et ensuite ?", "fr", second.client);
    expect(second.requests[0].messages.map((m: { role: string }) => m.role)).toEqual(["user", "assistant", "user"]);
    expect((await getConversation(a.ctx, r.conversationId)).messages).toHaveLength(4);
    expect(await db.aiMessage.count({ where: { role: "assistant" } })).toBe(2);
  });

  it("droits respectés par les outils ; conversations privées ; refus ; quota", async () => {
    const a = await ownerWithOrg("A");
    const p = await createProjectDraft(a.ctx, { name: "Projet", code: "P1" });
    const viewer = await memberWithRole(a.org.id, "VIEWER");
    void p;
    const { client, requests } = fakeClient([toolUse("search_documents", { query: "x" }), final("Rien.")]);
    await ask(viewer.ctx, null, "Documents ?", "fr", client);
    expect(requests[1].messages.at(-1).content[0].is_error).toBeUndefined();
    const donor = await memberWithRole(a.org.id, "DONOR_VIEWER");
    await expectCode(ask(donor.ctx, null, "Bonjour", "fr", fakeClient([final("x")]).client), "FORBIDDEN"); // pas de ai:view
    const pm = await memberWithRole(a.org.id, "PROJECT_MANAGER");
    const docs = fakeClient([toolUse("search_documents", { query: "x" }), final("ok")]);
    await ask(pm.ctx, null, "Q", "fr", docs.client);
    expect(await listConversations(a.ctx)).toHaveLength(0); // conversations des autres invisibles
    const refused = await ask(a.ctx, null, "Q", "fr", fakeClient([() => ({ stop_reason: "refusal", content: [] })]).client);
    expect(refused.answer).toBe("Je ne peux pas répondre à cette demande.");
    await expectCode(ask(a.ctx, null, "   ", "fr", fakeClient([final("x")]).client), "VALIDATION");
    await expectCode(ask({ ...a.ctx, plan: "ESSENTIEL" }, null, "Q", "fr", fakeClient([final("x")]).client), "OK");
    const conv = await db.aiConversation.findFirstOrThrow({ where: { userId: a.user.id } });
    await db.aiMessage.createMany({ data: Array.from({ length: 100 }, () => ({ conversationId: conv.id, organizationId: a.org.id, role: "assistant", content: "x" })) });
    await expectCode(ask({ ...a.ctx, plan: "ESSENTIEL" }, null, "Q", "fr", fakeClient([final("x")]).client), "CONFLICT"); // 100 / mois
  });
});

import Anthropic from "@anthropic-ai/sdk";
describe("BAOBAB AI : erreurs du service", () => {
  const failing = (err: Error, then?: Record<string, unknown>) => {
    let n = 0;
    const calls: Record<string, unknown>[] = [];
    return { calls, client: { beta: { messages: { create: async (req: Record<string, unknown>) => { calls.push(req); if (n++ === 0 || !then) throw err; return { usage: { input_tokens: 1, output_tokens: 1 }, ...then }; } } } } as never };
  };
  const bad = (msg: string) => new Anthropic.BadRequestError(400, { type: "error", error: { type: "invalid_request_error", message: msg } }, msg, new Headers());
  it("crédit insuffisant : message clair ; option refusée : nouvelle tentative simplifiée", async () => {
    const a = await ownerWithOrg("A");
    const noCredit = failing(bad("Your credit balance is too low to access the Anthropic API."));
    await expect(ask(a.ctx, null, "Q", "fr", noCredit.client)).rejects.toThrow(/crédit/);
    expect(noCredit.calls).toHaveLength(1);
    const opt = failing(bad("fallbacks: not available for this organization"), { stop_reason: "end_turn", content: [{ type: "text", text: "Réponse." }] });
    const r = await ask(a.ctx, null, "Q", "fr", opt.client);
    expect(r.answer).toBe("Réponse.");
    expect(opt.calls[1]).not.toHaveProperty("fallbacks");
    expect(opt.calls[1]).not.toHaveProperty("betas");
    const notFound = failing(new Anthropic.NotFoundError(404, { type: "error", error: { type: "not_found_error", message: "model" } }, "model: claude-x", new Headers()));
    await expect(ask(a.ctx, null, "Q", "fr", notFound.client)).rejects.toThrow(/BAOBAB_AI_MODEL/);
  });
});
