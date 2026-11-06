import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScenarioSimulator } from "@/components/simulator/ScenarioSimulator";
import { getWorkspaceContext } from "@/lib/workspace";
import { getRecoveryPlan, listRecoveryPlans } from "@/services/recoveryPlans";

export const instant = false;

export default async function SimulatorPage() {
  await connection();
  const { project } = await getWorkspaceContext();

  if (!project) {
    return (
      <AppShell title="Financial Simulator">
        <EmptyState title="No active project" description="Create a project first." />
      </AppShell>
    );
  }

  const plans = await listRecoveryPlans(project.id);
  const latest = plans[0] ? await getRecoveryPlan(plans[0].id) : null;

  return (
    <AppShell title="Financial Simulator" projectId={project.id} projectName={project.name}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Financial Simulator
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ink-muted)]">
            Adjust assumptions and recalculate through{" "}
            <code className="font-mono text-xs">
              POST /api/scenarios/:id/calculate
            </code>
            . Frontend does not invent money math.
          </p>
        </div>
        <ButtonLink href="/recovery" variant="secondary">
          Recovery plans
        </ButtonLink>
      </div>

      <div className="mt-6">
        {!latest ? (
          <Card>
            <CardBody>
              <EmptyState
                title="No scenarios to simulate"
                description="Generate recovery plans from a disruption first."
              />
            </CardBody>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader
                title={project.name}
                description="Ledger figures are confirmed from commitments; scenario deltas are assumptions until suppliers confirm."
              />
            </Card>
            <ScenarioSimulator scenarios={latest.scenarios} />
          </>
        )}
      </div>
    </AppShell>
  );
}
