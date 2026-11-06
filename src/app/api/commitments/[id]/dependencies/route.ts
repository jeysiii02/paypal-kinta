import { created, handleRouteError, ok, readJson } from "@/lib/api";
import { createDependencySchema } from "@/lib/validators/commitments";
import { addDependency, listDependencies } from "@/services/commitments";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id: commitmentId } = await params;
    const dependencies = await listDependencies(commitmentId);
    return ok(dependencies);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id: commitmentId } = await params;
    const body = await readJson(request);
    const input = createDependencySchema.parse(body);
    const dependency = await addDependency(commitmentId, input);
    return created(dependency);
  } catch (error) {
    return handleRouteError(error);
  }
}
