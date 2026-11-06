import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logActivity } from "@/services/activity";
import {
  getPayPalConfig,
  mockId,
  paypalFetch,
} from "@/services/paypal/client";
import { toPesos } from "@/lib/money";

type PayPalOrder = {
  id: string;
  status: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{ id: string; status: string }>;
    };
  }>;
};

export async function createCustomerPaymentOrder(input: {
  projectId: string;
  customerPaymentId: string;
}) {
  const payment = await prisma.customerPayment.findUnique({
    where: { id: input.customerPaymentId },
  });
  if (!payment) throw AppError.notFound("CustomerPayment", input.customerPaymentId);
  if (payment.projectId !== input.projectId) {
    throw AppError.badRequest("Payment does not belong to this project");
  }
  if (payment.paypalOrderId && payment.status !== "CREATED") {
    throw AppError.conflict("Payment already has a PayPal order", {
      paypalOrderId: payment.paypalOrderId,
      status: payment.status,
    });
  }

  const { mode } = getPayPalConfig();
  let orderId: string;
  let status: string;

  if (mode === "mock") {
    orderId = mockId("MOCKORDER");
    status = "CREATED";
  } else {
    const order = await paypalFetch<PayPalOrder>("/v2/checkout/orders", {
      method: "POST",
      json: {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: payment.id,
            description: `KINTA ticket — ${payment.customerName}`,
            amount: {
              currency_code: payment.currency || "PHP",
              value: toPesos(payment.amount).toFixed(2),
            },
          },
        ],
      },
    });
    orderId = order.id;
    status = order.status;
  }

  const updated = await prisma.customerPayment.update({
    where: { id: payment.id },
    data: {
      paypalOrderId: orderId,
      status: status === "APPROVED" ? "APPROVED" : "CREATED",
    },
  });

  await logActivity({
    projectId: payment.projectId,
    action: "PROJECT_UPDATED",
    entityType: "CustomerPayment",
    entityId: payment.id,
    message: `PayPal order created (${mode}): ${orderId}`,
    metadata: { mode, orderId, status },
  });

  return { payment: updated, orderId, mode };
}

export async function captureCustomerPaymentOrder(input: {
  projectId: string;
  customerPaymentId: string;
  orderId?: string;
}) {
  const payment = await prisma.customerPayment.findUnique({
    where: { id: input.customerPaymentId },
  });
  if (!payment) throw AppError.notFound("CustomerPayment", input.customerPaymentId);
  if (payment.projectId !== input.projectId) {
    throw AppError.badRequest("Payment does not belong to this project");
  }

  const orderId = input.orderId ?? payment.paypalOrderId;
  if (!orderId) {
    throw AppError.badRequest("Payment has no PayPal order to capture");
  }

  const { mode } = getPayPalConfig();
  let captureId: string;
  let status: string;

  if (mode === "mock") {
    captureId = mockId("MOCKCAPTURE");
    status = "COMPLETED";
  } else {
    const order = await paypalFetch<PayPalOrder>(
      `/v2/checkout/orders/${orderId}/capture`,
      { method: "POST", json: {} },
    );
    captureId =
      order.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? mockId("CAPTURE");
    status = order.status;
  }

  const updated = await prisma.customerPayment.update({
    where: { id: payment.id },
    data: {
      paypalOrderId: orderId,
      paypalCaptureId: captureId,
      status: "CAPTURED",
      capturedAt: new Date(),
    },
  });

  await logActivity({
    projectId: payment.projectId,
    action: "PROJECT_UPDATED",
    entityType: "CustomerPayment",
    entityId: payment.id,
    message: `PayPal capture completed (${mode}): ${captureId}`,
    metadata: { mode, orderId, captureId, status },
  });

  return { payment: updated, orderId, captureId, mode };
}
