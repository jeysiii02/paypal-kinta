import { handleRouteError, ok } from "@/lib/api";
import { listRecoveryPlans } from "@/services/recoveryPlans";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const plans = await listRecoveryPlans(projectId);
    return ok(plans);
  } catch (error) {
    return handleRouteError(error);
  }
}
