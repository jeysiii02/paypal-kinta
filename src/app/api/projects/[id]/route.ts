import { handleRouteError, ok, readJson } from "@/lib/api";
import { updateProjectSchema } from "@/lib/validators/projects";
import { getProject, updateProject } from "@/services/projects";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const project = await getProject(id);
    return ok(project);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const input = updateProjectSchema.parse(body);
    const project = await updateProject(id, input);
    return ok(project);
  } catch (error) {
    return handleRouteError(error);
  }
}
