import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";
import { getDemoContext } from "@/lib/demo";

export const instant = false;

export default async function NewProjectPage() {
  await connection();
  const { user } = await getDemoContext();

  return (
    <AppShell title="New project">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        Create New Project
      </h1>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">
        Posts to <code className="font-mono text-xs">POST /api/projects</code> —
        amounts stored as centavos.
      </p>
      <Card className="mt-6">
        <CardHeader title="Project details" />
        <CardBody>
          <CreateProjectForm userId={user.id} />
        </CardBody>
      </Card>
    </AppShell>
  );
}
