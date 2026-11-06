import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { TechStatusPanel } from "@/components/system/TechStatusPanel";
import { getWorkspaceContext } from "@/lib/workspace";
import { getPublicPayPalConfig } from "@/services/paypal/client";

export const instant = false;

export default async function SettingsPage() {
  await connection();
  const { user, project } = await getWorkspaceContext();
  const paypal = getPublicPayPalConfig();

  return (
    <AppShell title="Settings" projectId={project?.id} projectName={project?.name}>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Demo workspace configuration. Integrations stay visible for judges without cluttering the product home."
      />

      <div className="mt-6">
        <TechStatusPanel />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Demo account" />
          <CardBody className="space-y-2 text-sm">
            <Row label="Name" value={user.name} />
            <Row label="Email" value={user.email} />
            <Row label="User ID" value={user.id} mono />
            <Row
              label="Active project"
              value={project?.name ?? "None"}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Integrations" />
          <CardBody className="space-y-2 text-sm">
            <Row label="AI provider" value={process.env.AI_PROVIDER || "gemini"} />
            <Row
              label="AI key"
              value={process.env.AI_API_KEY ? "Configured" : "Not set (heuristic OK)"}
            />
            <Row label="PayPal mode" value={paypal.mode} />
            <Row
              label="PayPal client"
              value={paypal.clientId ? `${paypal.clientId.slice(0, 8)}…` : "Mock / empty"}
            />
            <Row label="PayPal base" value={paypal.baseUrl} mono />
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--line)] py-2 last:border-0">
      <span className="text-[var(--ink-muted)]">{label}</span>
      <span className={`text-[var(--ink)] ${mono ? "font-mono text-xs" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}
