import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { PaymentsPanel } from "@/components/payments/PaymentsPanel";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { getDemoContext } from "@/lib/demo";
import { formatPhp } from "@/lib/money";
import { labelize, paymentStatusTone } from "@/lib/status";
import { getProject } from "@/services/projects";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function TransactionsPage() {
  await connection();
  const { project: summary } = await getDemoContext();

  if (!summary) {
    return (
      <AppShell title="Transactions">
        <EmptyState title="No active project" description="Create a project first." />
      </AppShell>
    );
  }

  const project = await getProject(summary.id);
  const refunds = await prisma.refund.findMany({
    where: { customerPayment: { projectId: project.id } },
    include: { customerPayment: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell title="Transactions">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            PayPal Orders / Capture / Refunds via implemented{" "}
            <code className="font-mono text-xs">/api/paypal/*</code> routes. No
            fabricated captures.
          </p>
        </div>
        <ButtonLink href={`/projects/${project.id}/payments`} variant="secondary">
          Project payments
        </ButtonLink>
      </div>

      <div className="mt-6 space-y-6">
        <Card>
          <CardHeader title="Customer payments" description={project.name} />
          <CardBody className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                <tr className="border-b border-[var(--line)]">
                  <th className="px-2 py-2">Customer</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Order ID</th>
                  <th className="px-2 py-2">Capture ID</th>
                  <th className="px-2 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {project.customerPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-2 py-3">
                      <p className="font-medium">{payment.customerName}</p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {payment.customerEmail}
                      </p>
                    </td>
                    <td className="px-2 py-3 font-semibold">
                      {formatPhp(payment.amount)}
                    </td>
                    <td className="px-2 py-3">
                      <Badge tone={paymentStatusTone(payment.status)}>
                        {labelize(payment.status)}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 font-mono text-xs">
                      {payment.paypalOrderId ?? "—"}
                    </td>
                    <td className="px-2 py-3 font-mono text-xs">
                      {payment.paypalCaptureId ?? "—"}
                    </td>
                    <td className="px-2 py-3 text-xs text-[var(--ink-muted)]">
                      {new Date(payment.createdAt).toLocaleString("en-PH")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Refunds" description="From Refund model + PayPal refund API" />
          <CardBody className="space-y-3">
            {refunds.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">
                No refunds recorded. Capture a payment first, then refund via the
                panel below or disruption workbench.
              </p>
            ) : (
              refunds.map((refund) => (
                <div
                  key={refund.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {refund.customerPayment.customerName}
                    </p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      paypalRefundId: {refund.paypalRefundId ?? "—"} ·{" "}
                      {refund.reason ?? "no reason"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPhp(refund.amount)}</p>
                    <Badge>{labelize(refund.status)}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

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
