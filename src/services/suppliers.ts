import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logActivity } from "@/services/activity";
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
} from "@/lib/validators/suppliers";

function normalizeEmail(email: string | null | undefined) {
  if (email === undefined) return undefined;
  if (email === null || email === "") return null;
  return email;
}

async function requireProject(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw AppError.notFound("Project", projectId);
  }
  return project;
}

export async function createSupplier(
  projectId: string,
  input: CreateSupplierInput,
) {
  await requireProject(projectId);

  const supplier = await prisma.supplier.create({
    data: {
      projectId,
      name: input.name,
      contactPerson: input.contactPerson ?? null,
      email: normalizeEmail(input.email) ?? null,
      phone: input.phone ?? null,
      category: input.category,
      notes: input.notes ?? null,
    },
  });

  await logActivity({
    projectId,
    action: "SUPPLIER_CREATED",
    entityType: "Supplier",
    entityId: supplier.id,
    message: `Supplier created: ${supplier.name}`,
    metadata: { category: supplier.category },
  });

  return supplier;
}

export async function listSuppliers(projectId: string) {
  await requireProject(projectId);

  return prisma.supplier.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { commitments: true } },
    },
  });
}

export async function getSupplier(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      commitments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          agreedAmount: true,
          amountPaid: true,
          paymentStatus: true,
          status: true,
          serviceDate: true,
        },
      },
      project: { select: { id: true, name: true, status: true } },
    },
  });

  if (!supplier) {
    throw AppError.notFound("Supplier", id);
  }

  return supplier;
}

export async function updateSupplier(id: string, input: UpdateSupplierInput) {
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound("Supplier", id);
  }

  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.contactPerson !== undefined
        ? { contactPerson: input.contactPerson }
        : {}),
      ...(input.email !== undefined
        ? { email: normalizeEmail(input.email) }
        : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });

  await logActivity({
    projectId: supplier.projectId,
    action: "SUPPLIER_UPDATED",
    entityType: "Supplier",
    entityId: supplier.id,
    message: `Supplier updated: ${supplier.name}`,
    metadata: { changes: input },
  });

  return supplier;
}

export async function deleteSupplier(id: string) {
  const existing = await prisma.supplier.findUnique({
    where: { id },
    include: { _count: { select: { commitments: true } } },
  });

  if (!existing) {
    throw AppError.notFound("Supplier", id);
  }

  if (existing._count.commitments > 0) {
    throw AppError.conflict(
      "Cannot delete supplier with existing commitments. Remove or reassign commitments first.",
      { commitmentCount: existing._count.commitments },
    );
  }

  await prisma.supplier.delete({ where: { id } });

  await logActivity({
    projectId: existing.projectId,
    action: "SUPPLIER_UPDATED",
    entityType: "Supplier",
    entityId: id,
    message: `Supplier deleted: ${existing.name}`,
  });

  return { id, deleted: true as const };
}
