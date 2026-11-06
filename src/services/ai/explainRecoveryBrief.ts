import { z } from "zod";
import { AppError } from "@/lib/errors";
import { formatPhp } from "@/lib/money";
import {
  generateJsonWithGemini,
  getAiProviderName,
} from "@/services/ai/provider";

const briefSchema = z.object({
  headline: z.string().min(1),
  audienceSummary: z.string().min(1),
  recommendation: z.enum(["CANCEL", "RELOCATE", "RESCHEDULE", "NEEDS_MORE_INFO"]),
  why: z.string().min(1),
  paypalNextStep: z.string().min(1),
  caveats: z.array(z.string()),
  generationMethod: z.enum(["gemini", "heuristic"]),
});

export type RecoveryBrief = z.infer<typeof briefSchema>;

type ScenarioInput = {
  strategy: "CANCEL" | "RELOCATE" | "RESCHEDULE";
  summary: string;
  netFinancialImpactCentavos: number;
  remainingBudgetCentavos: number;
  exposureCentavos: number;
};

/**
 * AI narrative over already-calculated scenario financials.
 * Never recalculates money — only explains deterministic numbers.
 */
export async function explainRecoveryBrief(input: {
  projectName: string;
  disruptionTitle: string;
  scenarios: ScenarioInput[];
}): Promise<RecoveryBrief> {
  const provider = getAiProviderName();

  if (provider === "heuristic") {
    return heuristicBrief(input);
  }

  const prompt = `You are KINTA's recovery briefing assistant.

RULES:
1. Do NOT recalculate money. Use only the provided centavo figures.
2. Do NOT claim legal refund entitlement.
3. Recommend one strategy or NEEDS_MORE_INFO.
4. Include a concrete PayPal next step (capture ticket payments and/or refund after approval).
5. Return STRICT JSON with keys: headline, audienceSummary, recommendation, why, paypalNextStep, caveats (string[]), generationMethod ("gemini").

PROJECT: ${input.projectName}
DISRUPTION: ${input.disruptionTitle}
SCENARIOS:
${input.scenarios
  .map(
    (s) =>
      `- ${s.strategy}: ${s.summary} | netImpact=${s.netFinancialImpactCentavos} remainingBudget=${s.remainingBudgetCentavos} exposure=${s.exposureCentavos}`,
  )
  .join("\n")}
`;

  try {
    const raw = await generateJsonWithGemini(prompt);
    const parsed = briefSchema.parse({
      ...(raw as object),
      generationMethod: "gemini",
    });
    return parsed;
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Fall back rather than blocking the demo if the model drifts.
    return heuristicBrief(input);
  }
}

function heuristicBrief(input: {
  projectName: string;
  disruptionTitle: string;
  scenarios: ScenarioInput[];
}): RecoveryBrief {
  const ranked = [...input.scenarios].sort(
    (a, b) => a.netFinancialImpactCentavos - b.netFinancialImpactCentavos,
  );
  const best = ranked[0];

  return {
    headline: `${input.projectName}: recovery brief for “${input.disruptionTitle}”`,
    audienceSummary:
      "Organizers can compare Cancel, Relocate, and Reschedule using AI analysis plus deterministic financial simulation before moving money in PayPal.",
    recommendation: best?.strategy ?? "NEEDS_MORE_INFO",
    why: best
      ? `${best.strategy} currently shows the lowest net financial impact (${formatPhp(best.netFinancialImpactCentavos)}) with remaining budget ${formatPhp(best.remainingBudgetCentavos)}.`
      : "Scenarios are not ready yet.",
    paypalNextStep:
      "Approve a CUSTOMER_REFUND recovery action only after confirmation, then execute PayPal Captures refund against a captured ticket payment.",
    caveats: [
      "AI does not decide legal refund entitlement.",
      "Financial figures come from the deterministic simulator, not the language model.",
      "PayPal execution happens only after explicit approval.",
    ],
    generationMethod: "heuristic",
  };
}
