import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { PaymentsPanel } from "@/components/payments/PaymentsPanel";
import { ButtonLink } from "@/components/ui/Button";
import { getProject } from "@/services/projects";

export const instant = false;

type Props = { params: Promise<{ id: string }> };

export default async function PaymentsPage({ params }: Props) {
  await connection();
  const { id } = await params;

  let project;
  try {
    project = await getProject(id);
  } catch {
    notFound();
  }

  return (
    <AppShell projectId={project.id} projectName={project.name}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
            Payments
          </h1>
          <p className="mt-1 text-[var(--ink-muted)]">
            PayPal Orders, Capture, and Refunds for {project.name}.
          </p>
        </div>
        <ButtonLink href={`/projects/${project.id}`} variant="secondary">
          Back to project
        </ButtonLink>
      </div>

      <PaymentsPanel
        projectId={project.id}
        initialPayments={project.customerPayments.map((payment) => ({
          id: payment.id,
          projectId: project.id,
          customerName: payment.customerName,
          customerEmail: payment.customerEmail,
          amount: payment.amount,
          currency: payment.currency,
          paypalOrderId: payment.paypalOrderId,
          paypalCaptureId: payment.paypalCaptureId,
          status: payment.status,
          capturedAt: payment.capturedAt
            ? payment.capturedAt.toISOString()
            : null,
          createdAt: payment.createdAt.toISOString(),
        }))}
      />
    </AppShell>
  );
}
