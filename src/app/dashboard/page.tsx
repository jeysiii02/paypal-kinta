import Link from "next/link";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stat } from "@/components/ui/Stat";
import { getDemoContext } from "@/lib/demo";
import { formatPhp } from "@/lib/money";
import { labelize, projectStatusTone } from "@/lib/status";

export const instant = false;

export default async function DashboardPage() {
  await connection();
  const { user, projects, project } = await getDemoContext();

  const activeCount = projects.filter((p) => p.status === "ACTIVE").length;
  const disruptedCount = projects.filter((p) => p.status === "DISRUPTED").length;
  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);

  return (
    <AppShell>
      <div className="kinta-grid -mx-4 rounded-[28px] border border-[var(--line)] bg-white/55 px-4 py-8 sm:-mx-0 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">
              Demo workspace
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--ink)] sm:text-5xl">
              KINTA
            </h1>
            <p className="mt-3 text-base text-[var(--ink-muted)] sm:text-lg">
              See disruption impact, compare recovery paths, and execute PayPal
              Sandbox refunds with clear evidence — not guesswork.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm shadow-[var(--shadow-sm)]">
            <p className="text-[var(--ink-muted)]">Signed in as</p>
            <p className="font-semibold text-[var(--ink)]">{user.name}</p>
            <p className="font-mono text-xs text-[var(--ink-muted)]">{user.email}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Projects" value={String(projects.length)} />
          <Stat label="Active" value={String(activeCount)} />
          <Stat label="Disrupted" value={String(disruptedCount)} />
          <Stat label="Budget tracked" value={formatPhp(totalBudget)} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader
            title="Projects"
            description="Bootstrap from GET /api/users + GET /api/projects"
            action={
              project ? (
                <ButtonLink href={`/projects/${project.id}`}>Open demo project</ButtonLink>
              ) : null
            }
          />
          <CardBody className="space-y-3">
            {projects.length === 0 ? (
              <EmptyState
                title="No projects yet"
                description="Seed the database to load University Tech Summit."
              />
            ) : (
              projects.map((item) => (
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
                        {new Date(item.eventDate).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {item.expectedAttendees} attendees
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

        <Card>
          <CardHeader
            title="Recovery loop"
            description="The path Dev 2 wires end-to-end"
          />
          <CardBody>
            <ol className="space-y-4 text-sm text-[var(--ink-muted)]">
              {[
                "Report a disruption and attach notices",
                "Run AI analysis + dependency mapping",
                "Compare Cancel / Relocate / Reschedule",
                "Approve actions, then capture or refund via PayPal",
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-[var(--ink)]">{step}</span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
