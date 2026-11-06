import { z } from "zod";
import { centavosSchema, cuidSchema } from "./common";
import { confidenceLevelSchema } from "./disruptions";

export const recoveryStrategySchema = z.enum([
  "CANCEL",
  "RELOCATE",
  "RESCHEDULE",
]);

export const recoveryActionTypeSchema = z.enum([
  "CANCEL_COMMITMENT",
  "RENEGOTIATE",
  "RELOCATE",
  "RESCHEDULE",
  "REQUEST_REFUND",
  "CUSTOMER_REFUND",
  "ADDITIONAL_BOOKING",
  "OTHER",
]);

export const recoveryActionStatusSchema = z.enum([
  "DRAFT",
  "NEEDS_CONFIRMATION",
  "AWAITING_APPROVAL",
  "APPROVED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "REJECTED",
]);

export const recoveryStrategyPlanSchema = z.object({
  strategy: recoveryStrategySchema,
  summary: z.string().min(1),
  proposedActions: z.array(z.string()).min(1),
  affectedCommitmentIds: z.array(z.string()),
  unaffectedCommitmentIds: z.array(z.string()),
  /** Estimates in centavos — AI may propose; financial engine recalculates */
  estimatedAdditionalCosts: centavosSchema,
  potentiallyRecoverableAmounts: centavosSchema,
  estimatedNonrecoverableAmounts: centavosSchema,
  potentialCustomerRefunds: centavosSchema,
  risks: z.array(z.string()),
  assumptions: z.array(z.string()),
  missingInformation: z.array(z.string()),
  confidenceLevel: confidenceLevelSchema,
  explanation: z.string().min(1),
  amountsRequireConfirmation: z.boolean().default(true),
});

export const recoveryPlansPayloadSchema = z.object({
  strategies: z
    .array(recoveryStrategyPlanSchema)
    .length(3)
    .refine(
      (plans) => {
        const set = new Set(plans.map((p) => p.strategy));
        return (
          set.has("CANCEL") && set.has("RELOCATE") && set.has("RESCHEDULE")
        );
      },
      { message: "Must include CANCEL, RELOCATE, and RESCHEDULE strategies" },
    ),
  generationMethod: z.enum(["gemini", "heuristic"]),
  legalDisclaimer: z.string(),
});

export const createRecoveryActionSchema = z.object({
  scenarioId: cuidSchema.optional().nullable(),
  type: recoveryActionTypeSchema,
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).optional().nullable(),
  commitmentId: cuidSchema.optional().nullable(),
  amount: centavosSchema.optional().nullable(),
  requiresPaypal: z.boolean().optional(),
  status: recoveryActionStatusSchema.optional(),
});

export const updateRecoveryActionSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    type: recoveryActionTypeSchema.optional(),
    commitmentId: cuidSchema.optional().nullable(),
    amount: centavosSchema.optional().nullable(),
    requiresPaypal: z.boolean().optional(),
    status: recoveryActionStatusSchema.optional(),
    scenarioId: cuidSchema.optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const rejectActionSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

export const failActionSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

export type RecoveryStrategyPlan = z.infer<typeof recoveryStrategyPlanSchema>;
export type RecoveryPlansPayload = z.infer<typeof recoveryPlansPayloadSchema>;
export type CreateRecoveryActionInput = z.infer<
  typeof createRecoveryActionSchema
>;
export type UpdateRecoveryActionInput = z.infer<
  typeof updateRecoveryActionSchema
>;
