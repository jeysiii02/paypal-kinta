import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { PaymentsPanel } from "@/components/payments/PaymentsPanel";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
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
    <AppShell
      title="Payments"
      projectId={project.id}
      projectName={project.name}
    >
      <PageHeader
        eyebrow="PayPal operations"
        title="Payments"
        description={`Orders, capture, and refunds for ${project.name}. Approval still happens before money moves.`}
        actions={
          <ButtonLink href={`/projects/${project.id}`} variant="secondary">
            Back to project
          </ButtonLink>
        }
      />

      <div className="mt-6">
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
      </div>
    </AppShell>
  );
}
