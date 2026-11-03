import Link from "next/link";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { listAuditLogs } from "@/server/services/audit-log";
import { Table, Td } from "@/components/ui/display";
import { intlLocale } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { Forbidden } from "../../forbidden";

export const metadata = { title: "Journal d'audit" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "audit:view")) return <Forbidden />;
  const page = Number((await searchParams).page) || 1;
  const [{ rows, total, pages }, { m, locale }] = await Promise.all([listAuditLogs(ctx, { page }), getMessages()]);
  const dt = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "short", timeStyle: "medium" });
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{fill(m.audit.count, { n: total })}</p>
      <Table head={m.audit.head}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td className="whitespace-nowrap text-xs">{dt.format(r.createdAt)}</Td>
            <Td>{r.actorId ? r.actorName : m.audit.system}</Td>
            <Td><code className="text-xs">{r.action}</code></Td>
            <Td>{r.summary}</Td>
            <Td>
              {r.changes && Object.keys(r.changes as object).length > 0 ? (
                <details><summary className="cursor-pointer text-xs text-brand">{m.ui.view}</summary><pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(r.changes, null, 2)}</pre></details>
              ) : <span className="text-slate-400">—</span>}
            </Td>
          </tr>
        ))}
      </Table>
      {pages > 1 && (
        <nav className="flex items-center gap-3 text-sm" aria-label="pagination">
          {page > 1 && <Link className="text-brand hover:underline" href={`?page=${page - 1}`}>{m.ui.previous}</Link>}
          <span>{fill(m.ui.page, { page, pages })}</span>
          {page < pages && <Link className="text-brand hover:underline" href={`?page=${page + 1}`}>{m.ui.next}</Link>}
        </nav>
      )}
    </div>
  );
}
