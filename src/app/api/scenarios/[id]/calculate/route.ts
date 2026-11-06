import { handleRouteError, ok, readJson } from "@/lib/api";
import { scenarioAssumptionsSchema } from "@/lib/validators/finance";
import { recalculateScenario } from "@/services/recoveryPlans";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/scenarios/:id/calculate
 * Body: optional ScenarioAssumptions patch (centavos).
 * Deterministic financial engine only — AI does not compute final money.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    let patch = {};
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await readJson(request);
      patch = scenarioAssumptionsSchema.parse(body ?? {});
    }
    const scenario = await recalculateScenario(id, patch);
    return ok(scenario);
  } catch (error) {
    return handleRouteError(error);
  }
}
