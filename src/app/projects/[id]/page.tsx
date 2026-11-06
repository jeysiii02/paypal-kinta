import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stat } from "@/components/ui/Stat";
import { ProjectActions } from "@/components/projects/ProjectActions";
import { formatDateTime } from "@/lib/datetime";
import { formatPhp } from "@/lib/money";
import {
  commitmentStatusTone,
  disruptionStatusTone,
  labelize,
  paymentStatusTone,
  projectStatusTone,
} from "@/lib/status";
import { listActivityByProject } from "@/services/activity";
import { getProject } from "@/services/projects";
import { listRecoveryActions } from "@/services/recoveryActions";
import { listRecoveryPlans } from "@/services/recoveryPlans";

export const instant = false;

type Props = { params: Promise<{ id: string }> };

export default async function ProjectPage({ params }: Props) {
  await connection();
  const { id } = await params;

  let project;
  try {
    project = await getProject(id);
  } catch {
    notFound();
  }

  const [activity, actions, plans] = await Promise.all([
    listActivityByProject(id, { limit: 12 }),
    listRecoveryActions(id),
    listRecoveryPlans(id),
  ]);

  const paid = project.commitments.reduce((sum, c) => sum + c.amountPaid, 0);
  const committed = project.commitments.reduce((sum, c) => sum + c.agreedAmount, 0);
  const collected = project.customerPayments
    .filter((p) => ["CAPTURED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(p.status))
    .reduce((sum, p) => sum + p.amount, 0);
  const latestDisruption = project.disruptions[0];

  return (
    <AppShell title="Project" projectId={project.id} projectName={project.name}>
      <PageHeader
        eyebrow={project.location}
        title={project.name}
        description={project.description ?? undefined}
        actions={
          <>
            <Badge tone={projectStatusTone(project.status)}>
              {labelize(project.status)}
            </Badge>
            <ButtonLink href={`/projects/${project.id}/map`} variant="secondary">
              Dependency map
            </ButtonLink>
            <ButtonLink href={`/projects/${project.id}/payments`} variant="secondary">
              Payments
            </ButtonLink>
            {latestDisruption ? (
              <ButtonLink href={`/projects/${project.id}/disruptions/${latestDisruption.id}`}>
                Open disruption flow
              </ButtonLink>
            ) : (
              <ButtonLink href={`/projects/${project.id}/disruptions/new`}>
                Report disruption
              </ButtonLink>
            )}
          </>
        }
      />

      <div className="mt-4">
        <ProjectActions
          projectId={project.id}
          projectName={project.name}
          isActive
        />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Budget"
          value={formatPhp(project.budget)}
          hint={`${project.expectedAttendees} expected attendees`}
          accent="ink"
        />
        <Stat
          label="Commitments"
          value={formatPhp(committed)}
          hint={`${formatPhp(paid)} already paid`}
        />
        <Stat
          label="Customer collected"
          value={formatPhp(collected)}
          hint={`${project.customerPayments.length} payment records`}
        />
        <Stat
          label="Recovery actions"
          value={String(actions.length)}
          hint={`${plans.length} recovery plan(s)`}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Commitments"
              description="Supplier agreements with payment and cancel terms"
            />
            <CardBody className="space-y-3">
              {project.commitments.map((commitment) => (
                <div
                  key={commitment.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[var(--ink)]">{commitment.title}</h3>
                        <Badge tone={commitmentStatusTone(commitment.status)}>
                          {labelize(commitment.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-[var(--ink-muted)]">
                        {commitment.supplier?.name} · {labelize(commitment.paymentStatus)} ·{" "}
                        {commitment.dependencies?.length ?? 0} dependencies
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold">{formatPhp(commitment.agreedAmount)}</p>
                      <p className="text-[var(--ink-muted)]">
                        Paid {formatPhp(commitment.amountPaid)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Disruptions"
              description="Report → analyze → map → recover"
              action={
                <ButtonLink
                  href={`/projects/${project.id}/disruptions/new`}
                  variant="secondary"
                >
                  New
                </ButtonLink>
              }
            />
            <CardBody className="space-y-3">
              {project.disruptions.length === 0 ? (
                <EmptyState
                  title="No disruptions yet"
                  description="Use the seeded venue cancellation or report a new incident."
                />
              ) : (
                project.disruptions.map((disruption) => (
                  <Link
                    key={disruption.id}
                    href={`/projects/${project.id}/disruptions/${disruption.id}`}
                    className="block rounded-2xl border border-[var(--line)] bg-white px-4 py-3 transition hover:border-[var(--amber-line)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{disruption.title}</h3>
                          <Badge tone={disruptionStatusTone(disruption.status)}>
                            {labelize(disruption.status)}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--ink-muted)]">
                          {disruption.description}
                        </p>
                      </div>
                      <span className="text-xs text-[var(--ink-muted)]">
                        {formatDateTime(disruption.reportedAt)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Customer payments"
              description="PayPal fields reserved until Sandbox capture"
              action={
                <ButtonLink href={`/projects/${project.id}/payments`} variant="ghost">
                  Manage
                </ButtonLink>
              }
            />
            <CardBody className="space-y-3">
              {project.customerPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3 py-3"
                >
                  <div>
                    <p className="font-medium">{payment.customerName}</p>
                    <p className="text-xs text-[var(--ink-muted)]">{payment.customerEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPhp(payment.amount)}</p>
                    <Badge tone={paymentStatusTone(payment.status)}>
                      {labelize(payment.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity" description="Latest project mutations" />
            <CardBody className="space-y-3">
              {activity.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">No activity yet.</p>
              ) : (
                activity.map((item) => (
                  <div key={item.id} className="border-b border-[var(--line)] pb-3 last:border-0">
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
        </div>
      </div>
    </AppShell>
  );
}
