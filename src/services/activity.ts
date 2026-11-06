import type { ActivityAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type LogActivityInput = {
  projectId: string;
  action: ActivityAction;
  entityType: string;
  entityId?: string | null;
  message: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logActivity(input: LogActivityInput) {
  return prisma.activityLog.create({
    data: {
      projectId: input.projectId,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      message: input.message,
      metadataJson: JSON.stringify(input.metadata ?? {}),
    },
  });
}

export async function listActivityByProject(
  projectId: string,
  options?: { limit?: number; action?: ActivityAction },
) {
  const where: Prisma.ActivityLogWhereInput = { projectId };
  if (options?.action) {
    where.action = options.action;
  }

  return prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 100,
  });
}
