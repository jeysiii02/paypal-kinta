import { cookies } from "next/headers";
import { getDemoContext } from "@/lib/demo";

export const ACTIVE_PROJECT_COOKIE = "kinta_active_project";

/**
 * Resolve the active workspace project:
 * 1) explicit override (from page props / URL)
 * 2) cookie set when visiting /projects/:id
 * 3) demo fallback
 */
export async function getWorkspaceContext(overrideProjectId?: string | null) {
  const { user, projects, project: demoDefault } = await getDemoContext();
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? null;
  const preferredId = overrideProjectId || fromCookie;

  const project =
    (preferredId
      ? projects.find((item) => item.id === preferredId)
      : undefined) ??
    demoDefault ??
    projects[0] ??
    null;

  return { user, projects, project };
}
