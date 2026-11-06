import { handleRouteError, ok, readJson } from "@/lib/api";
import { updateRecoveryActionSchema } from "@/lib/validators/recovery";
import {
  getRecoveryAction,
  updateRecoveryAction,
} from "@/services/recoveryActions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const action = await getRecoveryAction(id);
    return ok(action);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const input = updateRecoveryActionSchema.parse(body);
    const action = await updateRecoveryAction(id, input);
    return ok(action);
  } catch (error) {
    return handleRouteError(error);
  }
}
