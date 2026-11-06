import Link from "next/link";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScenarioCharts } from "@/components/charts/ScenarioCharts";
import { getWorkspaceContext } from "@/lib/workspace";
import { formatPhp } from "@/lib/money";
import { strategyLabel } from "@/lib/status";
import { getRecoveryPlan, listRecoveryPlans } from "@/services/recoveryPlans";

export const instant = false;

export default async function RecoveryPlansPage() {
  await connection();
  const { project } = await getWorkspaceContext();

  if (!project) {
    return (
      <AppShell title="Recovery Plans">
        <EmptyState title="No active project" description="Create a project first." />
      </AppShell>
    );
  }

  const plans = await listRecoveryPlans(project.id);
  const latest = plans[0] ? await getRecoveryPlan(plans[0].id) : null;

  return (
    <AppShell title="Recovery Plans" projectId={project.id} projectName={project.name}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Recovery Plans
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Cancel · Relocate · Reschedule from{" "}
            <code className="font-mono text-xs">generateRecoveryPlans()</code>
          </p>
        </div>
        <ButtonLink href="/disruptions" variant="secondary">
          Open disruptions
        </ButtonLink>
      </div>

      {!latest ? (
        <Card className="mt-6">
          <CardBody>
            <EmptyState
              title="No recovery plans yet"
              description="Open a disruption workbench and generate plans via the backend."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader
              title={`Plan ${latest.id.slice(0, 8)}…`}
              description={`Disruption: ${latest.disruption.title}`}
            />
            <CardBody>
              <ScenarioCharts
                scenarios={latest.scenarios.map((s) => ({
                  ...s,
                  createdAt:
                    typeof s.createdAt === "string"
                      ? s.createdAt
                      : s.createdAt.toISOString(),
                  updatedAt:
                    typeof s.updatedAt === "string"
                      ? s.updatedAt
                      : s.updatedAt.toISOString(),
                  financials: s.financials,
                }))}
              />
            </CardBody>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            {latest.scenarios.map((scenario) => {
              const detail = scenario.planDetail as {
                summary?: string;
                proposedActions?: string[];
                affectedCommitmentIds?: string[];
                unaffectedCommitmentIds?: string[];
                estimatedAdditionalCosts?: number;
                potentiallyRecoverableAmounts?: number;
                estimatedNonrecoverableAmounts?: number;
                potentialCustomerRefunds?: number;
                risks?: string[];
                assumptions?: string[];
                missingInformation?: string[];
                confidenceLevel?: string;
                explanation?: string;
              };
              return (
                <Card key={scenario.id}>
                  <CardHeader
                    title={strategyLabel(scenario.strategy)}
                    description={scenario.summary}
                    action={
                      detail?.confidenceLevel ? (
                        <Badge tone="info">{detail.confidenceLevel}</Badge>
                      ) : null
                    }
                  />
                  <CardBody className="space-y-3 text-sm">
                    <p className="text-[var(--ink-muted)]">
                      {detail?.explanation ?? "No explanation stored."}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Metric
                        label="Additional"
                        value={detail?.estimatedAdditionalCosts}
                      />
                      <Metric
                        label="Recoverable"
                        value={detail?.potentiallyRecoverableAmounts}
                      />
                      <Metric
                        label="Nonrecoverable"
                        value={detail?.estimatedNonrecoverableAmounts}
                      />
                      <Metric
                        label="Cust. refunds"
                        value={detail?.potentialCustomerRefunds}
                      />
                    </div>
                    <List title="Proposed actions" items={detail?.proposedActions} />
                    <List title="Risks" items={detail?.risks} />
                    <List title="Assumptions" items={detail?.assumptions} />
                    <List title="Missing information" items={detail?.missingInformation} />
                    <p className="text-xs text-[var(--ink-muted)]">
                      Affected IDs: {(detail?.affectedCommitmentIds ?? []).length} ·
                      Unaffected: {(detail?.unaffectedCommitmentIds ?? []).length}
                    </p>
                    <Link
                      href="/simulator"
                      className="inline-flex text-sm font-semibold text-[var(--teal)] hover:underline"
                    >
                      Open in Financial Simulator →
                    </Link>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl border border-[var(--line)] px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">
        {label}
      </p>
      <p className="font-semibold">
        {typeof value === "number" ? formatPhp(value) : "—"}
      </p>
      <p className="text-[10px] text-[var(--warn)]">Estimate / confirm</p>
    </div>
  );
}

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {title}
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-[var(--ink)]">
        {items.slice(0, 6).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
