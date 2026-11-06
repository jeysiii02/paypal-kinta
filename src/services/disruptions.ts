import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logActivity } from "@/services/activity";
import {
  analyzeBusinessEvent,
  type AnalysisContext,
} from "@/services/ai/analyzeBusinessEvent";
import type {
  CreateDisruptionInput,
  EventAnalysisResult,
  UpdateDisruptionInput,
} from "@/lib/validators/disruptions";

const disruptionDetailInclude = {
  documents: { orderBy: { uploadedAt: "asc" as const } },
  eventAnalysis: true,
  project: {
    select: {
      id: true,
      name: true,
      eventDate: true,
      location: true,
      budget: true,
      status: true,
    },
  },
} satisfies Prisma.DisruptionInclude;

async function requireProject(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw AppError.notFound("Project", projectId);
  }
  return project;
}

export async function createDisruption(
  projectId: string,
  input: CreateDisruptionInput,
) {
  const project = await requireProject(projectId);

  const disruption = await prisma.disruption.create({
    data: {
      projectId,
      title: input.title,
      description: input.description,
      reportedAt: input.reportedAt ?? new Date(),
      status: "REPORTED",
    },
  });

  // Mark project disrupted if it was active/draft
  if (project.status === "ACTIVE" || project.status === "DRAFT") {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "DISRUPTED" },
    });
  }

  await logActivity({
    projectId,
    userId: project.userId,
    action: "DISRUPTION_REPORTED",
    entityType: "Disruption",
    entityId: disruption.id,
    message: `Disruption reported: ${disruption.title}`,
  });

  return disruption;
}

export async function listDisruptions(projectId: string) {
  await requireProject(projectId);

  return prisma.disruption.findMany({
    where: { projectId },
    orderBy: { reportedAt: "desc" },
    include: {
      documents: {
        select: {
          id: true,
          type: true,
          filename: true,
          uploadedAt: true,
          extractedText: true,
        },
      },
      eventAnalysis: {
        select: {
          id: true,
          incidentType: true,
          confidenceLevel: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function getDisruption(id: string) {
  const disruption = await prisma.disruption.findUnique({
    where: { id },
    include: disruptionDetailInclude,
  });

  if (!disruption) {
    throw AppError.notFound("Disruption", id);
  }

  return disruption;
}

export async function updateDisruption(
  id: string,
  input: UpdateDisruptionInput,
) {
  const existing = await prisma.disruption.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound("Disruption", id);
  }

  return prisma.disruption.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });
}

function serializeAnalysisForDb(analysis: EventAnalysisResult) {
  return {
    incidentType: analysis.incidentType,
    incidentSummary: analysis.incidentSummary,
    affectedSupplierIds: JSON.stringify(analysis.affectedSupplierIds),
    affectedCommitmentIds: JSON.stringify(analysis.affectedCommitmentIds),
    potentiallyAffectedIds: JSON.stringify(
      analysis.potentiallyAffectedCommitmentIds,
    ),
    unaffectedCommitmentIds: JSON.stringify(analysis.unaffectedCommitmentIds),
    relevantDates: JSON.stringify(analysis.relevantDates),
    relevantAgreementConditions: JSON.stringify(
      analysis.relevantAgreementConditions,
    ),
    evidenceReferences: JSON.stringify(analysis.evidenceReferences),
    missingInformation: JSON.stringify(analysis.missingInformation),
    assumptions: JSON.stringify(analysis.assumptions),
    confidenceLevel: analysis.confidenceLevel,
    rawAnalysisJson: JSON.stringify(analysis),
  };
}

export function parseStoredAnalysis(rawAnalysisJson: string): EventAnalysisResult {
  return JSON.parse(rawAnalysisJson) as EventAnalysisResult;
}

async function buildAnalysisContext(
  disruptionId: string,
): Promise<AnalysisContext> {
  const disruption = await prisma.disruption.findUnique({
    where: { id: disruptionId },
    include: {
      documents: true,
      project: true,
    },
  });

  if (!disruption) {
    throw AppError.notFound("Disruption", disruptionId);
  }

  const [suppliers, commitments] = await Promise.all([
    prisma.supplier.findMany({
      where: { projectId: disruption.projectId },
      orderBy: { name: "asc" },
    }),
    prisma.commitment.findMany({
      where: { projectId: disruption.projectId },
      include: {
        supplier: { select: { id: true, name: true, category: true } },
        dependencies: {
          select: {
            id: true,
            dependencyType: true,
            description: true,
            dependsOnCommitmentId: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    project: disruption.project,
    disruption,
    suppliers,
    commitments,
    documents: disruption.documents,
  };
}

/**
 * Run analyzeBusinessEvent(), persist EventAnalysis, update disruption status.
 */
export async function runDisruptionAnalysis(disruptionId: string) {
  const ctx = await buildAnalysisContext(disruptionId);

  await prisma.disruption.update({
    where: { id: disruptionId },
    data: { status: "ANALYZING" },
  });

  try {
    const analysis = await analyzeBusinessEvent(ctx);
    const payload = serializeAnalysisForDb(analysis);

    const saved = await prisma.eventAnalysis.upsert({
      where: { disruptionId },
      create: {
        disruptionId,
        ...payload,
      },
      update: payload,
    });

    await prisma.disruption.update({
      where: { id: disruptionId },
      data: { status: "ANALYZED" },
    });

    await logActivity({
      projectId: ctx.project.id,
      userId: ctx.project.userId,
      action: "AI_ANALYSIS_COMPLETED",
      entityType: "EventAnalysis",
      entityId: saved.id,
      message: `AI event analysis completed (${analysis.analysisMethod}): ${analysis.incidentType}`,
      metadata: {
        confidenceLevel: analysis.confidenceLevel,
        affectedCommitmentCount: analysis.affectedCommitmentIds.length,
        potentiallyAffectedCount:
          analysis.potentiallyAffectedCommitmentIds.length,
        analysisMethod: analysis.analysisMethod,
      },
    });

    return {
      disruptionId,
      analysis,
      record: saved,
    };
  } catch (error) {
    await prisma.disruption.update({
      where: { id: disruptionId },
      data: { status: "REPORTED" },
    });
    throw error;
  }
}

export async function getDisruptionAnalysis(disruptionId: string) {
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

  return {
    disruptionId,
    status: disruption.status,
    analysis: parseStoredAnalysis(disruption.eventAnalysis.rawAnalysisJson),
    record: disruption.eventAnalysis,
  };
}
