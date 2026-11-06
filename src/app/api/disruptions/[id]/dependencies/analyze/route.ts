import { handleRouteError, ok, readJson } from "@/lib/api";
import { analyzeDependenciesBodySchema } from "@/lib/validators/dependency";
import { analyzeDisruptionDependencies } from "@/services/dependency";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/disruptions/:id/dependencies/analyze
 * Runs identifyAffectedCommitments() using EventAnalysis seeds or body.seedCommitmentIds.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    let body: unknown = {};
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      body = await readJson(request);
    }
    const input = analyzeDependenciesBodySchema.parse(body ?? {});
    const result = await analyzeDisruptionDependencies(id, input);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
