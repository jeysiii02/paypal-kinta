import { z } from "zod";
import { centavosSchema, cuidSchema, isoDateSchema } from "./common";

export const expenseCategorySchema = z.enum([
  "SUPPLIER_PAYMENT",
  "ADDITIONAL_COST",
  "PENALTY",
  "REFUND_OUT",
  "OTHER",
]);

export const createExpenseSchema = z.object({
  description: z.string().trim().min(1).max(1000),
  amount: centavosSchema,
  category: expenseCategorySchema.optional(),
  commitmentId: cuidSchema.optional().nullable(),
  incurredAt: isoDateSchema.optional(),
  notes: z.string().trim().max(5000).optional().nullable(),
});

export const updateExpenseSchema = z
  .object({
    description: z.string().trim().min(1).max(1000).optional(),
    amount: centavosSchema.optional(),
    category: expenseCategorySchema.optional(),
    commitmentId: cuidSchema.optional().nullable(),
    incurredAt: isoDateSchema.optional(),
    notes: z.string().trim().max(5000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
