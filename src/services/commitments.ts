import type { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logActivity } from "@/services/activity";
import type {
  CreateCommitmentInput,
  CreateDependencyInput,
  UpdateCommitmentInput,
} from "@/lib/validators/commitments";

function derivePaymentStatus(
  agreedAmount: number,
  amountPaid: number,
  current?: PaymentStatus,
): PaymentStatus {
  if (current === "REFUNDED" || current === "PARTIALLY_REFUNDED") {
    return current;
  }
  if (amountPaid <= 0) return "UNPAID";
  if (amountPaid >= agreedAmount) return "PAID";
  return "PARTIAL";
}

async function requireProject(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw AppError.notFound("Project", projectId);
  }
  return project;
}

async function assertSupplierInProject(supplierId: string, projectId: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
  });
  if (!supplier) {
    throw AppError.notFound("Supplier", supplierId);
  }
  if (supplier.projectId !== projectId) {
    throw AppError.badRequest(
      "Supplier does not belong to this project",
      { supplierId, projectId },
    );
  }
  return supplier;
}

export async function createCommitment(
  projectId: string,
  input: CreateCommitmentInput,
) {
  await requireProject(projectId);
  await assertSupplierInProject(input.supplierId, projectId);

  const amountPaid = input.amountPaid ?? 0;
  const paymentStatus =
    input.paymentStatus ??
    derivePaymentStatus(input.agreedAmount, amountPaid);

  const commitment = await prisma.commitment.create({
    data: {
      projectId,
      supplierId: input.supplierId,
      title: input.title,
      description: input.description ?? null,
      agreedAmount: input.agreedAmount,
      amountPaid,
      paymentStatus,
      serviceDate: input.serviceDate ?? null,
      cancellationConditions: input.cancellationConditions ?? null,
      refundConditions: input.refundConditions ?? null,
      status: input.status ?? "DRAFT",
    },
    include: {
      supplier: { select: { id: true, name: true, category: true } },
    },
  });

  await logActivity({
    projectId,
    action: "COMMITMENT_CREATED",
    entityType: "Commitment",
    entityId: commitment.id,
    message: `Commitment created: ${commitment.title}`,
    metadata: {
      agreedAmount: commitment.agreedAmount,
      supplierId: commitment.supplierId,
    },
  });

  return commitment;
}

export async function listCommitments(projectId: string) {
  await requireProject(projectId);

  return prisma.commitment.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    include: {
      supplier: { select: { id: true, name: true, category: true } },
      dependencies: {
        include: {
          dependsOnCommitment: {
            select: { id: true, title: true, status: true },
          },
        },
      },
      dependents: {
        include: {
          commitment: { select: { id: true, title: true, status: true } },
        },
      },
    },
  });
}

export async function getCommitment(id: string) {
  const commitment = await prisma.commitment.findUnique({
    where: { id },
    include: {
      supplier: true,
      project: { select: { id: true, name: true, status: true, eventDate: true } },
      dependencies: {
        include: {
          dependsOnCommitment: {
            select: { id: true, title: true, status: true },
          },
        },
      },
      dependents: {
        include: {
          commitment: { select: { id: true, title: true, status: true } },
        },
      },
      expenses: true,
    },
  });

  if (!commitment) {
    throw AppError.notFound("Commitment", id);
  }

  return commitment;
}

export async function updateCommitment(
  id: string,
  input: UpdateCommitmentInput,
) {
  const existing = await prisma.commitment.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound("Commitment", id);
  }

  if (input.supplierId) {
    await assertSupplierInProject(input.supplierId, existing.projectId);
  }

  const agreedAmount = input.agreedAmount ?? existing.agreedAmount;
  const amountPaid = input.amountPaid ?? existing.amountPaid;

  if (amountPaid > agreedAmount) {
    throw AppError.validation("amountPaid cannot exceed agreedAmount");
  }

  const paymentStatus =
    input.paymentStatus ??
    derivePaymentStatus(agreedAmount, amountPaid, existing.paymentStatus);

  const statusChanged =
    input.status !== undefined && input.status !== existing.status;

  const commitment = await prisma.commitment.update({
    where: { id },
    data: {
      ...(input.supplierId !== undefined
        ? { supplierId: input.supplierId }
        : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.agreedAmount !== undefined
        ? { agreedAmount: input.agreedAmount }
        : {}),
      ...(input.amountPaid !== undefined ? { amountPaid: input.amountPaid } : {}),
      paymentStatus,
      ...(input.serviceDate !== undefined
        ? { serviceDate: input.serviceDate }
        : {}),
      ...(input.cancellationConditions !== undefined
        ? { cancellationConditions: input.cancellationConditions }
        : {}),
      ...(input.refundConditions !== undefined
        ? { refundConditions: input.refundConditions }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
    include: {
      supplier: { select: { id: true, name: true, category: true } },
    },
  });

  await logActivity({
    projectId: commitment.projectId,
    action: statusChanged
      ? "COMMITMENT_STATUS_CHANGED"
      : "COMMITMENT_UPDATED",
    entityType: "Commitment",
    entityId: commitment.id,
    message: statusChanged
      ? `Commitment status changed: ${existing.status} → ${commitment.status}`
      : `Commitment updated: ${commitment.title}`,
    metadata: {
      changes: input,
      previousStatus: existing.status,
      newStatus: commitment.status,
    },
  });

  return commitment;
}

export async function addDependency(
  commitmentId: string,
  input: CreateDependencyInput,
) {
  const commitment = await prisma.commitment.findUnique({
    where: { id: commitmentId },
  });
  if (!commitment) {
    throw AppError.notFound("Commitment", commitmentId);
  }

  if (input.dependsOnCommitmentId) {
    if (input.dependsOnCommitmentId === commitmentId) {
      throw AppError.badRequest("A commitment cannot depend on itself");
    }

    const dependsOn = await prisma.commitment.findUnique({
      where: { id: input.dependsOnCommitmentId },
    });
    if (!dependsOn) {
      throw AppError.notFound("Commitment", input.dependsOnCommitmentId);
    }
    if (dependsOn.projectId !== commitment.projectId) {
      throw AppError.badRequest(
        "dependsOnCommitment must belong to the same project",
      );
    }
  }

  const dependency = await prisma.commitmentDependency.create({
    data: {
      commitmentId,
      dependencyType: input.dependencyType,
      description: input.description,
      dependsOnCommitmentId: input.dependsOnCommitmentId ?? null,
    },
    include: {
      dependsOnCommitment: {
        select: { id: true, title: true, status: true },
      },
    },
  });

  await logActivity({
    projectId: commitment.projectId,
    action: "COMMITMENT_UPDATED",
    entityType: "CommitmentDependency",
    entityId: dependency.id,
    message: `Dependency added to commitment: ${commitment.title}`,
    metadata: {
      dependencyType: dependency.dependencyType,
      dependsOnCommitmentId: dependency.dependsOnCommitmentId,
    },
  });

  return dependency;
}

export async function listDependencies(commitmentId: string) {
  const commitment = await prisma.commitment.findUnique({
    where: { id: commitmentId },
  });
  if (!commitment) {
    throw AppError.notFound("Commitment", commitmentId);
  }

  return prisma.commitmentDependency.findMany({
    where: { commitmentId },
    orderBy: { createdAt: "asc" },
    include: {
      dependsOnCommitment: {
        select: { id: true, title: true, status: true },
      },
    },
  });
}

export async function deleteDependency(id: string) {
  const existing = await prisma.commitmentDependency.findUnique({
    where: { id },
    include: { commitment: { select: { id: true, projectId: true, title: true } } },
  });

  if (!existing) {
    throw AppError.notFound("CommitmentDependency", id);
  }

  await prisma.commitmentDependency.delete({ where: { id } });

  await logActivity({
    projectId: existing.commitment.projectId,
    action: "COMMITMENT_UPDATED",
    entityType: "CommitmentDependency",
    entityId: id,
    message: `Dependency removed from commitment: ${existing.commitment.title}`,
  });

  return { id, deleted: true as const };
}
