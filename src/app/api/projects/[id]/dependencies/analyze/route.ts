import { z } from "zod";
import { handleRouteError, ok, readJson } from "@/lib/api";
import { cuidSchema } from "@/lib/validators/common";
import { analyzeProjectDependencies } from "@/services/dependency";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  seedCommitmentIds: z.array(cuidSchema).min(1),
});

/**
 * POST /api/projects/:id/dependencies/analyze
 * Standalone graph analysis with explicit seed commitments.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const body = await readJson(request);
    const input = bodySchema.parse(body);
    const result = await analyzeProjectDependencies(
      projectId,
      input.seedCommitmentIds,
    );
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
