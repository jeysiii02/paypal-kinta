import { handleRouteError, ok, readJson } from "@/lib/api";
import { failActionSchema } from "@/lib/validators/recovery";
import { failRecoveryAction } from "@/services/recoveryActions";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const input = failActionSchema.parse(body);
    const action = await failRecoveryAction(id, input.reason);
    return ok(action);
  } catch (error) {
    return handleRouteError(error);
  }
}
