import { handleRouteError, ok } from "@/lib/api";
import { getDisruptionAnalysis } from "@/services/disruptions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const result = await getDisruptionAnalysis(id);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
