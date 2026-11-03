import Link from "next/link";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { listAuditLogs } from "@/server/services/audit-log";
import { Table, Td } from "@/components/ui/display";
import { Forbidden } from "../../forbidden";

export const metadata = { title: "Journal d'audit" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "audit:view")) return <Forbidden />;
  const page = Number((await searchParams).page) || 1;
  const { rows, total, pages } = await listAuditLogs(ctx, { page });
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{total} événement(s). Le journal est en lecture seule et ne peut pas être modifié depuis l&apos;application.</p>
      <Table head={["Date", "Auteur", "Action", "Description", "Détails"]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td className="whitespace-nowrap text-xs">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "medium" }).format(r.createdAt)}</Td>
            <Td>{r.actorName}</Td>
            <Td><code className="text-xs">{r.action}</code></Td>
            <Td>{r.summary}</Td>
            <Td>
              {r.changes && Object.keys(r.changes as object).length > 0 ? (
                <details><summary className="cursor-pointer text-xs text-brand">Voir</summary><pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(r.changes, null, 2)}</pre></details>
              ) : <span className="text-slate-400">—</span>}
            </Td>
          </tr>
        ))}
      </Table>
      {pages > 1 && (
        <nav className="flex items-center gap-3 text-sm" aria-label="Pagination">
          {page > 1 && <Link className="text-brand hover:underline" href={`?page=${page - 1}`}>← Précédent</Link>}
          <span>Page {page} / {pages}</span>
          {page < pages && <Link className="text-brand hover:underline" href={`?page=${page + 1}`}>Suivant →</Link>}
        </nav>
      )}
    </div>
  );
}
