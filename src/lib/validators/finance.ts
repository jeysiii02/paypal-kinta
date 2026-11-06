import { z } from "zod";
import { centavosSchema } from "./common";

/**
 * User-adjustable scenario assumptions (centavos).
 * Confirmed vs estimate flags keep AI estimates separate from ledger facts.
 */
export const scenarioAssumptionsSchema = z.object({
  estimatedAdditionalCosts: centavosSchema.optional(),
  estimatedRecoverableExpenses: centavosSchema.optional(),
  estimatedNonrecoverableExpenses: centavosSchema.optional(),
  potentialCustomerRefunds: centavosSchema.optional(),
  notes: z.array(z.string()).optional(),
});

export const amountClassSchema = z.enum([
  "CONFIRMED",
  "ESTIMATE",
  "ASSUMPTION",
  "NEEDS_SUPPLIER_CONFIRMATION",
]);

export const classifiedAmountSchema = z.object({
  amountCentavos: z.number().int(),
  classification: amountClassSchema,
  label: z.string(),
});

export const scenarioFinancialsSchema = z.object({
  currency: z.literal("PHP"),
  originalProjectBudget: classifiedAmountSchema,
  totalRecordedCommitments: classifiedAmountSchema,
  paymentsAlreadyMade: classifiedAmountSchema,
  customerPaymentsCollected: classifiedAmountSchema,
  estimatedAdditionalCosts: classifiedAmountSchema,
  estimatedRecoverableExpenses: classifiedAmountSchema,
  estimatedNonrecoverableExpenses: classifiedAmountSchema,
  potentialCustomerRefunds: classifiedAmountSchema,
  remainingBudget: classifiedAmountSchema,
  remainingFinancialExposure: classifiedAmountSchema,
  netFinancialImpact: classifiedAmountSchema,
  breakdownNotes: z.array(z.string()),
  calculatedAt: z.string(),
});

export type ScenarioAssumptions = z.infer<typeof scenarioAssumptionsSchema>;
export type ScenarioFinancials = z.infer<typeof scenarioFinancialsSchema>;
export type ClassifiedAmount = z.infer<typeof classifiedAmountSchema>;
