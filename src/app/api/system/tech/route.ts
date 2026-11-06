import { handleRouteError, ok } from "@/lib/api";
import { getAiTechStatus } from "@/services/ai/status";
import { getPayPalTechStatus } from "@/services/paypal/client";

/**
 * Judge/demo helper — shows how PayPal + AI are wired without leaking secrets.
 * GET /api/system/tech
 */
export async function GET() {
  try {
    const ai = getAiTechStatus();
    const paypal = getPayPalTechStatus();

    return ok({
      product: "KINTA",
      requirement: "Meaningfully uses PayPal + AI",
      ai,
      paypal,
      integrationHighlights: [
        "AI analyzes disruptions and proposes recovery strategies",
        "Deterministic finance engine recalculates scenario money",
        "Approved CUSTOMER_REFUND actions execute via PayPal Captures refund API",
        "Webhook inbox persists PayPal events for idempotent processing",
        "JS SDK Buttons supported in live Sandbox mode",
      ],
      readyForDemo: ai.ready && (paypal.mode === "mock" || paypal.sdkReady),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
