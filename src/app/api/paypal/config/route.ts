import { handleRouteError, ok } from "@/lib/api";
import { getPublicPayPalConfig } from "@/services/paypal/client";

export async function GET() {
  try {
    return ok(getPublicPayPalConfig());
  } catch (error) {
    return handleRouteError(error);
  }
}
