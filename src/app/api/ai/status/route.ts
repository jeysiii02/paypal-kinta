import { handleRouteError, ok } from "@/lib/api";
import { getAiTechStatus } from "@/services/ai/status";

export async function GET() {
  try {
    return ok(getAiTechStatus());
  } catch (error) {
    return handleRouteError(error);
  }
}
