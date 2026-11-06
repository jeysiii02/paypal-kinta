import Link from "next/link";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDemoContext } from "@/lib/demo";
import { labelize } from "@/lib/status";
import { listSuppliers } from "@/services/suppliers";

export const instant = false;

export default async function SuppliersPage() {
  await connection();
  const { project } = await getDemoContext();

  if (!project) {
    return (
      <AppShell title="Suppliers">
        <EmptyState
          title="No active project"
          description="Create or seed a project first."
        />
      </AppShell>
    );
  }

  const suppliers = await listSuppliers(project.id);

  return (
    <AppShell title="Suppliers">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Suppliers
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Scoped to <strong>{project.name}</strong> (active workspace project).
          </p>
        </div>
        <ButtonLink href={`/projects/${project.id}`} variant="secondary">
          Open project
        </ButtonLink>
      </div>

      <Card className="mt-6">
        <CardHeader title="Supplier directory" description={`${suppliers.length} records`} />
        <CardBody className="space-y-3">
          {suppliers.length === 0 ? (
            <EmptyState title="No suppliers" description="Add suppliers from the project APIs." />
          ) : (
            suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[var(--ink)]">{supplier.name}</h3>
                      <Badge tone="accent">{labelize(supplier.category)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--ink-muted)]">
                      {supplier.contactPerson ?? "No contact"} ·{" "}
                      {supplier.email ?? "no email"} · {supplier.phone ?? "no phone"}
                    </p>
                    {supplier.notes ? (
                      <p className="mt-2 text-sm text-[var(--ink)]">{supplier.notes}</p>
                    ) : null}
                  </div>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {supplier._count.commitments} commitment(s)
                  </p>
                </div>
              </div>
            ))
          )}
          <p className="pt-2 text-xs text-[var(--ink-muted)]">
            Detail API:{" "}
            <Link href={`/api/projects/${project.id}/suppliers`} className="font-mono underline">
              GET /api/projects/:id/suppliers
            </Link>
          </p>
        </CardBody>
      </Card>
    </AppShell>
  );
}
