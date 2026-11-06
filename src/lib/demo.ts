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

  const projects = await listProjects({ userId: user.id });
  const project =
    projects.find((item) => item.name === "University Tech Summit") ?? projects[0];

  return { user, projects, project };
}
