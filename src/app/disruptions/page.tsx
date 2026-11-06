import Link from "next/link";
import { Plus } from "lucide-react";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getWorkspaceContext } from "@/lib/workspace";
import { formatDateTime } from "@/lib/datetime";
import { disruptionStatusTone, labelize } from "@/lib/status";
import { listDisruptions } from "@/services/disruptions";

export const instant = false;

export default async function DisruptionsPage() {
  await connection();
  const { project } = await getWorkspaceContext();

  if (!project) {
    return (
      <AppShell title="Disruptions">
        <EmptyState title="No active project" description="Seed or create a project first." />
      </AppShell>
    );
  }

  const disruptions = await listDisruptions(project.id);

  return (
    <AppShell title="Disruptions" projectId={project.id} projectName={project.name}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Disruptions
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Incidents for {project.name}. Analyze connects to backend AI endpoints.
          </p>
        </div>
        <ButtonLink href={`/projects/${project.id}/disruptions/new`}>
          <Plus className="h-4 w-4" />
          Report a Disruption
        </ButtonLink>
      </div>

      <Card className="mt-6">
        <CardHeader title="Incident list" />
        <CardBody className="space-y-3">
          {disruptions.length === 0 ? (
            <EmptyState
              title="No disruptions"
              description="Report an unexpected business event to start analysis."
            />
          ) : (
            disruptions.map((disruption) => (
              <Link
                key={disruption.id}
                href={`/projects/${project.id}/disruptions/${disruption.id}`}
                className="block rounded-2xl border border-[var(--line)] px-4 py-4 transition hover:border-[var(--amber-line)] hover:bg-white"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{disruption.title}</h3>
                      <Badge tone={disruptionStatusTone(disruption.status)}>
                        {labelize(disruption.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--ink-muted)]">
                      {disruption.description}
                    </p>
                    <p className="mt-2 text-xs text-[var(--ink-muted)]">
                      {disruption.documents.length} document(s)
                      {disruption.eventAnalysis
                        ? ` · analysis ${disruption.eventAnalysis.incidentType}`
                        : " · not analyzed"}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--ink-muted)]">
                    {formatDateTime(disruption.reportedAt)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </CardBody>
      </Card>
    </AppShell>
  );
}
