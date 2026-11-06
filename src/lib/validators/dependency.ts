import { z } from "zod";
import { cuidSchema } from "./common";

export const impactClassificationSchema = z.enum([
  "DIRECTLY_AFFECTED",
  "INDIRECTLY_AFFECTED",
  "UNCERTAIN",
  "UNAFFECTED",
]);

export const commitmentImpactSchema = z.object({
  commitmentId: z.string(),
  title: z.string(),
  supplierId: z.string(),
  supplierName: z.string(),
  classification: impactClassificationSchema,
  explanation: z.string(),
  relatedDependencyIds: z.array(z.string()),
  /** Engine never auto-marks commitments cancelled */
  assumedCancelled: z.literal(false),
});

export const dependencyAnalysisResultSchema = z.object({
  projectId: z.string(),
  disruptionId: z.string().nullable(),
  seedCommitmentIds: z.array(z.string()),
  directlyAffected: z.array(commitmentImpactSchema),
  indirectlyAffected: z.array(commitmentImpactSchema),
  uncertain: z.array(commitmentImpactSchema),
  unaffected: z.array(commitmentImpactSchema),
  notes: z.array(z.string()),
});

export const analyzeDependenciesBodySchema = z
  .object({
    /** Explicit seed commitments (e.g. cancelled venue). Optional if EventAnalysis exists. */
    seedCommitmentIds: z.array(cuidSchema).optional(),
  })
  .optional()
  .default({});

export type ImpactClassification = z.infer<typeof impactClassificationSchema>;
export type CommitmentImpact = z.infer<typeof commitmentImpactSchema>;
export type DependencyAnalysisResult = z.infer<
  typeof dependencyAnalysisResultSchema
>;
