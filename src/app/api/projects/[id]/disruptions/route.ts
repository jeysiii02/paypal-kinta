import { created, handleRouteError, ok, readJson } from "@/lib/api";
import { createDisruptionSchema } from "@/lib/validators/disruptions";
import { createDisruption, listDisruptions } from "@/services/disruptions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const disruptions = await listDisruptions(projectId);
    return ok(disruptions);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const body = await readJson(request);
    const input = createDisruptionSchema.parse(body);
    const disruption = await createDisruption(projectId, input);
    return created(disruption);
  } catch (error) {
    return handleRouteError(error);
  }
}
