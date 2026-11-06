import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDemoContext } from "@/lib/demo";
import { labelize } from "@/lib/status";
import { listActivityByProject } from "@/services/activity";

export const instant = false;

export default async function ActivityPage() {
  await connection();
  const { project } = await getDemoContext();

  if (!project) {
    return (
      <AppShell title="Activity Log">
        <EmptyState title="No active project" description="Create a project first." />
      </AppShell>
    );
  }

  const logs = await listActivityByProject(project.id, { limit: 100 });

  return (
    <AppShell title="Activity Log">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        Activity Log
      </h1>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">
        {project.name} · GET /api/projects/:id/activity
      </p>

      <Card className="mt-6">
        <CardHeader title="Recent events" description={`${logs.length} shown`} />
        <CardBody className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">No activity yet.</p>
          ) : (
            logs.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[var(--line)] px-3 py-3"
              >
                <p className="text-sm text-[var(--ink)]">{item.message}</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  {labelize(item.action)} · {item.entityType}
                  {item.entityId ? ` · ${item.entityId.slice(0, 10)}…` : ""} ·{" "}
                  {new Date(item.createdAt).toLocaleString("en-PH")}
                </p>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </AppShell>
  );
}
