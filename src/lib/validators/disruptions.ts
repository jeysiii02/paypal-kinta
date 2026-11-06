import { z } from "zod";
import { cuidSchema } from "./common";

export const disruptionStatusSchema = z.enum([
  "REPORTED",
  "ANALYZING",
  "ANALYZED",
  "PLANNING",
  "RESOLVED",
]);

export const documentTypeSchema = z.enum(["NOTICE", "AGREEMENT", "OTHER"]);

export const createDisruptionSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(20000),
  reportedAt: z.coerce.date().optional(),
});

export const updateDisruptionSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().min(1).max(20000).optional(),
    status: disruptionStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const uploadDocumentMetaSchema = z.object({
  type: documentTypeSchema.default("NOTICE"),
});

export const confidenceLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

/**
 * Structured output of analyzeBusinessEvent().
 * Distinguishes confirmed facts, interpretations, assumptions, and missing info.
 * Does NOT assert legal refund entitlement.
 */
export const eventAnalysisResultSchema = z.object({
  incidentType: z.string().min(1),
  incidentSummary: z.string().min(1),
  affectedSupplierIds: z.array(z.string()),
  affectedCommitmentIds: z.array(z.string()),
  potentiallyAffectedCommitmentIds: z.array(z.string()),
  unaffectedCommitmentIds: z.array(z.string()),
  relevantDates: z.array(z.string()),
  relevantAgreementConditions: z.array(z.string()),
  evidenceReferences: z.array(z.string()),
  missingInformation: z.array(z.string()),
  assumptions: z.array(z.string()),
  confidenceLevel: confidenceLevelSchema,
  /** Explicit reminder: AI does not decide legal refund rights */
  legalDisclaimer:
    z.string().default(
      "This analysis does not determine legal refund entitlement. Confirm outcomes with suppliers and applicable agreements.",
    ),
  analysisMethod: z.enum(["gemini", "heuristic"]),
});

export type CreateDisruptionInput = z.infer<typeof createDisruptionSchema>;
export type UpdateDisruptionInput = z.infer<typeof updateDisruptionSchema>;
export type EventAnalysisResult = z.infer<typeof eventAnalysisResultSchema>;

export const projectIdSchema = z.object({ projectId: cuidSchema });
