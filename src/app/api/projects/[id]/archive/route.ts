import { handleRouteError, ok } from "@/lib/api";
import { archiveProject } from "@/services/projects";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const project = await archiveProject(id);
    return ok(project);
  } catch (error) {
    return handleRouteError(error);
  }
}
