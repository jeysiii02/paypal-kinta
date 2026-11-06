import { z } from "zod";
import { centavosSchema, cuidSchema, isoDateSchema } from "./common";

export const paymentStatusSchema = z.enum([
  "UNPAID",
  "PARTIAL",
  "PAID",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);

export const commitmentStatusSchema = z.enum([
  "DRAFT",
  "CONFIRMED",
  "AT_RISK",
  "CANCELLED",
  "FULFILLED",
  "RENEGOTIATED",
]);

export const dependencyTypeSchema = z.enum([
  "COMMITMENT",
  "EVENT_DATE",
  "LOCATION",
  "VENUE_ACCESS",
  "SERVICE_ARRANGEMENT",
]);

export const createCommitmentSchema = z
  .object({
    supplierId: cuidSchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional().nullable(),
    agreedAmount: centavosSchema,
    amountPaid: centavosSchema.optional(),
    paymentStatus: paymentStatusSchema.optional(),
    serviceDate: isoDateSchema.optional().nullable(),
    cancellationConditions: z.string().trim().max(10000).optional().nullable(),
    refundConditions: z.string().trim().max(10000).optional().nullable(),
    status: commitmentStatusSchema.optional(),
  })
  .refine(
    (data) =>
      data.amountPaid === undefined || data.amountPaid <= data.agreedAmount,
    {
      message: "amountPaid cannot exceed agreedAmount",
      path: ["amountPaid"],
    },
  );

export const updateCommitmentSchema = z
  .object({
    supplierId: cuidSchema.optional(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    agreedAmount: centavosSchema.optional(),
    amountPaid: centavosSchema.optional(),
    paymentStatus: paymentStatusSchema.optional(),
    serviceDate: isoDateSchema.optional().nullable(),
    cancellationConditions: z.string().trim().max(10000).optional().nullable(),
    refundConditions: z.string().trim().max(10000).optional().nullable(),
    status: commitmentStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const createDependencySchema = z
  .object({
    dependencyType: dependencyTypeSchema,
    description: z.string().trim().min(1).max(2000),
    dependsOnCommitmentId: cuidSchema.optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.dependencyType === "COMMITMENT" &&
      !data.dependsOnCommitmentId
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "dependsOnCommitmentId is required when dependencyType is COMMITMENT",
        path: ["dependsOnCommitmentId"],
      });
    }
  });

export type CreateCommitmentInput = z.infer<typeof createCommitmentSchema>;
export type UpdateCommitmentInput = z.infer<typeof updateCommitmentSchema>;
export type CreateDependencyInput = z.infer<typeof createDependencySchema>;
