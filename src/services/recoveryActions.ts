import type { Prisma, RecoveryActionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logActivity } from "@/services/activity";
import type {
  CreateRecoveryActionInput,
  UpdateRecoveryActionInput,
} from "@/lib/validators/recovery";

async function requireProject(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw AppError.notFound("Project", projectId);
  return project;
}

export async function createRecoveryAction(
  projectId: string,
  input: CreateRecoveryActionInput,
) {
  await requireProject(projectId);

  if (input.scenarioId) {
    const scenario = await prisma.scenario.findUnique({
      where: { id: input.scenarioId },
    });
    if (!scenario) throw AppError.notFound("Scenario", input.scenarioId);
    if (scenario.projectId !== projectId) {
      throw AppError.badRequest("Scenario does not belong to this project");
    }
  }

  if (input.commitmentId) {
    const commitment = await prisma.commitment.findUnique({
      where: { id: input.commitmentId },
    });
    if (!commitment) throw AppError.notFound("Commitment", input.commitmentId);
    if (commitment.projectId !== projectId) {
      throw AppError.badRequest("Commitment does not belong to this project");
    }
  }

  const action = await prisma.recoveryAction.create({
    data: {
      projectId,
      scenarioId: input.scenarioId ?? null,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      commitmentId: input.commitmentId ?? null,
      amount: input.amount ?? null,
      requiresPaypal: input.requiresPaypal ?? false,
      status: input.status ?? "DRAFT",
    },
  });

  await logActivity({
    projectId,
    action: "ACTION_CREATED",
    entityType: "RecoveryAction",
    entityId: action.id,
    message: `Recovery action created: ${action.title}`,
    metadata: { type: action.type, status: action.status },
  });

  return action;
}

export async function listRecoveryActions(
  projectId: string,
  filters?: { status?: RecoveryActionStatus; scenarioId?: string },
) {
  await requireProject(projectId);

  const where: Prisma.RecoveryActionWhereInput = { projectId };
  if (filters?.status) where.status = filters.status;
  if (filters?.scenarioId) where.scenarioId = filters.scenarioId;

  return prisma.recoveryAction.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecoveryAction(id: string) {
  const action = await prisma.recoveryAction.findUnique({
    where: { id },
    include: {
      scenario: { select: { id: true, strategy: true, summary: true } },
      project: { select: { id: true, name: true } },
    },
  });
  if (!action) throw AppError.notFound("RecoveryAction", id);
  return action;
}

export async function updateRecoveryAction(
  id: string,
  input: UpdateRecoveryActionInput,
) {
  const existing = await prisma.recoveryAction.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("RecoveryAction", id);

  const statusChanged =
    input.status !== undefined && input.status !== existing.status;

  const action = await prisma.recoveryAction.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.commitmentId !== undefined
        ? { commitmentId: input.commitmentId }
        : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.requiresPaypal !== undefined
        ? { requiresPaypal: input.requiresPaypal }
        : {}),
      ...(input.scenarioId !== undefined
        ? { scenarioId: input.scenarioId }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });

  await logActivity({
    projectId: action.projectId,
    action: statusChanged ? "ACTION_STATUS_CHANGED" : "ACTION_CREATED",
    entityType: "RecoveryAction",
    entityId: action.id,
    message: statusChanged
      ? `Recovery action status: ${existing.status} → ${action.status}`
      : `Recovery action updated: ${action.title}`,
    metadata: { changes: input },
  });

  return action;
}

/** Approval updates application record only — no PayPal execution. */
export async function approveRecoveryAction(id: string) {
  const existing = await prisma.recoveryAction.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("RecoveryAction", id);

  if (existing.status === "APPROVED") {
    throw AppError.conflict("Action is already approved");
  }
  if (existing.status === "REJECTED" || existing.status === "COMPLETED") {
    throw AppError.badRequest(
      `Cannot approve action in status ${existing.status}`,
    );
  }

  const action = await prisma.recoveryAction.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      rejectedAt: null,
      rejectionReason: null,
    },
  });

  await logActivity({
    projectId: action.projectId,
    action: "ACTION_APPROVED",
    entityType: "RecoveryAction",
    entityId: action.id,
    message: `Recovery action approved: ${action.title}`,
    metadata: {
      requiresPaypal: action.requiresPaypal,
      note: "Approval recorded only — PayPal execution is Developer 2 scope",
    },
  });

  return action;
}

export async function rejectRecoveryAction(id: string, reason: string) {
  const existing = await prisma.recoveryAction.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("RecoveryAction", id);

  const action = await prisma.recoveryAction.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectionReason: reason,
    },
  });

  await logActivity({
    projectId: action.projectId,
    action: "ACTION_REJECTED",
    entityType: "RecoveryAction",
    entityId: action.id,
    message: `Recovery action rejected: ${action.title}`,
    metadata: { reason },
  });

  return action;
}

export async function completeRecoveryAction(id: string) {
  const existing = await prisma.recoveryAction.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("RecoveryAction", id);

  const action = await prisma.recoveryAction.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      failedAt: null,
      failureReason: null,
    },
  });

  await logActivity({
    projectId: action.projectId,
    action: "ACTION_STATUS_CHANGED",
    entityType: "RecoveryAction",
    entityId: action.id,
    message: `Recovery action completed: ${action.title}`,
  });

  return action;
}

export async function failRecoveryAction(id: string, reason: string) {
  const existing = await prisma.recoveryAction.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("RecoveryAction", id);

  const action = await prisma.recoveryAction.update({
    where: { id },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      failureReason: reason,
    },
  });

  await logActivity({
    projectId: action.projectId,
    action: "ACTION_STATUS_CHANGED",
    entityType: "RecoveryAction",
    entityId: action.id,
    message: `Recovery action failed: ${action.title}`,
    metadata: { reason },
  });

  return action;
}
