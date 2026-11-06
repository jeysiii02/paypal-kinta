import { prisma } from "@/lib/prisma";
import { listProjects } from "@/services/projects";

/** Bootstrap the seeded demo organizer + primary project. */
export async function getDemoContext() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  const user =
    users.find((item) => item.email === "organizer@kinta-demo.local") ?? users[0];

  if (!user) {
    throw new Error("No demo users found. Run `npx prisma db seed`.");
  }

  // Newest first — cookie/workspace layer picks the active project.
  const projects = await listProjects({ userId: user.id });
  const project = projects[0] ?? null;

  return { user, projects, project };
}
