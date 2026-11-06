import { handleRouteError, ok } from "@/lib/api";
import { getStoredDependencyAnalysis } from "@/services/dependency";

type Params = { params: Promise<{ id: string }> };

/** GET stored dependency analysis (after POST .../dependencies/analyze). */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const result = await getStoredDependencyAnalysis(id);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
