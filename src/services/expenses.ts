import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logActivity } from "@/services/activity";
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
} from "@/lib/validators/expenses";

async function requireProject(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw AppError.notFound("Project", projectId);
  }
  return project;
}

async function assertCommitmentInProject(
  commitmentId: string,
  projectId: string,
) {
  const commitment = await prisma.commitment.findUnique({
    where: { id: commitmentId },
  });
  if (!commitment) {
    throw AppError.notFound("Commitment", commitmentId);
  }
  if (commitment.projectId !== projectId) {
    throw AppError.badRequest(
      "Commitment does not belong to this project",
      { commitmentId, projectId },
    );
  }
  return commitment;
}

export async function createExpense(
  projectId: string,
  input: CreateExpenseInput,
) {
  await requireProject(projectId);

  if (input.commitmentId) {
    await assertCommitmentInProject(input.commitmentId, projectId);
  }

  const expense = await prisma.expense.create({
    data: {
      projectId,
      description: input.description,
      amount: input.amount,
      category: input.category ?? "OTHER",
      commitmentId: input.commitmentId ?? null,
      incurredAt: input.incurredAt ?? new Date(),
      notes: input.notes ?? null,
    },
    include: {
      commitment: { select: { id: true, title: true } },
    },
  });

  await logActivity({
    projectId,
    action: "EXPENSE_CREATED",
    entityType: "Expense",
    entityId: expense.id,
    message: `Expense recorded: ${expense.description}`,
    metadata: {
      amount: expense.amount,
      category: expense.category,
      commitmentId: expense.commitmentId,
    },
  });

  return expense;
}

export async function listExpenses(projectId: string) {
  await requireProject(projectId);

  return prisma.expense.findMany({
    where: { projectId },
    orderBy: { incurredAt: "desc" },
    include: {
      commitment: { select: { id: true, title: true } },
    },
  });
}

export async function getExpense(id: string) {
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      commitment: { select: { id: true, title: true, status: true } },
      project: { select: { id: true, name: true } },
    },
  });

  if (!expense) {
    throw AppError.notFound("Expense", id);
  }

  return expense;
}

export async function updateExpense(id: string, input: UpdateExpenseInput) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound("Expense", id);
  }

  if (input.commitmentId) {
    await assertCommitmentInProject(input.commitmentId, existing.projectId);
  }

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.commitmentId !== undefined
        ? { commitmentId: input.commitmentId }
        : {}),
      ...(input.incurredAt !== undefined
        ? { incurredAt: input.incurredAt }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: {
      commitment: { select: { id: true, title: true } },
    },
  });

  return expense;
}

export async function deleteExpense(id: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound("Expense", id);
  }

  await prisma.expense.delete({ where: { id } });

  return { id, deleted: true as const };
}
