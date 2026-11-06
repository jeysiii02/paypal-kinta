import { z } from "zod";
import { created, handleRouteError, readJson } from "@/lib/api";
import { createRecoveryPlansForDisruption } from "@/services/recoveryPlans";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z
  .object({
    userAssumptions: z.array(z.string()).optional(),
  })
  .optional()
  .default({});

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    let body: unknown = {};
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      body = await readJson(request);
    }
    const input = bodySchema.parse(body ?? {});
    const plan = await createRecoveryPlansForDisruption(id, input);
    return created(plan);
  } catch (error) {
    return handleRouteError(error);
  }
}
