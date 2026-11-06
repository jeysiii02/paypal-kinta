import { handleRouteError, ok } from "@/lib/api";
import { completeRecoveryAction } from "@/services/recoveryActions";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const action = await completeRecoveryAction(id);
    return ok(action);
  } catch (error) {
    return handleRouteError(error);
  }
}
