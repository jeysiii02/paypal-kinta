import { handleRouteError, ok, readJson } from "@/lib/api";
import { ingestPayPalWebhook } from "@/services/paypal/webhooks";

export async function POST(request: Request) {
  try {
    const payload = await readJson(request);
    const result = await ingestPayPalWebhook(
      {
        transmissionId: request.headers.get("paypal-transmission-id"),
        transmissionTime: request.headers.get("paypal-transmission-time"),
        certUrl: request.headers.get("paypal-cert-url"),
        authAlgo: request.headers.get("paypal-auth-algo"),
        transmissionSig: request.headers.get("paypal-transmission-sig"),
      },
      payload,
    );
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
