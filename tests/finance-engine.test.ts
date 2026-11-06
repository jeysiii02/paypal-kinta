/**
 * Edge-case tests for calculateScenarioFinancials().
 * Run: npx tsx tests/finance-engine.test.ts
 */

import { calculateScenarioFinancials } from "../src/services/finance";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const baseLedger = {
  originalProjectBudget: 6_000_000, // ₱60,000
  totalRecordedCommitments: 3_200_000, // ₱32,000
  paymentsAlreadyMade: 1_050_000, // ₱10,500 venue+partials style
  customerPaymentsCollected: 0, // CREATED placeholders not counted
};

// Baseline zeros
{
  const f = calculateScenarioFinancials(baseLedger, {});
  assert(f.remainingBudget.amountCentavos === 6_000_000 - 3_200_000, "remaining budget");
  assert(f.netFinancialImpact.amountCentavos === 0, "zero assumptions → zero net impact");
  assert(f.customerPaymentsCollected.classification === "CONFIRMED", "collected is confirmed");
  assert(f.estimatedRecoverableExpenses.classification === "NEEDS_SUPPLIER_CONFIRMATION", "recoverable needs confirmation");
}

// Recoverable capped at payments already made
{
  const f = calculateScenarioFinancials(baseLedger, {
    estimatedRecoverableExpenses: 9_999_999,
  });
  assert(
    f.estimatedRecoverableExpenses.amountCentavos === baseLedger.paymentsAlreadyMade,
    "recoverable must cap at payments already made",
  );
}

// Net impact formula
{
  const f = calculateScenarioFinancials(baseLedger, {
    estimatedAdditionalCosts: 500_000,
    estimatedRecoverableExpenses: 400_000,
    estimatedNonrecoverableExpenses: 650_000,
    potentialCustomerRefunds: 150_000,
  });
  // net = 500k + 650k + 150k - 400k = 900k
  assert(f.netFinancialImpact.amountCentavos === 900_000, `net impact got ${f.netFinancialImpact.amountCentavos}`);
  assert(
    f.remainingBudget.amountCentavos ===
      6_000_000 - 3_200_000 - 500_000 + 400_000,
    "remaining budget with extras/recovery",
  );
  assert(
    f.breakdownNotes.some((n) => n.toLowerCase().includes("paypal")),
    "should warn when refunds assumed but collected is 0",
  );
}

// Negative net (net recovery better than costs)
{
  const f = calculateScenarioFinancials(baseLedger, {
    estimatedAdditionalCosts: 0,
    estimatedRecoverableExpenses: 1_000_000,
    estimatedNonrecoverableExpenses: 0,
    potentialCustomerRefunds: 0,
  });
  assert(f.netFinancialImpact.amountCentavos === -1_000_000, "negative net = net recovery");
}

// Integer-only: no floats sneak in
{
  const f = calculateScenarioFinancials(
    { ...baseLedger, originalProjectBudget: 100 },
    { estimatedAdditionalCosts: 33 },
  );
  for (const key of [
    "originalProjectBudget",
    "remainingBudget",
    "netFinancialImpact",
  ] as const) {
    assert(Number.isInteger(f[key].amountCentavos), `${key} must be int`);
  }
}

console.log("finance-engine tests passed");
