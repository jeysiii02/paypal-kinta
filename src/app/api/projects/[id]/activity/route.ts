import { z } from "zod";
import { handleRouteError, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { listActivityByProject } from "@/services/activity";

type Params = { params: Promise<{ id: string }> };

const activityActionSchema = z.enum([
  "PROJECT_CREATED",
  "PROJECT_UPDATED",
  "PROJECT_ARCHIVED",
  "SUPPLIER_CREATED",
  "SUPPLIER_UPDATED",
  "COMMITMENT_CREATED",
  "COMMITMENT_UPDATED",
  "COMMITMENT_STATUS_CHANGED",
  "EXPENSE_CREATED",
  "DISRUPTION_REPORTED",
  "DOCUMENT_UPLOADED",
  "AI_ANALYSIS_COMPLETED",
  "DEPENDENCY_ANALYSIS_COMPLETED",
  "RECOVERY_PLAN_GENERATED",
  "SCENARIO_CALCULATED",
  "ACTION_CREATED",
  "ACTION_APPROVED",
  "ACTION_REJECTED",
  "ACTION_STATUS_CHANGED",
]);

export async function GET(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw AppError.notFound("Project", projectId);
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const actionParam = searchParams.get("action");

    const limit = limitParam ? Number(limitParam) : 100;
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw AppError.validation("limit must be an integer between 1 and 500");
    }

    const action = actionParam
      ? activityActionSchema.parse(actionParam)
      : undefined;

    const logs = await listActivityByProject(projectId, { limit, action });
    return ok(logs);
  } catch (error) {
    return handleRouteError(error);
  }
}
