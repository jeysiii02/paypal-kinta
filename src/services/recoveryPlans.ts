import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logActivity } from "@/services/activity";
import { generateRecoveryPlans } from "@/services/ai/generateRecoveryPlans";
import { parseStoredAnalysis } from "@/services/disruptions";
import {
  dependencyAnalysisResultSchema,
  type DependencyAnalysisResult,
} from "@/lib/validators/dependency";
import type { EventAnalysisResult } from "@/lib/validators/disruptions";
import { calculateScenarioFinancials } from "@/services/finance";
import type { ScenarioAssumptions } from "@/lib/validators/finance";
import { analyzeDisruptionDependencies } from "@/services/dependency";

async function loadEventAnalysis(
  disruptionId: string,
): Promise<EventAnalysisResult | null> {
  const row = await prisma.eventAnalysis.findUnique({
    where: { disruptionId },
  });
  if (!row) return null;
  return parseStoredAnalysis(row.rawAnalysisJson);
}

async function loadDependencyAnalysis(
  disruptionId: string,
): Promise<DependencyAnalysisResult | null> {
  const row = await prisma.eventAnalysis.findUnique({
    where: { disruptionId },
  });
  if (!row) return null;
  try {
    const raw = JSON.parse(row.rawAnalysisJson) as Record<string, unknown>;
    if (!raw.dependencyAnalysis) return null;
    return dependencyAnalysisResultSchema.parse(raw.dependencyAnalysis);
  } catch {
    return null;
  }
}

function ledgerFromProject(args: {
  budget: number;
  commitments: Array<{ agreedAmount: number; amountPaid: number }>;
  customerPayments: Array<{ amount: number; status: string }>;
}) {
  const totalRecordedCommitments = args.commitments.reduce(
    (s, c) => s + c.agreedAmount,
    0,
  );
  const paymentsAlreadyMade = args.commitments.reduce(
    (s, c) => s + c.amountPaid,
    0,
  );
  // Only treat CAPTURED (and refunded variants) as collected — CREATED demo rows stay 0
  const customerPaymentsCollected = args.customerPayments
    .filter((p) =>
      ["CAPTURED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(p.status),
    )
    .reduce((s, p) => s + p.amount, 0);

  return {
    originalProjectBudget: args.budget,
    totalRecordedCommitments,
    paymentsAlreadyMade,
    customerPaymentsCollected,
  };
}

/**
 * Generate 3 strategies, persist RecoveryPlan + Scenario rows with initial financials.
 */
export async function createRecoveryPlansForDisruption(
  disruptionId: string,
  options?: { userAssumptions?: string[]; runDependencyIfMissing?: boolean },
) {
  const disruption = await prisma.disruption.findUnique({
    where: { id: disruptionId },
    include: {
      documents: true,
      project: true,
    },
  });
  if (!disruption) {
    throw AppError.notFound("Disruption", disruptionId);
  }

  let eventAnalysis = await loadEventAnalysis(disruptionId);
  if (!eventAnalysis) {
    throw AppError.badRequest(
      "Run AI event analysis before generating recovery plans (POST /api/disruptions/:id/analyze)",
    );
  }

  let dependencyAnalysis = await loadDependencyAnalysis(disruptionId);
  if (!dependencyAnalysis && (options?.runDependencyIfMissing ?? true)) {
    dependencyAnalysis = await analyzeDisruptionDependencies(disruptionId, {
      seedCommitmentIds: eventAnalysis.affectedCommitmentIds,
    });
  }

  const [suppliers, commitments, customerPayments] = await Promise.all([
    prisma.supplier.findMany({ where: { projectId: disruption.projectId } }),
    prisma.commitment.findMany({
      where: { projectId: disruption.projectId },
      include: {
        supplier: { select: { id: true, name: true, category: true } },
      },
    }),
    prisma.customerPayment.findMany({
      where: { projectId: disruption.projectId },
    }),
  ]);

  const payload = await generateRecoveryPlans({
    project: disruption.project,
    disruption,
    suppliers,
    commitments,
    documents: disruption.documents,
    eventAnalysis,
    dependencyAnalysis,
    userAssumptions: options?.userAssumptions,
  });

  const ledger = ledgerFromProject({
    budget: disruption.project.budget,
    commitments,
    customerPayments,
  });

  const recoveryPlan = await prisma.$transaction(async (tx) => {
    const plan = await tx.recoveryPlan.create({
      data: {
        projectId: disruption.projectId,
        disruptionId,
        plansJson: JSON.stringify(payload),
      },
    });

    for (const strategy of payload.strategies) {
      const assumptions: ScenarioAssumptions = {
        estimatedAdditionalCosts: strategy.estimatedAdditionalCosts,
        estimatedRecoverableExpenses: strategy.potentiallyRecoverableAmounts,
        estimatedNonrecoverableExpenses:
          strategy.estimatedNonrecoverableAmounts,
        potentialCustomerRefunds: strategy.potentialCustomerRefunds,
        notes: [
          ...strategy.assumptions,
          "Initial financials seeded from recovery strategy estimates; recalculate after editing assumptions.",
        ],
      };

      const financials = calculateScenarioFinancials(ledger, assumptions);

      await tx.scenario.create({
        data: {
          projectId: disruption.projectId,
          recoveryPlanId: plan.id,
          strategy: strategy.strategy,
          summary: strategy.summary,
          assumptionsJson: JSON.stringify(assumptions),
          financialsJson: JSON.stringify(financials),
          planDetailJson: JSON.stringify(strategy),
        },
      });
    }

    await tx.disruption.update({
      where: { id: disruptionId },
      data: { status: "PLANNING" },
    });

    await tx.project.update({
      where: { id: disruption.projectId },
      data: { status: "RECOVERING" },
    });

    return plan;
  });

  await logActivity({
    projectId: disruption.projectId,
    userId: disruption.project.userId,
    action: "RECOVERY_PLAN_GENERATED",
    entityType: "RecoveryPlan",
    entityId: recoveryPlan.id,
    message: `Recovery plans generated (${payload.generationMethod}) for disruption ${disruption.title}`,
    metadata: {
      strategies: payload.strategies.map((s) => s.strategy),
      generationMethod: payload.generationMethod,
    },
  });

  return getRecoveryPlan(recoveryPlan.id);
}

export async function getRecoveryPlan(id: string) {
  const plan = await prisma.recoveryPlan.findUnique({
    where: { id },
    include: {
      scenarios: { orderBy: { strategy: "asc" } },
      disruption: {
        select: { id: true, title: true, status: true },
      },
    },
  });
  if (!plan) {
    throw AppError.notFound("RecoveryPlan", id);
  }

  return {
    ...plan,
    plans: JSON.parse(plan.plansJson),
    scenarios: plan.scenarios.map((s) => ({
      ...s,
      assumptions: JSON.parse(s.assumptionsJson),
      financials: s.financialsJson ? JSON.parse(s.financialsJson) : null,
      planDetail: JSON.parse(s.planDetailJson),
    })),
  };
}

export async function listRecoveryPlans(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw AppError.notFound("Project", projectId);
  }

  const plans = await prisma.recoveryPlan.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      scenarios: {
        select: { id: true, strategy: true, summary: true },
      },
      disruption: { select: { id: true, title: true } },
    },
  });

  return plans;
}

export async function getScenario(id: string) {
  const scenario = await prisma.scenario.findUnique({
    where: { id },
    include: {
      recoveryPlan: { select: { id: true, disruptionId: true } },
      recoveryActions: true,
    },
  });
  if (!scenario) {
    throw AppError.notFound("Scenario", id);
  }

  return {
    ...scenario,
    assumptions: JSON.parse(scenario.assumptionsJson),
    financials: scenario.financialsJson
      ? JSON.parse(scenario.financialsJson)
      : null,
    planDetail: JSON.parse(scenario.planDetailJson),
  };
}

/**
 * Recalculate scenario financials from ledger + (optional) new assumptions.
 */
export async function recalculateScenario(
  scenarioId: string,
  assumptionPatch?: ScenarioAssumptions,
) {
  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: { project: true },
  });
  if (!scenario) {
    throw AppError.notFound("Scenario", scenarioId);
  }

  const [commitments, customerPayments] = await Promise.all([
    prisma.commitment.findMany({ where: { projectId: scenario.projectId } }),
    prisma.customerPayment.findMany({
      where: { projectId: scenario.projectId },
    }),
  ]);

  const currentAssumptions = JSON.parse(
    scenario.assumptionsJson,
  ) as ScenarioAssumptions;
  const assumptions: ScenarioAssumptions = {
    ...currentAssumptions,
    ...assumptionPatch,
    notes: [
      ...(currentAssumptions.notes ?? []),
      ...(assumptionPatch?.notes ?? []),
    ],
  };

  const ledger = ledgerFromProject({
    budget: scenario.project.budget,
    commitments,
    customerPayments,
  });

  const financials = calculateScenarioFinancials(ledger, assumptions);

  const updated = await prisma.scenario.update({
    where: { id: scenarioId },
    data: {
      assumptionsJson: JSON.stringify(assumptions),
      financialsJson: JSON.stringify(financials),
    },
  });

  await logActivity({
    projectId: scenario.projectId,
    action: "SCENARIO_CALCULATED",
    entityType: "Scenario",
    entityId: scenarioId,
    message: `Scenario financials recalculated (${scenario.strategy})`,
    metadata: {
      netFinancialImpact: financials.netFinancialImpact.amountCentavos,
      remainingBudget: financials.remainingBudget.amountCentavos,
    },
  });

  return {
    ...updated,
    assumptions,
    financials,
    planDetail: JSON.parse(updated.planDetailJson),
  };
}
