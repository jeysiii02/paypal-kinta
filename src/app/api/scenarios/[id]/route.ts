import { handleRouteError, ok } from "@/lib/api";
import { getScenario } from "@/services/recoveryPlans";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const scenario = await getScenario(id);
    return ok(scenario);
  } catch (error) {
    return handleRouteError(error);
  }
}
