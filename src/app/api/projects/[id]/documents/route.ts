import { created, handleRouteError, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { documentTypeSchema } from "@/lib/validators/disruptions";
import { listDocuments, uploadDocument } from "@/services/documents";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw AppError.notFound("Project", projectId);
    }

    const documents = await listDocuments({ projectId });
    return ok(documents);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** Upload a project-level document (optionally attach later to a disruption). */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw AppError.notFound("Project", projectId);
    }

    const form = await request.formData();
    const file = form.get("file");
    const typeRaw = form.get("type");
    const disruptionIdRaw = form.get("disruptionId");

    if (!(file instanceof File)) {
      throw AppError.validation('Form field "file" is required');
    }

    const type = documentTypeSchema.parse(
      typeof typeRaw === "string" && typeRaw.length > 0 ? typeRaw : "OTHER",
    );

    const disruptionId =
      typeof disruptionIdRaw === "string" && disruptionIdRaw.length > 0
        ? disruptionIdRaw
        : null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await uploadDocument({
      projectId,
      disruptionId,
      type,
      file: {
        filename: file.name || "upload.pdf",
        mimeType: file.type || "application/octet-stream",
        buffer,
      },
    });

    return created(document);
  } catch (error) {
    return handleRouteError(error);
  }
}
