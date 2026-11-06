"use client";

import {
  PayPalButtons,
  PayPalScriptProvider,
  usePayPalScriptReducer,
} from "@paypal/react-paypal-js";
import { useState } from "react";
import { api, ClientApiError } from "@/lib/client-api";
import type { CustomerPayment } from "@/lib/types";
import { Button } from "@/components/ui/Button";

type Props = {
  projectId: string;
  payment: CustomerPayment;
  clientId: string;
  currency: string;
  onCaptured: (payment: CustomerPayment, captureId: string) => void;
  onError: (message: string) => void;
};

function ButtonsInner({
  projectId,
  payment,
  onCaptured,
  onError,
}: Omit<Props, "clientId" | "currency">) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return <p className="text-sm text-[var(--ink-muted)]">Loading PayPal SDK…</p>;
  }
  if (isRejected) {
    return (
      <p className="text-sm text-[var(--bad)]">
        PayPal SDK failed to load. Check NEXT_PUBLIC_PAYPAL_CLIENT_ID / sandbox network.
      </p>
    );
  }

  return (
    <div className={`min-w-[220px] ${busy ? "opacity-70 pointer-events-none" : ""}`}>
      <PayPalButtons
        style={{ layout: "vertical", shape: "rect", label: "paypal" }}
        disabled={busy}
        createOrder={async () => {
          setBusy(true);
          try {
            const created = await api<{ orderId: string }>("/api/paypal/orders", {
              method: "POST",
              body: { projectId, customerPaymentId: payment.id },
            });
            return created.orderId;
          } catch (err) {
            setBusy(false);
            onError(
              err instanceof ClientApiError
                ? err.message
                : "Failed to create PayPal order",
            );
            throw err;
          }
        }}
        onApprove={async (data) => {
          try {
            const captured = await api<{
              payment: CustomerPayment;
              captureId: string;
            }>(`/api/paypal/orders/${data.orderID}/capture`, {
              method: "POST",
              body: { projectId, customerPaymentId: payment.id },
            });
            onCaptured(captured.payment, captured.captureId);
          } catch (err) {
            onError(
              err instanceof ClientApiError
                ? err.message
                : "Failed to capture PayPal order",
            );
          } finally {
            setBusy(false);
          }
        }}
        onCancel={() => setBusy(false)}
        onError={() => {
          setBusy(false);
          onError("PayPal Buttons reported an error");
        }}
      />
    </div>
  );
}

export function PayPalCheckoutButtons(props: Props) {
  return (
    <PayPalScriptProvider
      options={{
        clientId: props.clientId,
        currency: props.currency,
        intent: "capture",
        components: "buttons",
      }}
    >
      <ButtonsInner
        projectId={props.projectId}
        payment={props.payment}
        onCaptured={props.onCaptured}
        onError={props.onError}
      />
    </PayPalScriptProvider>
  );
}

export function MockCaptureButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button onClick={onClick} disabled={disabled}>
      Mock create + capture
    </Button>
  );
}
