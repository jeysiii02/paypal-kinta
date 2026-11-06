import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logActivity } from "@/services/activity";
import {
  getPayPalConfig,
  mockId,
  paypalFetch,
} from "@/services/paypal/client";
import { toPesos } from "@/lib/money";
import { completeRecoveryAction, failRecoveryAction } from "@/services/recoveryActions";

type PayPalRefund = {
  id: string;
  status: string;
};

export async function refundCustomerPayment(input: {
  customerPaymentId: string;
  amountCentavos: number;
  reason?: string;
  recoveryActionId?: string;
}) {
  const payment = await prisma.customerPayment.findUnique({
    where: { id: input.customerPaymentId },
    include: { refunds: true },
  });
  if (!payment) throw AppError.notFound("CustomerPayment", input.customerPaymentId);

  if (!["CAPTURED", "PARTIALLY_REFUNDED"].includes(payment.status)) {
    throw AppError.badRequest(
      "Only CAPTURED or PARTIALLY_REFUNDED payments can be refunded",
      { status: payment.status },
    );
  }
  if (!payment.paypalCaptureId) {
    throw AppError.badRequest("Payment has no PayPal capture id");
  }
  if (input.amountCentavos <= 0) {
    throw AppError.badRequest("Refund amount must be positive");
  }

  const alreadyRefunded = payment.refunds
    .filter((r) => r.status === "COMPLETED")
    .reduce((sum, r) => sum + r.amount, 0);
  if (alreadyRefunded + input.amountCentavos > payment.amount) {
    throw AppError.badRequest("Refund exceeds captured payment amount");
  }

  const refundRow = await prisma.refund.create({
    data: {
      customerPaymentId: payment.id,
      amount: input.amountCentavos,
      reason: input.reason ?? null,
      status: "PENDING",
    },
  });

  const { mode } = getPayPalConfig();

  try {
    let paypalRefundId: string;
    let status: string;

    if (mode === "mock") {
      paypalRefundId = mockId("MOCKREFUND");
      status = "COMPLETED";
    } else {
      const refund = await paypalFetch<PayPalRefund>(
        `/v2/payments/captures/${payment.paypalCaptureId}/refund`,
        {
          method: "POST",
          json: {
            amount: {
              value: toPesos(input.amountCentavos).toFixed(2),
              currency_code: payment.currency || "PHP",
            },
            note_to_payer: input.reason ?? "KINTA recovery refund",
          },
        },
      );
      paypalRefundId = refund.id;
      status = refund.status;
    }

    const completed = await prisma.refund.update({
      where: { id: refundRow.id },
      data: {
        paypalRefundId,
        status: status === "COMPLETED" || mode === "mock" ? "COMPLETED" : "PENDING",
      },
    });

    const totalRefunded = alreadyRefunded + input.amountCentavos;
    const paymentStatus =
      totalRefunded >= payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";

    const updatedPayment = await prisma.customerPayment.update({
      where: { id: payment.id },
      data: { status: paymentStatus },
    });

    await logActivity({
      projectId: payment.projectId,
      action: "ACTION_STATUS_CHANGED",
      entityType: "Refund",
      entityId: completed.id,
      message: `PayPal refund ${completed.status} (${mode}): ${paypalRefundId}`,
      metadata: {
        mode,
        paypalRefundId,
        amount: input.amountCentavos,
        recoveryActionId: input.recoveryActionId ?? null,
      },
    });

    return { refund: completed, payment: updatedPayment, mode };
  } catch (error) {
    await prisma.refund.update({
      where: { id: refundRow.id },
      data: { status: "FAILED" },
    });
    throw error;
  }
}

/**
 * After recovery action approval: execute PayPal refund for CUSTOMER_REFUND actions.
 */
export async function executePaypalRecoveryAction(actionId: string) {
  const action = await prisma.recoveryAction.findUnique({
    where: { id: actionId },
  });
  if (!action) throw AppError.notFound("RecoveryAction", actionId);
  if (!action.requiresPaypal) {
    throw AppError.badRequest("Recovery action does not require PayPal");
  }
  if (action.status !== "APPROVED" && action.status !== "PROCESSING") {
    throw AppError.badRequest(
      "Recovery action must be APPROVED before PayPal execution",
      { status: action.status },
    );
  }
  if (action.type !== "CUSTOMER_REFUND") {
    throw AppError.badRequest(
      "Only CUSTOMER_REFUND PayPal execution is implemented in this demo",
    );
  }

  await prisma.recoveryAction.update({
    where: { id: actionId },
    data: { status: "PROCESSING" },
  });

  try {
    const payment = await prisma.customerPayment.findFirst({
      where: {
        projectId: action.projectId,
        status: { in: ["CAPTURED", "PARTIALLY_REFUNDED"] },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!payment) {
      // Demo helper: if seeded CREATED payments exist, mock-capture the first one.
      const seed = await prisma.customerPayment.findFirst({
        where: { projectId: action.projectId, status: "CREATED" },
        orderBy: { createdAt: "asc" },
      });
      if (!seed) {
        throw AppError.badRequest(
          "No captured customer payment available for refund",
        );
      }
      const { mode } = getPayPalConfig();
      if (mode !== "mock") {
        throw AppError.badRequest(
          "Capture a customer payment in PayPal Sandbox before refunding",
        );
      }
      await prisma.customerPayment.update({
        where: { id: seed.id },
        data: {
          paypalOrderId: mockId("MOCKORDER"),
          paypalCaptureId: mockId("MOCKCAPTURE"),
          status: "CAPTURED",
          capturedAt: new Date(),
        },
      });
    }

    const target =
      payment ??
      (await prisma.customerPayment.findFirst({
        where: {
          projectId: action.projectId,
          status: { in: ["CAPTURED", "PARTIALLY_REFUNDED"] },
        },
        orderBy: { createdAt: "asc" },
      }));

    if (!target) {
      throw AppError.badRequest("No customer payment available for refund");
    }

    const amount = action.amount && action.amount > 0 ? action.amount : target.amount;
    const result = await refundCustomerPayment({
      customerPaymentId: target.id,
      amountCentavos: Math.min(amount, target.amount),
      reason: action.title,
      recoveryActionId: action.id,
    });

    const completed = await completeRecoveryAction(actionId);
    return { action: completed, refund: result.refund, payment: result.payment, mode: result.mode };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "PayPal execution failed";
    await failRecoveryAction(actionId, message);
    throw error;
  }
}
