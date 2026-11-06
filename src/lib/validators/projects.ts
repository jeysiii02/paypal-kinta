import { z } from "zod";
import { centavosSchema, cuidSchema, isoDateSchema } from "./common";

export const projectStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "DISRUPTED",
  "RECOVERING",
  "ARCHIVED",
  "COMPLETED",
]);

export const createProjectSchema = z.object({
  userId: cuidSchema,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  eventDate: isoDateSchema,
  location: z.string().trim().min(1).max(300),
  budget: centavosSchema,
  expectedAttendees: z.number().int().positive(),
  status: projectStatusSchema.optional(),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    eventDate: isoDateSchema.optional(),
    location: z.string().trim().min(1).max(300).optional(),
    budget: centavosSchema.optional(),
    expectedAttendees: z.number().int().positive().optional(),
    status: projectStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
