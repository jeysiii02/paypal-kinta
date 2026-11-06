import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EditProjectForm } from "@/components/projects/EditProjectForm";
import { getProject } from "@/services/projects";

export const instant = false;

type Props = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: Props) {
  await connection();
  const { id } = await params;

  let project;
  try {
    project = await getProject(id);
  } catch {
    notFound();
  }

  return (
    <AppShell
      title={`Edit ${project.name}`}
      projectId={project.id}
      projectName={project.name}
    >
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        Edit project
      </h1>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">
        Saves via <code className="font-mono text-xs">PATCH /api/projects/:id</code>
      </p>
      <Card className="mt-6">
        <CardHeader title={project.name} />
        <CardBody>
          <EditProjectForm project={project} />
        </CardBody>
      </Card>
    </AppShell>
  );
}
