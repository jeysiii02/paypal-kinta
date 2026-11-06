import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logActivity } from "@/services/activity";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "@/lib/validators/projects";

const projectDetailInclude = {
  user: { select: { id: true, email: true, name: true } },
  suppliers: { orderBy: { name: "asc" as const } },
  commitments: {
    include: {
      supplier: { select: { id: true, name: true, category: true } },
      dependencies: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
  expenses: { orderBy: { incurredAt: "desc" as const } },
  customerPayments: {
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      amount: true,
      currency: true,
      status: true,
      paypalOrderId: true,
      paypalCaptureId: true,
      capturedAt: true,
      createdAt: true,
    },
  },
  disruptions: { orderBy: { reportedAt: "desc" as const } },
  _count: {
    select: {
      suppliers: true,
      commitments: true,
      expenses: true,
      disruptions: true,
      recoveryActions: true,
      activityLogs: true,
    },
  },
} satisfies Prisma.ProjectInclude;

export async function createProject(input: CreateProjectInput) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) {
    throw AppError.notFound("User", input.userId);
  }

  const project = await prisma.project.create({
    data: {
      userId: input.userId,
      name: input.name,
      description: input.description ?? null,
      eventDate: input.eventDate,
      location: input.location,
      budget: input.budget,
      expectedAttendees: input.expectedAttendees,
      status: input.status ?? "DRAFT",
    },
  });

  await logActivity({
    projectId: project.id,
    userId: input.userId,
    action: "PROJECT_CREATED",
    entityType: "Project",
    entityId: project.id,
    message: `Project created: ${project.name}`,
    metadata: { status: project.status, budget: project.budget },
  });

  return project;
}

export async function listProjects(filters?: {
  userId?: string;
  includeArchived?: boolean;
}) {
  const where: Prisma.ProjectWhereInput = {};

  if (filters?.userId) {
    where.userId = filters.userId;
  }

  if (!filters?.includeArchived) {
    where.status = { not: "ARCHIVED" };
  }

  return prisma.project.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { id: true, email: true, name: true } },
      _count: {
        select: {
          suppliers: true,
          commitments: true,
          expenses: true,
          disruptions: true,
        },
      },
    },
  });
}

export async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: projectDetailInclude,
  });

  if (!project) {
    throw AppError.notFound("Project", id);
  }

  return project;
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound("Project", id);
  }

  if (existing.status === "ARCHIVED" && input.status !== "ACTIVE") {
    throw AppError.badRequest(
      "Archived projects cannot be updated unless restoring status to ACTIVE",
    );
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.eventDate !== undefined ? { eventDate: input.eventDate } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.budget !== undefined ? { budget: input.budget } : {}),
      ...(input.expectedAttendees !== undefined
        ? { expectedAttendees: input.expectedAttendees }
        : {}),
      ...(input.status !== undefined
        ? {
            status: input.status,
            archivedAt: input.status === "ARCHIVED" ? new Date() : null,
          }
        : {}),
    },
  });

  await logActivity({
    projectId: project.id,
    userId: project.userId,
    action: "PROJECT_UPDATED",
    entityType: "Project",
    entityId: project.id,
    message: `Project updated: ${project.name}`,
    metadata: { changes: input },
  });

  return project;
}

export async function archiveProject(id: string) {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound("Project", id);
  }

  if (existing.status === "ARCHIVED") {
    throw AppError.conflict("Project is already archived");
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      status: "ARCHIVED",
      archivedAt: new Date(),
    },
  });

  await logActivity({
    projectId: project.id,
    userId: project.userId,
    action: "PROJECT_ARCHIVED",
    entityType: "Project",
    entityId: project.id,
    message: `Project archived: ${project.name}`,
  });

  return project;
}
