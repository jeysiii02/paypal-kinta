import { handleRouteError, ok } from "@/lib/api";
import { approveRecoveryAction } from "@/services/recoveryActions";

type Params = { params: Promise<{ id: string }> };

/** Approves action record only — does not execute PayPal. */
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const action = await approveRecoveryAction(id);
    return ok(action);
  } catch (error) {
    return handleRouteError(error);
  }
}
