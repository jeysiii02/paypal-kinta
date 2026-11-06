import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  FolderKanban,
  Plus,
  Sparkles,
} from "lucide-react";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
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

  const latestDisruption = project
    ? await prisma.disruption.findFirst({
        where: { projectId: project.id },
        orderBy: { reportedAt: "desc" },
      })
    : null;

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

  const nextHref = latestDisruption
    ? `/projects/${project!.id}/disruptions/${latestDisruption.id}`
    : project
      ? `/projects/${project.id}/disruptions/new`
      : "/projects/new";

  return (
    <AppShell title="Dashboard" projectId={project?.id} projectName={project?.name}>
      <PageHeader
        eyebrow="Workspace"
        title={`Good day, ${user.name.split(" ")[0]}`}
        description="Track commitments, spot disruptions early, and move through recovery with evidence-backed plans."
        actions={
          <>
            <ButtonLink href="/projects/new">
              <Plus className="h-4 w-4" />
              New project
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
              Report disruption
            </ButtonLink>
          </>
        }
      />

      <section className="kinta-rise kinta-rise-delay-1 mt-8 overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-[linear-gradient(135deg,#071926_0%,#0f3a45_55%,#0d6e67_100%)] px-5 py-6 text-white shadow-[var(--shadow)] sm:px-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--teal-line)]">
              Recovery pulse
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight sm:text-3xl">
              {latestDisruption
                ? latestDisruption.title
                : project
                  ? `${project.name} is ready for monitoring`
                  : "Create your first project to begin"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              {latestDisruption
                ? "Continue the disruption workflow: analyze impact, compare scenarios, then approve PayPal actions."
                : "KINTA keeps AI analysis, financial simulation, and PayPal execution in one coherent loop."}
            </p>
          </div>
          <ButtonLink
            href={nextHref}
            variant="secondary"
            className="border-0 bg-white text-[var(--ink)] hover:bg-[var(--teal-soft)]"
          >
            {latestDisruption ? "Continue recovery" : "Get started"}
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total projects" value={String(projects.length)} accent="ink" />
        <Stat label="Active projects" value={String(activeCount)} accent="teal" />
        <Stat
          label="Active disruptions"
          value={String(disruptionCount)}
          hint={disruptedCount ? `${disruptedCount} project(s) disrupted` : undefined}
          accent="signal"
        />
        <Stat label="Budget tracked" value={formatPhp(totalBudget)} accent="amber" />
      </div>

      <div className="kinta-rise kinta-rise-delay-2 mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <Card>
          <CardHeader
            title="Recent projects"
            description="Your active workspace"
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
                description="Create a project or seed the University Tech Summit demo."
                icon={<FolderKanban className="h-5 w-5" />}
                action={
                  <ButtonLink href="/projects/new">Create project</ButtonLink>
                }
              />
            ) : (
              projects.slice(0, 6).map((item) => (
                <Link
                  key={item.id}
                  href={`/projects/${item.id}`}
                  className="block rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--teal-line)] hover:bg-white hover:shadow-[var(--shadow-sm)]"
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
                        {item.location} · {formatDateShort(item.eventDate)} ·{" "}
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
                <EmptyState
                  title="All clear"
                  description="No actions awaiting approval right now."
                  icon={<Sparkles className="h-5 w-5" />}
                />
              ) : (
                pendingActions.slice(0, 5).map((action) => (
                  <div
                    key={action.id}
                    className="rounded-xl border border-[var(--line)] px-3 py-3 transition hover:bg-[var(--surface-2)]"
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
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3 py-3 transition hover:bg-[var(--surface-2)]"
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

      <Card className="kinta-rise kinta-rise-delay-3 mt-6">
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
                  {labelize(item.action)} · {formatDateTime(item.createdAt)}
                </p>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </AppShell>
  );
}
