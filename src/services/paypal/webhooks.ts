import { createHash, createVerify } from "crypto";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import {
  getPayPalConfig,
  paypalFetch,
} from "@/services/paypal/client";

type WebhookHeaders = {
  transmissionId?: string | null;
  transmissionTime?: string | null;
  certUrl?: string | null;
  authAlgo?: string | null;
  transmissionSig?: string | null;
};

export async function ingestPayPalWebhook(
  headers: WebhookHeaders,
  payload: unknown,
) {
  const body = payload as {
    id?: string;
    event_type?: string;
    resource?: Record<string, unknown>;
  };

  const paypalEventId =
    body.id ??
    `generated_${createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 24)}`;
  const eventType = body.event_type ?? "UNKNOWN";

  const existing = await prisma.webhookEvent.findUnique({
    where: { paypalEventId },
  });
  if (existing) {
    return { event: existing, duplicate: true };
  }

  const { mode, webhookId } = getPayPalConfig();
  let verified = mode === "mock";

  if (mode === "live") {
    if (!webhookId) {
      throw AppError.badRequest("PAYPAL_WEBHOOK_ID is required for live webhooks");
    }
    verified = await verifyPayPalWebhookSignature({
      webhookId,
      headers,
      payload,
    });
    if (!verified) {
      throw AppError.badRequest("PayPal webhook signature verification failed");
    }
  }

  const event = await prisma.webhookEvent.create({
    data: {
      paypalEventId,
      eventType,
      processingStatus: "RECEIVED",
      payloadJson: JSON.stringify(payload),
    },
  });

  try {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { processingStatus: "PROCESSING" },
    });

    await applyWebhookSideEffects(eventType, body.resource ?? {});

    const processed = await prisma.webhookEvent.update({
      where: { id: event.id },
      data: {
        processingStatus: "PROCESSED",
        processedAt: new Date(),
      },
    });

    return { event: processed, duplicate: false, verified, mode };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    const failed = await prisma.webhookEvent.update({
      where: { id: event.id },
      data: {
        processingStatus: "FAILED",
        errorMessage: message,
        processedAt: new Date(),
      },
    });
    return { event: failed, duplicate: false, verified, mode, error: message };
  }
}

async function verifyPayPalWebhookSignature(input: {
  webhookId: string;
  headers: WebhookHeaders;
  payload: unknown;
}) {
  const {
    transmissionId,
    transmissionTime,
    certUrl,
    authAlgo,
    transmissionSig,
  } = input.headers;

  if (
    !transmissionId ||
    !transmissionTime ||
    !certUrl ||
    !authAlgo ||
    !transmissionSig
  ) {
    return false;
  }

  try {
    const result = await paypalFetch<{ verification_status: string }>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        json: {
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          cert_url: certUrl,
          auth_algo: authAlgo,
          transmission_sig: transmissionSig,
          webhook_id: input.webhookId,
          webhook_event: input.payload,
        },
      },
    );
    return result.verification_status === "SUCCESS";
  } catch {
    // Fallback local verify is intentionally not implemented; rely on PayPal API.
    void createVerify;
    return false;
  }
}

async function applyWebhookSideEffects(
  eventType: string,
  resource: Record<string, unknown>,
) {
  const orderId =
    typeof resource.id === "string" && eventType.includes("CHECKOUT.ORDER")
      ? resource.id
      : typeof resource.supplementary_data === "object" &&
          resource.supplementary_data &&
          "related_ids" in resource.supplementary_data
        ? String(
            (resource.supplementary_data as { related_ids?: { order_id?: string } })
              .related_ids?.order_id ?? "",
          )
        : "";

  const captureId =
    eventType.includes("PAYMENT.CAPTURE") && typeof resource.id === "string"
      ? resource.id
      : "";

  if (eventType === "CHECKOUT.ORDER.APPROVED" && orderId) {
    await prisma.customerPayment.updateMany({
      where: { paypalOrderId: orderId },
      data: { status: "APPROVED" },
    });
  }

  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    const relatedOrderId =
      orderId ||
      (typeof resource.supplementary_data === "object" &&
      resource.supplementary_data &&
      "related_ids" in resource.supplementary_data
        ? String(
            (resource.supplementary_data as { related_ids?: { order_id?: string } })
              .related_ids?.order_id ?? "",
          )
        : "");
    if (captureId) {
      await prisma.customerPayment.updateMany({
        where: relatedOrderId
          ? { paypalOrderId: relatedOrderId }
          : { paypalCaptureId: captureId },
        data: {
          paypalCaptureId: captureId,
          status: "CAPTURED",
          capturedAt: new Date(),
        },
      });
    }
  }

  if (eventType === "PAYMENT.CAPTURE.REFUNDED" && captureId) {
    await prisma.customerPayment.updateMany({
      where: { paypalCaptureId: captureId },
      data: { status: "REFUNDED" },
    });
  }
}
