import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDemoContext } from "@/lib/demo";
import { prisma } from "@/lib/prisma";

export const instant = false;

/** Convenience route → active project's dependency map. */
export default async function MapRedirectPage() {
  await connection();
  const { project } = await getDemoContext();
  if (!project) {
    redirect("/projects");
  }

  const disruption = await prisma.disruption.findFirst({
    where: { projectId: project.id },
    orderBy: { reportedAt: "desc" },
  });

  const qs = disruption ? `?disruptionId=${disruption.id}` : "";
  redirect(`/projects/${project.id}/map${qs}`);
}
