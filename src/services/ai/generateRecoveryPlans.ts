import type {
  Commitment,
  Disruption,
  Document,
  Project,
  Supplier,
} from "@prisma/client";
import {
  recoveryPlansPayloadSchema,
  type RecoveryPlansPayload,
  type RecoveryStrategyPlan,
} from "@/lib/validators/recovery";
import {
  generateJsonWithGemini,
  getAiProviderName,
} from "@/services/ai/provider";
import { AppError } from "@/lib/errors";
import type { DependencyAnalysisResult } from "@/lib/validators/dependency";
import type { EventAnalysisResult } from "@/lib/validators/disruptions";

const LEGAL_DISCLAIMER =
  "These strategies are planning aids only. They do not invent supplier quotations or guarantee recoveries, and they do not determine legal refund entitlement.";

export type RecoveryPlanContext = {
  project: Project;
  disruption: Disruption;
  suppliers: Supplier[];
  commitments: Array<
    Commitment & { supplier: Pick<Supplier, "id" | "name" | "category"> }
  >;
  documents: Document[];
  eventAnalysis: EventAnalysisResult | null;
  dependencyAnalysis: DependencyAnalysisResult | null;
  userAssumptions?: string[];
};

function knownCommitmentIds(ctx: RecoveryPlanContext) {
  return new Set(ctx.commitments.map((c) => c.id));
}

function sanitizePlan(
  plan: RecoveryStrategyPlan,
  known: Set<string>,
): RecoveryStrategyPlan {
  return {
    ...plan,
    affectedCommitmentIds: plan.affectedCommitmentIds.filter((id) =>
      known.has(id),
    ),
    unaffectedCommitmentIds: plan.unaffectedCommitmentIds.filter((id) =>
      known.has(id),
    ),
    amountsRequireConfirmation: true,
  };
}

function buildPrompt(ctx: RecoveryPlanContext): string {
  const commitments = ctx.commitments
    .map(
      (c) =>
        `- ${c.id} | ${c.title} | supplier=${c.supplier.name} | agreed=${c.agreedAmount} | paid=${c.amountPaid} | status=${c.status}`,
    )
    .join("\n");

  return `You are KINTA recovery planner. Generate exactly 3 strategies: CANCEL, RELOCATE, RESCHEDULE.

RULES:
1. Use only project/commitment/disruption/analysis context below. Do not invent supplier quotes or guaranteed recoveries.
2. Mark money fields as estimates in centavos integers; amountsRequireConfirmation must be true.
3. Do not determine legal refund entitlement.
4. List missingInformation clearly when data is absent.
5. Return STRICT JSON.

PROJECT: ${ctx.project.name} | event=${ctx.project.eventDate.toISOString()} | location=${ctx.project.location} | budgetCentavos=${ctx.project.budget}
DISRUPTION: ${ctx.disruption.title} — ${ctx.disruption.description}
EVENT ANALYSIS JSON: ${JSON.stringify(ctx.eventAnalysis)}
DEPENDENCY ANALYSIS JSON: ${JSON.stringify(ctx.dependencyAnalysis)}
USER ASSUMPTIONS: ${JSON.stringify(ctx.userAssumptions ?? [])}
COMMITMENTS:
${commitments}

Return:
{
  "strategies": [ /* CANCEL, RELOCATE, RESCHEDULE objects */ ],
  "generationMethod": "gemini",
  "legalDisclaimer": "..."
}

Each strategy object fields:
strategy, summary, proposedActions[], affectedCommitmentIds[], unaffectedCommitmentIds[],
estimatedAdditionalCosts, potentiallyRecoverableAmounts, estimatedNonrecoverableAmounts,
potentialCustomerRefunds, risks[], assumptions[], missingInformation[], confidenceLevel,
explanation, amountsRequireConfirmation`;
}

function heuristicPlans(ctx: RecoveryPlanContext): RecoveryPlansPayload {
  const known = knownCommitmentIds(ctx);
  const direct =
    ctx.dependencyAnalysis?.directlyAffected.map((c) => c.commitmentId) ??
    ctx.eventAnalysis?.affectedCommitmentIds ??
    [];
  const indirect =
    ctx.dependencyAnalysis?.indirectlyAffected.map((c) => c.commitmentId) ??
    ctx.eventAnalysis?.potentiallyAffectedCommitmentIds ??
    [];
  const uncertain =
    ctx.dependencyAnalysis?.uncertain.map((c) => c.commitmentId) ?? [];
  const unaffected =
    ctx.dependencyAnalysis?.unaffected.map((c) => c.commitmentId) ??
    ctx.eventAnalysis?.unaffectedCommitmentIds ??
    [];

  const affected = [...new Set([...direct, ...indirect])].filter((id) =>
    known.has(id),
  );
  const unaffectedIds = [
    ...new Set([...unaffected, ...uncertain]),
  ].filter((id) => known.has(id) && !affected.includes(id));

  const paidOnAffected = ctx.commitments
    .filter((c) => affected.includes(c.id))
    .reduce((sum, c) => sum + c.amountPaid, 0);

  const customerCreated = 0; // heuristic: do not treat CREATED PayPal placeholders as refundable captures

  const missing = [
    "Confirmed alternate venue quotation (if relocating)",
    "Supplier written confirmation of deposit disposition",
    "Availability of catering/photography/equipment for alternate date/location",
    ...(ctx.userAssumptions?.length
      ? []
      : ["Organizer-confirmed recovery preferences / budget ceiling"]),
  ];

  const baseAssumptions = [
    "Heuristic plan — not a live supplier quote",
    "Deposit recovery requires mutual written agreement; not legally determined here",
    ...(ctx.userAssumptions ?? []),
  ];

  const cancel: RecoveryStrategyPlan = {
    strategy: "CANCEL",
    summary:
      "Cancel the event, wind down supplier commitments, and pursue deposit dispositions where agreement text allows discussion — without asserting legal entitlement.",
    proposedActions: [
      "Notify all suppliers of event cancellation",
      "Request written deposit disposition from directly affected suppliers",
      "Assess whether customer ticket placeholders should become refunds after PayPal capture (Developer 2)",
      "Archive project as completed/cancelled after confirmations",
    ],
    affectedCommitmentIds: affected,
    unaffectedCommitmentIds: unaffectedIds,
    estimatedAdditionalCosts: 0,
    potentiallyRecoverableAmounts: Math.round(paidOnAffected * 0.5),
    estimatedNonrecoverableAmounts: Math.round(paidOnAffected * 0.5),
    potentialCustomerRefunds: customerCreated,
    risks: [
      "Deposit recovery may be partial or denied pending supplier confirmation",
      "Dependent suppliers may still charge change/cancellation fees",
    ],
    assumptions: baseAssumptions,
    missingInformation: missing,
    confidenceLevel: "LOW",
    explanation:
      "Cancel minimizes new spend but locks in nonrecoverable portions of amounts already paid unless suppliers confirm otherwise.",
    amountsRequireConfirmation: true,
  };

  const relocate: RecoveryStrategyPlan = {
    strategy: "RELOCATE",
    summary:
      "Keep the date if possible; find an alternate Quezon City (or nearby) venue and re-confirm location-dependent suppliers.",
    proposedActions: [
      "Shortlist alternate venues for the same event date",
      "Reconfirm catering logistics for new location",
      "Confirm equipment load-in at new venue",
      "Photography likely remains viable if date unchanged — confirm availability",
    ],
    affectedCommitmentIds: affected,
    unaffectedCommitmentIds: unaffectedIds,
    estimatedAdditionalCosts: 500000, // ₱5,000 estimate placeholder — needs confirmation
    potentiallyRecoverableAmounts: Math.round(paidOnAffected * 0.5),
    estimatedNonrecoverableAmounts: Math.round(paidOnAffected * 0.25),
    potentialCustomerRefunds: 0,
    risks: [
      "Alternate venue cost unknown until quoted",
      "Catering may charge delivery/setup differentials",
    ],
    assumptions: [
      ...baseAssumptions,
      "Estimated additional venue/logistics cost of ₱5,000 is a planning placeholder only",
    ],
    missingInformation: missing,
    confidenceLevel: "LOW",
    explanation:
      "Relocation preserves attendee date expectations but introduces unconfirmed venue and logistics costs.",
    amountsRequireConfirmation: true,
  };

  const reschedule: RecoveryStrategyPlan = {
    strategy: "RESCHEDULE",
    summary:
      "Move the event to a later date (e.g. January 2027 per notice discussion) and re-book suppliers subject to availability.",
    proposedActions: [
      "Propose alternate date windows to Venue Alpha or substitutes",
      "Ask catering/photography/equipment for new-date availability and fees",
      "Update project eventDate only after confirmations",
      "Communicate schedule change to registered attendees",
    ],
    affectedCommitmentIds: [...new Set([...affected, ...uncertain])].filter(
      (id) => known.has(id),
    ),
    unaffectedCommitmentIds: unaffected.filter(
      (id) => known.has(id) && !affected.includes(id) && !uncertain.includes(id),
    ),
    estimatedAdditionalCosts: 200000,
    potentiallyRecoverableAmounts: Math.round(paidOnAffected * 0.75),
    estimatedNonrecoverableAmounts: Math.round(paidOnAffected * 0.25),
    potentialCustomerRefunds: 0,
    risks: [
      "Supplier availability on new date is unconfirmed",
      "Attendee drop-off if date moves",
    ],
    assumptions: baseAssumptions,
    missingInformation: missing,
    confidenceLevel: "MEDIUM",
    explanation:
      "Reschedule may improve deposit discussions for the venue but makes date-dependent suppliers (e.g. photography) uncertain until confirmed.",
    amountsRequireConfirmation: true,
  };

  return recoveryPlansPayloadSchema.parse({
    strategies: [cancel, relocate, reschedule].map((p) =>
      sanitizePlan(p, known),
    ),
    generationMethod: "heuristic",
    legalDisclaimer: LEGAL_DISCLAIMER,
  });
}

export async function generateRecoveryPlans(
  ctx: RecoveryPlanContext,
): Promise<RecoveryPlansPayload> {
  const known = knownCommitmentIds(ctx);
  const provider = getAiProviderName();

  if (provider === "heuristic") {
    return heuristicPlans(ctx);
  }

  const raw = await generateJsonWithGemini(buildPrompt(ctx));
  let parsed: RecoveryPlansPayload;
  try {
    parsed = recoveryPlansPayloadSchema.parse({
      ...(raw as object),
      generationMethod: "gemini",
      legalDisclaimer: LEGAL_DISCLAIMER,
    });
  } catch (error) {
    throw AppError.badRequest(
      "Recovery plan AI response failed schema validation",
      error,
    );
  }

  return recoveryPlansPayloadSchema.parse({
    ...parsed,
    strategies: parsed.strategies.map((p) => sanitizePlan(p, known)),
    legalDisclaimer: LEGAL_DISCLAIMER,
  });
}
