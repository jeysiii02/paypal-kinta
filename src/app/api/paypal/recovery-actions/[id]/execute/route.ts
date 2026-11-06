import { handleRouteError, ok } from "@/lib/api";
import { executePaypalRecoveryAction } from "@/services/paypal/refunds";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const result = await executePaypalRecoveryAction(id);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
