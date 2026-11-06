import Link from "next/link";
import type { ReactNode } from "react";

// Rendu sûr d'une réponse : gras, listes et liens Markdown — seuls les liens internes (« /… ») sont rendus cliquables.
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      const href = m[2];
      out.push(/^\/(?![/\\])/.test(href) ? <Link key={`${key}-${i++}`} href={href} className="font-medium text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand">{m[1]}</Link> : m[1]);
    } else out.push(<strong key={`${key}-${i++}`} className="font-semibold text-navy">{m[3]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = (k: number) => { if (list.length) { blocks.push(<ul key={`l${k}`} className="my-2 list-disc space-y-1 pl-5">{list.map((l, j) => <li key={j}>{inline(l, `li${k}-${j}`)}</li>)}</ul>); list = []; } };
  lines.forEach((l, k) => {
    const item = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (item) { list.push(item[1]); return; }
    flush(k);
    const h = l.match(/^#{1,4}\s+(.*)$/);
    if (h) blocks.push(<p key={k} className="mt-3 font-display font-semibold text-navy">{inline(h[1], `h${k}`)}</p>);
    else if (l.trim()) blocks.push(<p key={k} className="my-1.5">{inline(l, `p${k}`)}</p>);
  });
  flush(lines.length);
  return <div className="text-[14.5px] leading-relaxed text-slate-800">{blocks}</div>;
}
