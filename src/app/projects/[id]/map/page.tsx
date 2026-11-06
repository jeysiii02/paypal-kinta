import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { DependencyMap } from "@/components/flow/DependencyMap";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { getStoredDependencyAnalysis } from "@/services/dependency";
import { getProject } from "@/services/projects";

export const instant = false;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ disruptionId?: string }>;
};

export default async function MapPage({ params, searchParams }: Props) {
  await connection();
  const { id } = await params;
  const { disruptionId } = await searchParams;

  let project;
  try {
    project = await getProject(id);
  } catch {
    notFound();
  }

  let impacts: Array<{
    commitmentId: string;
    classification:
      | "DIRECTLY_AFFECTED"
      | "INDIRECTLY_AFFECTED"
      | "UNCERTAIN"
      | "UNAFFECTED";
  }> = [];

  if (disruptionId) {
    try {
      const stored = await getStoredDependencyAnalysis(disruptionId);
      if (stored) {
        impacts = [
          ...stored.directlyAffected,
          ...stored.indirectlyAffected,
          ...stored.uncertain,
          ...stored.unaffected,
        ].map((item) => ({
          commitmentId: item.commitmentId,
          classification: item.classification,
        }));
      }
    } catch {
      impacts = [];
    }
  }

  return (
    <AppShell projectId={project.id} projectName={project.name}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
            Dependency map
          </h1>
          <p className="mt-1 text-[var(--ink-muted)]">
            Project → commitments → dependency edges
            {disruptionId ? " with disruption impact coloring" : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/projects/${project.id}`} variant="secondary">
            Back to project
          </ButtonLink>
          {project.disruptions[0] ? (
            <ButtonLink
              href={`/projects/${project.id}/disruptions/${project.disruptions[0].id}`}
            >
              Disruption flow
            </ButtonLink>
          ) : null}
        </div>
      </div>

      <DependencyMap
        projectName={project.name}
        commitments={project.commitments}
        impacts={impacts}
      />

      <Card className="mt-6">
        <CardHeader
          title="How to read this"
          description="Suggested React Flow nodes from the handover"
        />
        <CardBody className="text-sm text-[var(--ink-muted)]">
          Solid teal edges are commitment dependencies. Grey spokes connect the
          project to every commitment. Impact colors appear after you run
          dependency analysis on a disruption.
        </CardBody>
      </Card>
    </AppShell>
  );
}
