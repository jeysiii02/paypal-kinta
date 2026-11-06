import {
  scenarioFinancialsSchema,
  type ClassifiedAmount,
  type ScenarioAssumptions,
  type ScenarioFinancials,
} from "@/lib/validators/finance";

export type FinanceLedgerInput = {
  /** Project budget in centavos — confirmed */
  originalProjectBudget: number;
  /** Sum of commitment.agreedAmount — confirmed from DB */
  totalRecordedCommitments: number;
  /** Sum of commitment.amountPaid — confirmed from DB */
  paymentsAlreadyMade: number;
  /**
   * Customer payments treated as collected.
   * Only CAPTURED (or similar) should be passed as confirmed collected.
   * CREATED demo placeholders should be 0 unless Dev 2 captured them.
   */
  customerPaymentsCollected: number;
};

function amt(
  amountCentavos: number,
  classification: ClassifiedAmount["classification"],
  label: string,
): ClassifiedAmount {
  return { amountCentavos, classification, label };
}

/**
 * calculateScenarioFinancials()
 * Deterministic money math — AI must NOT perform final financial calculations.
 * All values are integer centavos.
 */
export function calculateScenarioFinancials(
  ledger: FinanceLedgerInput,
  assumptions: ScenarioAssumptions = {},
): ScenarioFinancials {
  const estimatedAdditionalCosts = assumptions.estimatedAdditionalCosts ?? 0;
  const estimatedRecoverableExpenses =
    assumptions.estimatedRecoverableExpenses ?? 0;
  const estimatedNonrecoverableExpenses =
    assumptions.estimatedNonrecoverableExpenses ?? 0;
  const potentialCustomerRefunds = assumptions.potentialCustomerRefunds ?? 0;

  // Guard: recoverable cannot exceed payments already made (physical cash out)
  const recoverableCapped = Math.min(
    estimatedRecoverableExpenses,
    ledger.paymentsAlreadyMade,
  );

  // Remaining budget after known commitment total + estimated extras - recoveries
  const remainingBudget =
    ledger.originalProjectBudget -
    ledger.totalRecordedCommitments -
    estimatedAdditionalCosts +
    recoverableCapped;

  // Exposure: money already paid that looks nonrecoverable + extras + potential refunds out
  const remainingFinancialExposure =
    estimatedNonrecoverableExpenses +
    estimatedAdditionalCosts +
    potentialCustomerRefunds;

  // Net impact vs original plan: extras + nonrecoverable + refunds - recoveries
  // Positive = worse (more cost/loss); negative = better (net recovery)
  const netFinancialImpact =
    estimatedAdditionalCosts +
    estimatedNonrecoverableExpenses +
    potentialCustomerRefunds -
    recoverableCapped;

  const breakdownNotes: string[] = [
    "All amounts are integer PHP centavos.",
    "Confirmed figures come from project/commitment/payment ledger inputs.",
    "Estimate/assumption figures come from scenario assumptions and require supplier confirmation before execution.",
    "AI proposals are not treated as confirmed money movements.",
    "This calculation does not determine legal refund entitlement.",
  ];

  if (assumptions.estimatedRecoverableExpenses !== undefined) {
    breakdownNotes.push(
      `Recoverable expenses classified as NEEDS_SUPPLIER_CONFIRMATION (capped at payments already made: ${recoverableCapped}).`,
    );
  }
  if (assumptions.notes?.length) {
    breakdownNotes.push(...assumptions.notes);
  }
  if (
    ledger.customerPaymentsCollected === 0 &&
    potentialCustomerRefunds > 0
  ) {
    breakdownNotes.push(
      "Potential customer refunds were provided as assumptions but collected customer payments are 0 — confirm capture status before refunding (PayPal reserved for Developer 2).",
    );
  }

  return scenarioFinancialsSchema.parse({
    currency: "PHP",
    originalProjectBudget: amt(
      ledger.originalProjectBudget,
      "CONFIRMED",
      "Original project budget",
    ),
    totalRecordedCommitments: amt(
      ledger.totalRecordedCommitments,
      "CONFIRMED",
      "Total recorded commitment agreed amounts",
    ),
    paymentsAlreadyMade: amt(
      ledger.paymentsAlreadyMade,
      "CONFIRMED",
      "Payments already made to suppliers",
    ),
    customerPaymentsCollected: amt(
      ledger.customerPaymentsCollected,
      "CONFIRMED",
      "Customer payments collected (captured only)",
    ),
    estimatedAdditionalCosts: amt(
      estimatedAdditionalCosts,
      assumptions.estimatedAdditionalCosts !== undefined
        ? "ASSUMPTION"
        : "ESTIMATE",
      "Estimated additional costs",
    ),
    estimatedRecoverableExpenses: amt(
      recoverableCapped,
      "NEEDS_SUPPLIER_CONFIRMATION",
      "Estimated recoverable expenses",
    ),
    estimatedNonrecoverableExpenses: amt(
      estimatedNonrecoverableExpenses,
      "NEEDS_SUPPLIER_CONFIRMATION",
      "Estimated nonrecoverable expenses",
    ),
    potentialCustomerRefunds: amt(
      potentialCustomerRefunds,
      "ASSUMPTION",
      "Potential customer refunds",
    ),
    remainingBudget: amt(
      remainingBudget,
      "ESTIMATE",
      "Remaining budget after commitments and scenario assumptions",
    ),
    remainingFinancialExposure: amt(
      remainingFinancialExposure,
      "ESTIMATE",
      "Remaining financial exposure",
    ),
    netFinancialImpact: amt(
      netFinancialImpact,
      "ESTIMATE",
      "Net financial impact (positive = net cost/loss under assumptions)",
    ),
    breakdownNotes,
    calculatedAt: new Date().toISOString(),
  });
}
