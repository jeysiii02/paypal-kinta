import { handleRouteError, ok, readJson } from "@/lib/api";
import { rejectActionSchema } from "@/lib/validators/recovery";
import { rejectRecoveryAction } from "@/services/recoveryActions";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const input = rejectActionSchema.parse(body);
    const action = await rejectRecoveryAction(id, input.reason);
    return ok(action);
  } catch (error) {
    return handleRouteError(error);
  }
}
