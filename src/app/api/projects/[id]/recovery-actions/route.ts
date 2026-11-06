import { created, handleRouteError, ok, readJson } from "@/lib/api";
import {
  createRecoveryActionSchema,
  recoveryActionStatusSchema,
} from "@/lib/validators/recovery";
import {
  createRecoveryAction,
  listRecoveryActions,
} from "@/services/recoveryActions";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const statusRaw = searchParams.get("status");
    const scenarioId = searchParams.get("scenarioId") ?? undefined;
    const status = statusRaw
      ? recoveryActionStatusSchema.parse(statusRaw)
      : undefined;

    const actions = await listRecoveryActions(projectId, {
      status,
      scenarioId,
    });
    return ok(actions);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const body = await readJson(request);
    const input = createRecoveryActionSchema.parse(body);
    const action = await createRecoveryAction(projectId, input);
    return created(action);
  } catch (error) {
    return handleRouteError(error);
  }
}
