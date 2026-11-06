import { handleRouteError, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/** List users (demo helper — no auth in Developer 1 scope). */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        _count: { select: { projects: true } },
      },
    });
    return ok(users);
  } catch (error) {
    return handleRouteError(error);
  }
}
