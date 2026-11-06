import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { DisruptionWorkbench } from "@/components/disruptions/DisruptionWorkbench";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { disruptionStatusTone, labelize } from "@/lib/status";
import type { EventAnalysis, RecoveryPlan, Scenario } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { getStoredDependencyAnalysis } from "@/services/dependency";
import { getDisruption, parseStoredAnalysis } from "@/services/disruptions";
import { getProject } from "@/services/projects";
import { listRecoveryActions } from "@/services/recoveryActions";
import { getRecoveryPlan, listRecoveryPlans } from "@/services/recoveryPlans";

export const instant = false;

type Props = { params: Promise<{ id: string; disruptionId: string }> };

export default async function DisruptionPage({ params }: Props) {
  await connection();
  const { id: projectId, disruptionId } = await params;

  let project;
  let disruption;
  try {
    [project, disruption] = await Promise.all([
      getProject(projectId),
      getDisruption(disruptionId),
    ]);
  } catch {
    notFound();
  }

  if (disruption.projectId !== projectId) notFound();

  let analysis: EventAnalysis | null = null;
  const analysisRow =
    disruption.eventAnalysis ??
    (await prisma.eventAnalysis.findUnique({ where: { disruptionId } }));
  if (analysisRow?.rawAnalysisJson) {
    const parsed = parseStoredAnalysis(analysisRow.rawAnalysisJson);
    analysis = {
      id: analysisRow.id,
      disruptionId,
      ...parsed,
    };
  }

  let dependencies: Array<{
    commitmentId: string;
    classification:
      | "DIRECTLY_AFFECTED"
      | "INDIRECTLY_AFFECTED"
      | "UNCERTAIN"
      | "UNAFFECTED";
    explanation: string;
    assumedCancelled: boolean;
    title?: string;
  }> = [];
  try {
    const stored = await getStoredDependencyAnalysis(disruptionId);
    if (stored) {
      dependencies = [
        ...stored.directlyAffected,
        ...stored.indirectlyAffected,
        ...stored.uncertain,
        ...stored.unaffected,
      ];
    }
  } catch {
    dependencies = [];
  }

  const planSummaries = (await listRecoveryPlans(projectId)).filter(
    (plan) => plan.disruptionId === disruptionId,
  );
  const plans: Array<RecoveryPlan & { scenarios?: Scenario[] }> = [];
  for (const summary of planSummaries.slice(0, 3)) {
    const full = await getRecoveryPlan(summary.id);
    plans.push({
      id: full.id,
      projectId: full.projectId,
      disruptionId: full.disruptionId,
      plansJson: full.plansJson,
      createdAt: full.createdAt.toISOString(),
      scenarios: full.scenarios.map((scenario) => ({
        id: scenario.id,
        projectId: scenario.projectId,
        recoveryPlanId: scenario.recoveryPlanId,
        strategy: scenario.strategy,
        summary: scenario.summary,
        assumptionsJson: scenario.assumptionsJson,
        financialsJson: scenario.financialsJson,
        planDetailJson: scenario.planDetailJson,
        createdAt: scenario.createdAt.toISOString(),
        updatedAt: scenario.updatedAt.toISOString(),
        financials: scenario.financials,
      })),
    });
  }

  const actions = (await listRecoveryActions(projectId))
    .filter(
      (action) =>
        plans.some((plan) =>
          (plan.scenarios ?? []).some((scenario) => scenario.id === action.scenarioId),
        ) || action.scenarioId == null,
    )
    .map((action) => ({
      ...action,
      approvedAt: action.approvedAt?.toISOString() ?? null,
      rejectedAt: action.rejectedAt?.toISOString() ?? null,
      completedAt: action.completedAt?.toISOString() ?? null,
      failedAt: action.failedAt?.toISOString() ?? null,
      createdAt: action.createdAt.toISOString(),
    }));

  const commitmentTitles = Object.fromEntries(
    project.commitments.map((c) => [c.id, c.title]),
  );

  return (
    <AppShell
      title="Disruption"
      projectId={project.id}
      projectName={project.name}
    >
      <div className="mb-2">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
        >
          ← {project.name}
        </Link>
      </div>

      <PageHeader
        eyebrow="Disruption recovery"
        title={disruption.title}
        description={disruption.description}
        actions={
          <>
            <Badge tone={disruptionStatusTone(disruption.status)}>
              {labelize(disruption.status)}
            </Badge>
            <ButtonLink
              href={`/projects/${project.id}/map?disruptionId=${disruption.id}`}
              variant="secondary"
            >
              Dependency map
            </ButtonLink>
          </>
        }
      />

      <Card className="kinta-rise kinta-rise-delay-1 mb-6 mt-6">
        <CardHeader
          title="Evidence on file"
          description="Notices and agreements attached to this disruption"
        />
        <CardBody className="space-y-2">
          {disruption.documents.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">No documents uploaded.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {disruption.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-3 text-sm"
                >
                  <p className="font-medium">{doc.filename}</p>
                  <p className="mt-1 text-[var(--ink-muted)]">
                    {labelize(doc.type)} ·{" "}
                    {doc.extractedText
                      ? `${doc.extractedText.slice(0, 90)}…`
                      : "no extracted text"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <DisruptionWorkbench
        projectId={project.id}
        disruptionId={disruption.id}
        initialAnalysis={analysis}
        initialDependencies={dependencies}
        initialPlans={plans}
        initialActions={actions}
        commitmentTitles={commitmentTitles}
      />
    </AppShell>
  );
}
