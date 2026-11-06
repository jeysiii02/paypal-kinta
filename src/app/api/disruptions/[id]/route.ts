import { handleRouteError, ok, readJson } from "@/lib/api";
import { updateDisruptionSchema } from "@/lib/validators/disruptions";
import { getDisruption, updateDisruption } from "@/services/disruptions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const disruption = await getDisruption(id);
    return ok(disruption);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const input = updateDisruptionSchema.parse(body);
    const disruption = await updateDisruption(id, input);
    return ok(disruption);
  } catch (error) {
    return handleRouteError(error);
  }
}
