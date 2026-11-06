import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stat } from "@/components/ui/Stat";
import { getWorkspaceContext } from "@/lib/workspace";
import { formatDateShort, formatDateTime } from "@/lib/datetime";
import { formatPhp } from "@/lib/money";
import {
  actionStatusTone,
  labelize,
  projectStatusTone,
} from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { listActivityByProject } from "@/services/activity";
import { listRecoveryActions } from "@/services/recoveryActions";

export const instant = false;

export default async function DashboardPage() {
  await connection();
  const { user, projects, project } = await getWorkspaceContext();

  const activeCount = projects.filter((p) =>
    ["ACTIVE", "RECOVERING", "DISRUPTED"].includes(p.status),
  ).length;
  const disruptedCount = projects.filter((p) => p.status === "DISRUPTED").length;
  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);

  const [disruptionCount, pendingActions, activity, upcoming] =
    await Promise.all([
      prisma.disruption.count({
        where: {
          project: { userId: user.id },
          status: { not: "RESOLVED" },
        },
      }),
      project
        ? listRecoveryActions(project.id).then((actions) =>
            actions.filter((a) =>
              ["DRAFT", "NEEDS_CONFIRMATION", "AWAITING_APPROVAL"].includes(
                a.status,
              ),
            ),
          )
        : Promise.resolve([]),
      project
        ? listActivityByProject(project.id, { limit: 8 })
        : Promise.resolve([]),
      prisma.project.findMany({
        where: {
          userId: user.id,
          status: { not: "ARCHIVED" },
          eventDate: { gte: new Date() },
        },
        orderBy: { eventDate: "asc" },
        take: 5,
      }),
    ]);

  return (
    <AppShell title="Dashboard" projectId={project?.id} projectName={project?.name}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--teal)]">
            Workspace overview
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
            Good day, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--ink-muted)] sm:text-base">
            Track commitments, spot disruptions early, and move through recovery
            with evidence-backed plans.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/projects/new">
            <Plus className="h-4 w-4" />
            Create New Project
          </ButtonLink>
          <ButtonLink
            href={
              project
                ? `/projects/${project.id}/disruptions/new`
                : "/disruptions"
            }
            variant="secondary"
          >
            <AlertTriangle className="h-4 w-4" />
            Report a Disruption
          </ButtonLink>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total projects" value={String(projects.length)} />
        <Stat label="Active projects" value={String(activeCount)} />
        <Stat
          label="Active disruptions"
          value={String(disruptionCount)}
          hint={disruptedCount ? `${disruptedCount} project(s) disrupted` : undefined}
        />
        <Stat label="Budget tracked" value={formatPhp(totalBudget)} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <Card>
          <CardHeader
            title="Recent projects"
            description="From your workspace database"
            action={
              <ButtonLink href="/projects" variant="ghost">
                View all
              </ButtonLink>
            }
          />
          <CardBody className="space-y-3">
            {projects.length === 0 ? (
              <EmptyState
                title="No projects yet"
                description="Create a project or run prisma db seed."
              />
            ) : (
              projects.slice(0, 6).map((item) => (
                <Link
                  key={item.id}
                  href={`/projects/${item.id}`}
                  className="block rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-4 transition hover:border-[var(--teal-line)] hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
                          {item.name}
                        </h3>
                        <Badge tone={projectStatusTone(item.status)}>
                          {labelize(item.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-[var(--ink-muted)]">
                        {item.location} ·{" "}
                        {formatDateShort(item.eventDate)} ·{" "}
                        {item.expectedAttendees} attendees
                      </p>
                    </div>
                    <p className="font-semibold text-[var(--ink)]">
                      {formatPhp(item.budget)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Pending recovery actions"
              description={project ? project.name : "No active project"}
              action={
                <ButtonLink href="/actions" variant="ghost">
                  Action Center
                </ButtonLink>
              }
            />
            <CardBody className="space-y-3">
              {pendingActions.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">
                  Nothing awaiting approval.
                </p>
              ) : (
                pendingActions.slice(0, 5).map((action) => (
                  <div
                    key={action.id}
                    className="rounded-xl border border-[var(--line)] px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{action.title}</p>
                      <Badge tone={actionStatusTone(action.status)}>
                        {labelize(action.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      {labelize(action.type)}
                      {action.amount != null
                        ? ` · ${formatPhp(action.amount)}`
                        : ""}
                    </p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Upcoming events"
              action={
                <ButtonLink href="/projects" variant="ghost">
                  Projects
                </ButtonLink>
              }
            />
            <CardBody className="space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">
                  No upcoming event dates.
                </p>
              ) : (
                upcoming.map((item) => (
                  <Link
                    key={item.id}
                    href={`/projects/${item.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3 py-3 hover:bg-[var(--surface-2)]"
                  >
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {item.location}
                      </p>
                    </div>
                    <p className="text-xs font-medium text-[var(--ink)]">
                      {formatDateShort(item.eventDate)}
                    </p>
                  </Link>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Recent activity"
          description="Live ActivityLog for the active project"
          action={
            <ButtonLink href="/activity" variant="ghost">
              Full log
            </ButtonLink>
          }
        />
        <CardBody className="space-y-3">
          {activity.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">No activity yet.</p>
          ) : (
            activity.map((item) => (
              <div
                key={item.id}
                className="border-b border-[var(--line)] pb-3 last:border-0"
              >
                <p className="text-sm text-[var(--ink)]">{item.message}</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  {labelize(item.action)} ·{" "}
                  {formatDateTime(item.createdAt)}
                </p>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </AppShell>
  );
}
