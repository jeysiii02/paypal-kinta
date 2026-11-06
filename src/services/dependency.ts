import type {
  Commitment,
  CommitmentDependency,
  DependencyType,
  Supplier,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logActivity } from "@/services/activity";
import {
  dependencyAnalysisResultSchema,
  type CommitmentImpact,
  type DependencyAnalysisResult,
  type ImpactClassification,
} from "@/lib/validators/dependency";

type CommitmentNode = Commitment & {
  supplier: Pick<Supplier, "id" | "name" | "category">;
  dependencies: CommitmentDependency[];
};

export type IdentifyAffectedInput = {
  projectId: string;
  seedCommitmentIds: string[];
  disruptionId?: string | null;
  /**
   * When true, EVENT_DATE-only links without a seed edge stay UNCERTAIN
   * (e.g. photography can move venues). Default true.
   */
  treatDateOnlyAsUncertain?: boolean;
};

/**
 * Strength of coupling when a commitment depends on a directly affected seed.
 * Higher = more likely INDIRECTLY_AFFECTED vs UNCERTAIN.
 */
function couplingStrength(type: DependencyType): "strong" | "medium" | "weak" {
  switch (type) {
    case "VENUE_ACCESS":
    case "COMMITMENT":
      return "strong";
    case "LOCATION":
    case "SERVICE_ARRANGEMENT":
      return "medium";
    case "EVENT_DATE":
      return "weak";
    default:
      return "medium";
  }
}

function classifyFromEdges(args: {
  commitment: CommitmentNode;
  seedIds: Set<string>;
  treatDateOnlyAsUncertain: boolean;
}): {
  classification: Exclude<ImpactClassification, "DIRECTLY_AFFECTED" | "UNAFFECTED"> | "UNAFFECTED";
  explanation: string;
  relatedDependencyIds: string[];
} {
  const { commitment, seedIds, treatDateOnlyAsUncertain } = args;
  const edges = commitment.dependencies;

  const linkedToSeed = edges.filter(
    (d) =>
      d.dependsOnCommitmentId !== null &&
      seedIds.has(d.dependsOnCommitmentId),
  );

  const dateOnly = edges.filter((d) => d.dependencyType === "EVENT_DATE");
  const locationish = edges.filter(
    (d) =>
      d.dependencyType === "LOCATION" ||
      d.dependencyType === "VENUE_ACCESS",
  );

  // Path 1: explicit depends-on a seed commitment
  if (linkedToSeed.length > 0) {
    const strengths = linkedToSeed.map((d) =>
      couplingStrength(d.dependencyType),
    );
    const relatedDependencyIds = linkedToSeed.map((d) => d.id);
    const descriptions = linkedToSeed
      .map((d) => `[${d.dependencyType}] ${d.description}`)
      .join(" ");

    if (strengths.includes("strong")) {
      return {
        classification: "INDIRECTLY_AFFECTED",
        explanation: `Indirectly affected because it depends on a directly disrupted commitment via a strong coupling (${linkedToSeed.map((d) => d.dependencyType).join(", ")}). This does not mean the commitment is cancelled — confirm logistics with the supplier. ${descriptions}`,
        relatedDependencyIds,
      };
    }

    if (strengths.includes("medium")) {
      return {
        classification: "INDIRECTLY_AFFECTED",
        explanation: `Indirectly affected because location/service arrangement ties it to a disrupted commitment. Re-scoping or relocation may be possible; not automatically cancelled. ${descriptions}`,
        relatedDependencyIds,
      };
    }

    // weak link to seed (unusual EVENT_DATE + dependsOnCommitmentId)
    return {
      classification: "UNCERTAIN",
      explanation: `Linked to a disrupted commitment only via weak/date-style dependency. Impact is uncertain — service may still proceed under alternate arrangements. ${descriptions}`,
      relatedDependencyIds,
    };
  }

  // Path 2: no seed edge — date-only dependencies (photography example)
  if (dateOnly.length > 0 && locationish.length === 0) {
    if (treatDateOnlyAsUncertain) {
      return {
        classification: "UNCERTAIN",
        explanation: `Depends on the event date but not on the disrupted commitment itself. May still proceed at an alternate venue or on a rescheduled date, subject to supplier availability. ${dateOnly.map((d) => d.description).join(" ")}`,
        relatedDependencyIds: dateOnly.map((d) => d.id),
      };
    }
  }

  // Path 3: location/venue-access without dependsOnCommitmentId while seeds exist
  // (loose project-level coupling — treat as uncertain, not cancelled)
  if (locationish.length > 0 && seedIds.size > 0) {
    return {
      classification: "UNCERTAIN",
      explanation: `Has location/venue-access dependencies but no explicit edge to the disrupted commitment(s). Impact is possible if the project location/date changes, but not confirmed. ${locationish.map((d) => d.description).join(" ")}`,
      relatedDependencyIds: locationish.map((d) => d.id),
    };
  }

  // Path 4: date-only already handled; remaining date + other weak → uncertain if seeds exist
  if (dateOnly.length > 0 && seedIds.size > 0) {
    return {
      classification: "UNCERTAIN",
      explanation: `Tied to event timing. If the event is relocated or rescheduled, confirm with the supplier. Not classified as cancelled. ${dateOnly.map((d) => d.description).join(" ")}`,
      relatedDependencyIds: dateOnly.map((d) => d.id),
    };
  }

  return {
    classification: "UNAFFECTED",
    explanation:
      "No dependency path to the disrupted commitment(s) was found in the current graph.",
    relatedDependencyIds: [],
  };
}

/**
 * identifyAffectedCommitments()
 *
 * Deterministic dependency graph analysis.
 * Does NOT auto-cancel connected commitments.
 */
export function identifyAffectedCommitments(
  commitments: CommitmentNode[],
  input: IdentifyAffectedInput,
): DependencyAnalysisResult {
  const seedIds = new Set(input.seedCommitmentIds);
  const knownIds = new Set(commitments.map((c) => c.id));

  for (const id of seedIds) {
    if (!knownIds.has(id)) {
      throw AppError.badRequest(
        `Seed commitment ${id} is not part of project ${input.projectId}`,
      );
    }
  }

  if (seedIds.size === 0) {
    throw AppError.badRequest(
      "seedCommitmentIds must include at least one directly affected commitment",
    );
  }

  const treatDateOnlyAsUncertain = input.treatDateOnlyAsUncertain ?? true;

  const directlyAffected: CommitmentImpact[] = [];
  const indirectlyAffected: CommitmentImpact[] = [];
  const uncertain: CommitmentImpact[] = [];
  const unaffected: CommitmentImpact[] = [];

  for (const commitment of commitments) {
    if (seedIds.has(commitment.id)) {
      const impact: CommitmentImpact = {
        commitmentId: commitment.id,
        title: commitment.title,
        supplierId: commitment.supplierId,
        supplierName: commitment.supplier.name,
        classification: "DIRECTLY_AFFECTED",
        explanation:
          "Identified as a seed / directly disrupted commitment (e.g. named in the cancellation notice or provided as analysis input). Status is not automatically set to cancelled by this engine.",
        relatedDependencyIds: commitment.dependencies.map((d) => d.id),
        assumedCancelled: false,
      };
      directlyAffected.push(impact);
      continue;
    }

    const result = classifyFromEdges({
      commitment,
      seedIds,
      treatDateOnlyAsUncertain,
    });

    const impact: CommitmentImpact = {
      commitmentId: commitment.id,
      title: commitment.title,
      supplierId: commitment.supplierId,
      supplierName: commitment.supplier.name,
      classification: result.classification,
      explanation: result.explanation,
      relatedDependencyIds: result.relatedDependencyIds,
      assumedCancelled: false,
    };

    switch (result.classification) {
      case "INDIRECTLY_AFFECTED":
        indirectlyAffected.push(impact);
        break;
      case "UNCERTAIN":
        uncertain.push(impact);
        break;
      default:
        unaffected.push(impact);
    }
  }

  const notes = [
    "Dependency analysis is deterministic and evidence-based on CommitmentDependency records.",
    "No commitment is automatically marked cancelled by this engine.",
    "INDIRECTLY_AFFECTED means impact is likely via dependency; confirm with the supplier.",
    "UNCERTAIN means impact depends on relocation/reschedule choices (e.g. photography may still work at another venue).",
    "This analysis does not determine legal refund entitlement.",
  ];

  return dependencyAnalysisResultSchema.parse({
    projectId: input.projectId,
    disruptionId: input.disruptionId ?? null,
    seedCommitmentIds: [...seedIds],
    directlyAffected,
    indirectlyAffected,
    uncertain,
    unaffected,
    notes,
  });
}

async function loadProjectCommitments(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw AppError.notFound("Project", projectId);
  }

  const commitments = await prisma.commitment.findMany({
    where: { projectId },
    include: {
      supplier: { select: { id: true, name: true, category: true } },
      dependencies: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return { project, commitments };
}

async function resolveSeedCommitmentIds(
  disruptionId: string | null | undefined,
  explicit?: string[],
): Promise<string[]> {
  if (explicit && explicit.length > 0) {
    return [...new Set(explicit)];
  }

  if (!disruptionId) {
    throw AppError.badRequest(
      "Provide seedCommitmentIds, or run AI analysis first so affected commitments can be used as seeds",
    );
  }

  const analysis = await prisma.eventAnalysis.findUnique({
    where: { disruptionId },
  });

  if (!analysis) {
    throw AppError.badRequest(
      "No EventAnalysis found. Run POST /api/disruptions/:id/analyze first, or pass seedCommitmentIds in the body",
    );
  }

  const fromAi = JSON.parse(analysis.affectedCommitmentIds) as string[];
  if (!Array.isArray(fromAi) || fromAi.length === 0) {
    throw AppError.badRequest(
      "EventAnalysis has no affectedCommitmentIds. Pass seedCommitmentIds explicitly",
    );
  }

  return [...new Set(fromAi)];
}

/**
 * Run dependency analysis for a disruption (seeds from body or EventAnalysis).
 */
export async function analyzeDisruptionDependencies(
  disruptionId: string,
  body?: { seedCommitmentIds?: string[] },
) {
  const disruption = await prisma.disruption.findUnique({
    where: { id: disruptionId },
  });
  if (!disruption) {
    throw AppError.notFound("Disruption", disruptionId);
  }

  const seedCommitmentIds = await resolveSeedCommitmentIds(
    disruptionId,
    body?.seedCommitmentIds,
  );

  const { commitments } = await loadProjectCommitments(disruption.projectId);
  const result = identifyAffectedCommitments(commitments, {
    projectId: disruption.projectId,
    seedCommitmentIds,
    disruptionId,
  });

  // Merge into EventAnalysis.rawAnalysisJson when present
  const existing = await prisma.eventAnalysis.findUnique({
    where: { disruptionId },
  });

  if (existing) {
    let raw: Record<string, unknown> = {};
    try {
      raw = JSON.parse(existing.rawAnalysisJson) as Record<string, unknown>;
    } catch {
      raw = {};
    }
    raw.dependencyAnalysis = result;

    await prisma.eventAnalysis.update({
      where: { disruptionId },
      data: {
        potentiallyAffectedIds: JSON.stringify(
          result.indirectlyAffected.map((c) => c.commitmentId),
        ),
        unaffectedCommitmentIds: JSON.stringify(
          result.unaffected.map((c) => c.commitmentId),
        ),
        rawAnalysisJson: JSON.stringify(raw),
      },
    });
  }

  await logActivity({
    projectId: disruption.projectId,
    action: "DEPENDENCY_ANALYSIS_COMPLETED",
    entityType: "Disruption",
    entityId: disruptionId,
    message: `Dependency analysis completed: direct=${result.directlyAffected.length}, indirect=${result.indirectlyAffected.length}, uncertain=${result.uncertain.length}, unaffected=${result.unaffected.length}`,
    metadata: {
      seedCommitmentIds: result.seedCommitmentIds,
      direct: result.directlyAffected.map((c) => c.commitmentId),
      indirect: result.indirectlyAffected.map((c) => c.commitmentId),
      uncertain: result.uncertain.map((c) => c.commitmentId),
      unaffected: result.unaffected.map((c) => c.commitmentId),
    },
  });

  return result;
}

/**
 * Standalone project-level analysis with explicit seeds.
 */
export async function analyzeProjectDependencies(
  projectId: string,
  seedCommitmentIds: string[],
) {
  const { commitments } = await loadProjectCommitments(projectId);
  const result = identifyAffectedCommitments(commitments, {
    projectId,
    seedCommitmentIds,
    disruptionId: null,
  });

  await logActivity({
    projectId,
    action: "DEPENDENCY_ANALYSIS_COMPLETED",
    entityType: "Project",
    entityId: projectId,
    message: `Project dependency analysis completed with ${seedCommitmentIds.length} seed(s)`,
    metadata: { seedCommitmentIds, resultSummary: {
      direct: result.directlyAffected.length,
      indirect: result.indirectlyAffected.length,
      uncertain: result.uncertain.length,
      unaffected: result.unaffected.length,
    } },
  });

  return result;
}

export async function getStoredDependencyAnalysis(disruptionId: string) {
  const disruption = await prisma.disruption.findUnique({
    where: { id: disruptionId },
    include: { eventAnalysis: true },
  });
  if (!disruption) {
    throw AppError.notFound("Disruption", disruptionId);
  }
  if (!disruption.eventAnalysis) {
    throw AppError.notFound("EventAnalysis for disruption", disruptionId);
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(disruption.eventAnalysis.rawAnalysisJson) as Record<
      string,
      unknown
    >;
  } catch {
    throw AppError.badRequest("Stored EventAnalysis JSON is invalid");
  }

  if (!raw.dependencyAnalysis) {
    throw AppError.notFound(
      "Dependency analysis for disruption",
      disruptionId,
    );
  }

  return dependencyAnalysisResultSchema.parse(raw.dependencyAnalysis);
}
