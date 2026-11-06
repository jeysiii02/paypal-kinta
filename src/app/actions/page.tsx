import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { ActionCenterClient } from "@/components/actions/ActionCenterClient";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDemoContext } from "@/lib/demo";
import { listRecoveryActions } from "@/services/recoveryActions";

export const instant = false;

export default async function ActionsPage() {
  await connection();
  const { project } = await getDemoContext();

  if (!project) {
    return (
      <AppShell title="Action Center">
        <EmptyState title="No active project" description="Create a project first." />
      </AppShell>
    );
  }

  const actions = await listRecoveryActions(project.id);

  return (
    <AppShell title="Action Center">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Action Center
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Approve / reject updates application records only. PayPal execution is
            separate when <code className="font-mono text-xs">requiresPaypal</code>{" "}
            is true.
          </p>
        </div>
        <ButtonLink href="/transactions" variant="secondary">
          Transactions
        </ButtonLink>
      </div>

      <Card className="mt-6">
        <CardHeader
          title={project.name}
          description={`${actions.length} recovery action(s)`}
        />
        <CardBody>
          <ActionCenterClient actions={actions} />
        </CardBody>
      </Card>
    </AppShell>
  );
}
