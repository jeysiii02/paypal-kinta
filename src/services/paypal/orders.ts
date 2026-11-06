import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logActivity } from "@/services/activity";
import {
  getPayPalConfig,
  mockId,
  paypalFetch,
  pesosValueFromCentavos,
} from "@/services/paypal/client";
import type { PayPalOrder } from "@/services/paypal/types";

function buildCreateOrderBody(payment: {
  id: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  projectId: string;
}) {
  const { currency, brandName, returnUrl, cancelUrl } = getPayPalConfig();
  const currencyCode = (payment.currency || currency || "PHP").toUpperCase();

  // Classic Orders v2 shape expected by PayPal JS SDK Buttons:
  // create order on server → approve in SDK → capture on server.
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: payment.id.slice(0, 256),
        custom_id: `kinta:${payment.projectId}:${payment.id}`.slice(0, 127),
        description: `KINTA recovery ticket — ${payment.customerName}`.slice(
          0,
          127,
        ),
        soft_descriptor: "KINTA TICKET".slice(0, 22),
        amount: {
          currency_code: currencyCode,
          value: pesosValueFromCentavos(payment.amount),
        },
      },
    ],
    application_context: {
      brand_name: brandName.slice(0, 127),
      locale: "en-PH",
      landing_page: "LOGIN",
      shipping_preference: "NO_SHIPPING",
      user_action: "PAY_NOW",
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };
}

async function requireProjectPayment(projectId: string, customerPaymentId: string) {
  const payment = await prisma.customerPayment.findUnique({
    where: { id: customerPaymentId },
  });
  if (!payment) throw AppError.notFound("CustomerPayment", customerPaymentId);
  if (payment.projectId !== projectId) {
    throw AppError.badRequest("Payment does not belong to this project");
  }
  return payment;
}

export async function createCustomerPaymentOrder(input: {
  projectId: string;
  customerPaymentId: string;
}) {
  const payment = await requireProjectPayment(
    input.projectId,
    input.customerPaymentId,
  );

  if (payment.status === "CAPTURED" || payment.status === "REFUNDED") {
    throw AppError.conflict("Payment is already finalized", {
      status: payment.status,
      paypalOrderId: payment.paypalOrderId,
    });
  }

  // Reuse an existing CREATED order when present (JS SDK retries / reloads)
  if (payment.paypalOrderId && payment.status === "CREATED") {
    const existing = await getPayPalOrder(payment.paypalOrderId).catch(() => null);
    if (existing) {
      return {
        payment,
        orderId: payment.paypalOrderId,
        mode: getPayPalConfig().mode,
        order: existing,
        reused: true,
      };
    }
  }

  const { mode } = getPayPalConfig();
  let order: PayPalOrder;

  if (mode === "mock") {
    order = {
      id: mockId("MOCKORDER"),
      status: "CREATED",
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: payment.id,
          custom_id: `kinta:${payment.projectId}:${payment.id}`,
          amount: {
            currency_code: payment.currency || "PHP",
            value: pesosValueFromCentavos(payment.amount),
          },
        },
      ],
    };
  } else {
    order = await paypalFetch<PayPalOrder>("/v2/checkout/orders", {
      method: "POST",
      json: buildCreateOrderBody(payment),
    });
  }

  const updated = await prisma.customerPayment.update({
    where: { id: payment.id },
    data: {
      paypalOrderId: order.id,
      status: order.status === "APPROVED" ? "APPROVED" : "CREATED",
    },
  });

  await logActivity({
    projectId: payment.projectId,
    action: "PROJECT_UPDATED",
    entityType: "CustomerPayment",
    entityId: payment.id,
    message: `PayPal order created (${mode}): ${order.id}`,
    metadata: {
      mode,
      orderId: order.id,
      status: order.status,
      intent: "CAPTURE",
      amount: payment.amount,
      currency: payment.currency,
    },
  });

  return { payment: updated, orderId: order.id, mode, order, reused: false };
}

export async function getPayPalOrder(orderId: string): Promise<PayPalOrder> {
  const { mode } = getPayPalConfig();
  if (mode === "mock") {
    const payment = await prisma.customerPayment.findFirst({
      where: { paypalOrderId: orderId },
    });
    if (!payment) throw AppError.notFound("PayPal order", orderId);
    return {
      id: orderId,
      status: payment.status === "CAPTURED" ? "COMPLETED" : payment.status,
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: payment.id,
          amount: {
            currency_code: payment.currency || "PHP",
            value: pesosValueFromCentavos(payment.amount),
          },
          payments: payment.paypalCaptureId
            ? {
                captures: [
                  {
                    id: payment.paypalCaptureId,
                    status: "COMPLETED",
                  },
                ],
              }
            : undefined,
        },
      ],
    };
  }

  return paypalFetch<PayPalOrder>(`/v2/checkout/orders/${orderId}`, {
    method: "GET",
  });
}

export async function captureCustomerPaymentOrder(input: {
  projectId: string;
  customerPaymentId: string;
  orderId?: string;
}) {
  const payment = await requireProjectPayment(
    input.projectId,
    input.customerPaymentId,
  );

  const orderId = input.orderId ?? payment.paypalOrderId;
  if (!orderId) {
    throw AppError.badRequest("Payment has no PayPal order to capture");
  }

  if (payment.status === "CAPTURED" && payment.paypalCaptureId) {
    return {
      payment,
      orderId,
      captureId: payment.paypalCaptureId,
      mode: getPayPalConfig().mode,
      order: await getPayPalOrder(orderId).catch(() => null),
      alreadyCaptured: true,
    };
  }

  const { mode } = getPayPalConfig();
  let order: PayPalOrder;
  let captureId: string;

  if (mode === "mock") {
    captureId = mockId("MOCKCAPTURE");
    order = {
      id: orderId,
      status: "COMPLETED",
      intent: "CAPTURE",
      payer: {
        email_address: payment.customerEmail,
        name: { given_name: payment.customerName },
      },
      purchase_units: [
        {
          reference_id: payment.id,
          payments: {
            captures: [{ id: captureId, status: "COMPLETED" }],
          },
        },
      ],
    };
  } else {
    order = await paypalFetch<PayPalOrder>(
      `/v2/checkout/orders/${orderId}/capture`,
      { method: "POST", json: {} },
    );
    captureId = order.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? "";
    if (!captureId) {
      throw AppError.badRequest("PayPal capture response missing capture id", order);
    }
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
    metadata: {
      mode,
      orderId,
      captureId,
      status: order.status,
      payerEmail: order.payer?.email_address ?? payment.customerEmail,
    },
  });

  return {
    payment: updated,
    orderId,
    captureId,
    mode,
    order,
    alreadyCaptured: false,
  };
}
