import { handleRouteError, ok } from "@/lib/api";
import { runDisruptionAnalysis } from "@/services/disruptions";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/disruptions/:id/analyze
 * Runs analyzeBusinessEvent() using Gemini (AI_API_KEY) or heuristic provider.
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const result = await runDisruptionAnalysis(id);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
