import { handleRouteError, ok } from "@/lib/api";
import { getRecoveryPlan } from "@/services/recoveryPlans";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const plan = await getRecoveryPlan(id);
    return ok(plan);
  } catch (error) {
    return handleRouteError(error);
  }
}
