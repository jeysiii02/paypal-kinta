import { z } from "zod";
import { cuidSchema } from "./common";

export const supplierCategorySchema = z.enum([
  "VENUE",
  "CATERING",
  "PHOTOGRAPHY",
  "EQUIPMENT",
  "TRANSPORT",
  "ENTERTAINMENT",
  "OTHER",
]);

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contactPerson: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(50).optional().nullable(),
  category: supplierCategorySchema,
  notes: z.string().trim().max(5000).optional().nullable(),
});

export const updateSupplierSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    contactPerson: z.string().trim().max(200).optional().nullable(),
    email: z
      .string()
      .trim()
      .email()
      .optional()
      .nullable()
      .or(z.literal("")),
    phone: z.string().trim().max(50).optional().nullable(),
    category: supplierCategorySchema.optional(),
    notes: z.string().trim().max(5000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const projectIdParamSchema = z.object({
  projectId: cuidSchema,
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
