import Link from "next/link";
import { Plus } from "lucide-react";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectActions } from "@/components/projects/ProjectActions";
import { getWorkspaceContext } from "@/lib/workspace";
import { formatDate } from "@/lib/datetime";
import { formatPhp } from "@/lib/money";
import { labelize, projectStatusTone } from "@/lib/status";

export const instant = false;

export default async function ProjectsPage() {
  await connection();
  const { projects, project: active } = await getWorkspaceContext();

  return (
    <AppShell title="Projects" projectId={active?.id} projectName={active?.name}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Projects
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Switch the active project from the sidebar, or open/edit/archive here.
          </p>
        </div>
        <ButtonLink href="/projects/new">
          <Plus className="h-4 w-4" />
          Create New Project
        </ButtonLink>
      </div>

      <Card className="mt-6">
        <CardHeader title="Project list" description={`${projects.length} active`} />
        <CardBody className="space-y-3">
          {projects.length === 0 ? (
            <EmptyState
              title="No projects"
              description="Create one to start tracking commitments."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                  <tr className="border-b border-[var(--line)]">
                    <th className="px-2 py-2 font-semibold">Name</th>
                    <th className="px-2 py-2 font-semibold">Event</th>
                    <th className="px-2 py-2 font-semibold">Location</th>
                    <th className="px-2 py-2 font-semibold">Budget</th>
                    <th className="px-2 py-2 font-semibold">Status</th>
                    <th className="px-2 py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b border-[var(--line)] last:border-0"
                    >
                      <td className="px-2 py-3">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-semibold text-[var(--ink)] hover:text-[var(--teal)]"
                        >
                          {project.name}
                        </Link>
                        {active?.id === project.id ? (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--teal)]">
                            Active
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-3 text-[var(--ink-muted)]">
                        {formatDate(project.eventDate)}
                      </td>
                      <td className="px-2 py-3 text-[var(--ink-muted)]">
                        {project.location}
                      </td>
                      <td className="px-2 py-3 font-medium">
                        {formatPhp(project.budget)}
                      </td>
                      <td className="px-2 py-3">
                        <Badge tone={projectStatusTone(project.status)}>
                          {labelize(project.status)}
                        </Badge>
                      </td>
                      <td className="px-2 py-3">
                        <ProjectActions
                          projectId={project.id}
                          projectName={project.name}
                          compact
                          isActive={active?.id === project.id}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </AppShell>
  );
}
