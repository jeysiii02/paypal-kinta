import { created, handleRouteError, ok, readJson } from "@/lib/api";
import { createProjectSchema } from "@/lib/validators/projects";
import { createProject, listProjects } from "@/services/projects";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? undefined;
    const includeArchived = searchParams.get("includeArchived") === "true";

    const projects = await listProjects({ userId, includeArchived });
    return ok(projects);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const input = createProjectSchema.parse(body);
    const project = await createProject(input);
    return created(project);
  } catch (error) {
    return handleRouteError(error);
  }
}
