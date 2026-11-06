import { created, handleRouteError, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { documentTypeSchema } from "@/lib/validators/disruptions";
import { listDocuments, uploadDocument } from "@/services/documents";
import { getDisruption } from "@/services/disruptions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id: disruptionId } = await params;
    await getDisruption(disruptionId);
    const documents = await listDocuments({ disruptionId });
    return ok(documents);
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * Multipart upload:
 * - file: PDF or .txt
 * - type: NOTICE | AGREEMENT | OTHER (optional, default NOTICE)
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id: disruptionId } = await params;
    const disruption = await getDisruption(disruptionId);

    const form = await request.formData();
    const file = form.get("file");
    const typeRaw = form.get("type");

    if (!(file instanceof File)) {
      throw AppError.validation('Form field "file" is required');
    }

    const type = documentTypeSchema.parse(
      typeof typeRaw === "string" && typeRaw.length > 0 ? typeRaw : "NOTICE",
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await uploadDocument({
      projectId: disruption.projectId,
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
