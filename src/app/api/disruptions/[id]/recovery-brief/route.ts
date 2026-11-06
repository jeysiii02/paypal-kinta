import { handleRouteError, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { explainRecoveryBrief } from "@/services/ai/explainRecoveryBrief";
import { listRecoveryPlans, getRecoveryPlan } from "@/services/recoveryPlans";

type Params = { params: Promise<{ id: string }> };

type FinancialsLike = {
  netFinancialImpact?: { amountCentavos?: number };
  remainingBudget?: { amountCentavos?: number };
  remainingFinancialExposure?: { amountCentavos?: number };
};

/**
 * POST /api/disruptions/:id/recovery-brief
 * AI explains already-calculated scenarios — does not recompute money.
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id: disruptionId } = await params;
    const disruption = await prisma.disruption.findUnique({
      where: { id: disruptionId },
      include: { project: true },
    });
    if (!disruption) throw AppError.notFound("Disruption", disruptionId);

    const plans = (await listRecoveryPlans(disruption.projectId)).filter(
      (plan) => plan.disruptionId === disruptionId,
    );
    if (plans.length === 0) {
      throw AppError.badRequest(
        "Generate recovery plans before requesting an AI recovery brief",
      );
    }

    const full = await getRecoveryPlan(plans[0].id);
    const scenarios = full.scenarios.map((scenario) => {
      const financials = (scenario.financials ?? null) as FinancialsLike | null;
      return {
        strategy: scenario.strategy,
        summary: scenario.summary,
        netFinancialImpactCentavos:
          financials?.netFinancialImpact?.amountCentavos ?? 0,
        remainingBudgetCentavos:
          financials?.remainingBudget?.amountCentavos ?? 0,
        exposureCentavos:
          financials?.remainingFinancialExposure?.amountCentavos ?? 0,
      };
    });

    const brief = await explainRecoveryBrief({
      projectName: disruption.project.name,
      disruptionTitle: disruption.title,
      scenarios,
    });

    return ok({ disruptionId, brief });
  } catch (error) {
    return handleRouteError(error);
  }
}
