import nodemailer, { type Transporter } from "nodemailer";

/**
 * Envoi d'emails par SMTP (Brevo, Mailjet, Gmail, OVH, serveur de l'organisation…).
 * Désactivé si SMTP_HOST n'est pas configuré : les fonctions renvoient { sent: false } sans erreur,
 * et l'interface l'indique (aucun faux « email envoyé »).
 */
export type Mail = { to: string; subject: string; text: string; html: string };

export const mailEnabled = () => Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);

let transport: Transporter | null = null;
function getTransport() {
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transport;
}

/** Point d'injection pour les tests. */
export const mailOutbox: Mail[] = [];

export async function sendMail(mail: Mail): Promise<{ sent: boolean }> {
  if (process.env.MAIL_TEST_OUTBOX === "1") {
    mailOutbox.push(mail);
    return { sent: true };
  }
  if (!mailEnabled()) return { sent: false };
  try {
    await getTransport().sendMail({ from: process.env.MAIL_FROM, ...mail });
    return { sent: true };
  } catch (e) {
    console.error("Échec d'envoi d'email", e);
    return { sent: false };
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Gabarit sobre aux couleurs BAOBAB. */
export function layout(title: string, paragraphs: string[], cta?: { label: string; url: string }) {
  const html = `<!doctype html><html><body style="margin:0;background:#F7F9F8;font-family:Inter,Arial,sans-serif;color:#102A43">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #E4EAE7;border-radius:12px">
<tr><td style="padding:24px 28px;border-bottom:1px solid #E4EAE7;font-weight:700;letter-spacing:.12em;color:#087F68">BAOBAB</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:20px">${esc(title)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.6">${esc(p)}</p>`).join("")}
${cta ? `<p style="margin:24px 0"><a href="${esc(cta.url)}" style="background:#087F68;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px">${esc(cta.label)}</a></p><p style="font-size:12px;color:#64748b;word-break:break-all">${esc(cta.url)}</p>` : ""}
</td></tr></table>
<p style="font-size:12px;color:#64748b">BAOBAB — Planifier. Exécuter. Impacter.</p>
</td></tr></table></body></html>`;
  const text = [title, "", ...paragraphs, ...(cta ? ["", `${cta.label} : ${cta.url}`] : [])].join("\n");
  return { html, text };
}
