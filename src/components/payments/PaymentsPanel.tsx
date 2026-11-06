"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  MockCaptureButton,
  PayPalCheckoutButtons,
} from "@/components/payments/PayPalCheckoutButtons";
import { api, ClientApiError } from "@/lib/client-api";
import { formatPhp } from "@/lib/money";
import { labelize, paymentStatusTone } from "@/lib/status";
import type { CustomerPayment } from "@/lib/types";

type PayPalConfig = {
  clientId: string;
  mode: "live" | "mock";
  currency: string;
  sdkEnabled?: boolean;
  brandName?: string;
};

export function PaymentsPanel({
  projectId,
  initialPayments,
}: {
  projectId: string;
  initialPayments: CustomerPayment[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [payments, setPayments] = useState(initialPayments);
  const [config, setConfig] = useState<PayPalConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [orderPreview, setOrderPreview] = useState<string | null>(null);

  useEffect(() => {
    api<PayPalConfig>("/api/paypal/config")
      .then(setConfig)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load PayPal config");
      });
  }, []);

  async function run(label: string, fn: () => Promise<void>) {
    setError(null);
    setMessage(null);
    try {
      await fn();
      startTransition(() => router.refresh());
    } catch (err) {
      setError(
        err instanceof ClientApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : `Failed: ${label}`,
      );
    }
  }

  async function mockCreateAndCapture(payment: CustomerPayment) {
    await run("capture", async () => {
      const created = await api<{
        payment: CustomerPayment;
        orderId: string;
        mode: string;
      }>("/api/paypal/orders", {
        method: "POST",
        body: { projectId, customerPaymentId: payment.id },
      });

      const captured = await api<{
        payment: CustomerPayment;
        captureId: string;
        mode: string;
      }>(`/api/paypal/orders/${created.orderId}/capture`, {
        method: "POST",
        body: { projectId, customerPaymentId: payment.id },
      });

      setPayments((current) =>
        current.map((item) => (item.id === payment.id ? captured.payment : item)),
      );
      setMessage(
        `Captured via PayPal (${captured.mode}): ${captured.captureId}`,
      );
    });
  }

  async function inspectOrder(payment: CustomerPayment) {
    if (!payment.paypalOrderId) return;
    await run("inspect order", async () => {
      const order = await api<Record<string, unknown>>(
        `/api/paypal/orders/${payment.paypalOrderId}`,
      );
      setOrderPreview(JSON.stringify(order, null, 2));
      setMessage(`Loaded Orders v2 details for ${payment.paypalOrderId}`);
    });
  }

  async function refund(payment: CustomerPayment) {
    await run("refund", async () => {
      const result = await api<{
        payment: CustomerPayment;
        refund: { paypalRefundId: string | null };
        mode: string;
      }>("/api/paypal/refunds", {
        method: "POST",
        body: {
          customerPaymentId: payment.id,
          amountCentavos: payment.amount,
          reason: "Demo refund from KINTA payments panel",
        },
      });
      setPayments((current) =>
        current.map((item) => (item.id === payment.id ? result.payment : item)),
      );
      setMessage(
        `Refunded via PayPal (${result.mode}): ${result.refund.paypalRefundId}`,
      );
    });
  }

  const liveSdk = Boolean(config?.sdkEnabled && config.clientId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="PayPal Developer Platform"
          description="Orders v2 → JS SDK approve → Capture → Refunds → Webhooks"
          action={
            config ? (
              <Badge tone={config.mode === "mock" ? "warn" : "good"}>
                {config.mode === "mock" ? "Mock mode" : "Live sandbox SDK"}
              </Badge>
            ) : null
          }
        />
        <CardBody className="space-y-2 text-sm text-[var(--ink-muted)]">
          <p>
            Live mode uses <code className="font-mono text-xs">@paypal/react-paypal-js</code>{" "}
            Buttons with server-side order create/capture. Mock mode keeps the demo
            runnable without credentials.
          </p>
          <p>
            APIs:{" "}
            <code className="font-mono text-xs">
              /api/paypal/orders · capture · refunds · webhooks · recovery-actions/execute
            </code>
          </p>
        </CardBody>
      </Card>

      {error ? (
        <div className="rounded-2xl border border-[var(--bad-line)] bg-[var(--bad-soft)] px-4 py-3 text-sm text-[var(--bad)]">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-[var(--good-line)] bg-[var(--good-soft)] px-4 py-3 text-sm text-[var(--good)]">
          {message}
        </div>
      ) : null}

      <Card>
        <CardHeader title="Customer payments" description="Seeded demo tickets start as CREATED" />
        <CardBody className="space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="rounded-2xl border border-[var(--line)] px-4 py-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{payment.customerName}</p>
                    <Badge tone={paymentStatusTone(payment.status)}>
                      {labelize(payment.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    {payment.customerEmail} · {formatPhp(payment.amount)}{" "}
                    {payment.currency}
                  </p>
                  <p className="mt-1 font-mono text-xs text-[var(--ink-muted)]">
                    order={payment.paypalOrderId ?? "null"} · capture=
                    {payment.paypalCaptureId ?? "null"}
                  </p>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:min-w-[240px]">
                  {(payment.status === "CREATED" || payment.status === "APPROVED") &&
                  liveSdk ? (
                    <PayPalCheckoutButtons
                      projectId={projectId}
                      payment={payment}
                      clientId={config!.clientId}
                      currency={config?.currency || payment.currency || "PHP"}
                      onCaptured={(updated, captureId) => {
                        setPayments((current) =>
                          current.map((item) =>
                            item.id === payment.id ? updated : item,
                          ),
                        );
                        setMessage(`PayPal JS SDK capture completed: ${captureId}`);
                        startTransition(() => router.refresh());
                      }}
                      onError={setError}
                    />
                  ) : null}

                  {(payment.status === "CREATED" || payment.status === "APPROVED") &&
                  !liveSdk ? (
                    <MockCaptureButton
                      onClick={() => mockCreateAndCapture(payment)}
                      disabled={pending}
                    />
                  ) : null}

                  {payment.paypalOrderId ? (
                    <Button
                      variant="ghost"
                      onClick={() => inspectOrder(payment)}
                      disabled={pending}
                    >
                      Inspect order
                    </Button>
                  ) : null}

                  {payment.status === "CAPTURED" ||
                  payment.status === "PARTIALLY_REFUNDED" ? (
                    <Button
                      variant="secondary"
                      onClick={() => refund(payment)}
                      disabled={pending}
                    >
                      Refund capture
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {orderPreview ? (
        <Card>
          <CardHeader title="Orders v2 payload" description="GET /api/paypal/orders/:orderId" />
          <CardBody>
            <pre className="overflow-x-auto rounded-xl bg-[var(--ink)] p-4 text-xs text-white">
              {orderPreview}
            </pre>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
