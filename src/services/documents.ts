import type { DocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logActivity } from "@/services/activity";
import {
  extractPdfText,
  isPdfMime,
  storeUpload,
} from "@/services/pdf";

export async function listDocuments(filters: {
  projectId?: string;
  disruptionId?: string;
}) {
  if (!filters.projectId && !filters.disruptionId) {
    throw AppError.badRequest("projectId or disruptionId is required");
  }

  return prisma.document.findMany({
    where: {
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.disruptionId ? { disruptionId: filters.disruptionId } : {}),
    },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      projectId: true,
      disruptionId: true,
      type: true,
      filename: true,
      mimeType: true,
      storagePath: true,
      extractedText: true,
      uploadedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getDocument(id: string) {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    throw AppError.notFound("Document", id);
  }
  return document;
}

type UploadInput = {
  projectId: string;
  disruptionId?: string | null;
  type: DocumentType;
  file: {
    filename: string;
    mimeType: string;
    buffer: Buffer;
  };
};

/**
 * Store upload, extract PDF text when applicable, persist Document row.
 */
export async function uploadDocument(input: UploadInput) {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
  });
  if (!project) {
    throw AppError.notFound("Project", input.projectId);
  }

  if (input.disruptionId) {
    const disruption = await prisma.disruption.findUnique({
      where: { id: input.disruptionId },
    });
    if (!disruption) {
      throw AppError.notFound("Disruption", input.disruptionId);
    }
    if (disruption.projectId !== input.projectId) {
      throw AppError.badRequest(
        "Disruption does not belong to this project",
      );
    }
  }

  const { filename, mimeType, buffer } = input.file;
  if (!buffer.length) {
    throw AppError.badRequest("Uploaded file is empty");
  }

  const stored = await storeUpload(input.projectId, filename, buffer);

  let extractedText: string | null = null;
  if (isPdfMime(mimeType, filename)) {
    const extracted = await extractPdfText(buffer);
    extractedText = extracted.text || null;
  } else if (
    mimeType.startsWith("text/") ||
    filename.toLowerCase().endsWith(".txt")
  ) {
    extractedText = buffer.toString("utf8");
  } else {
    throw AppError.badRequest(
      "Only PDF or plain-text documents are supported for extraction",
      { mimeType, filename },
    );
  }

  const document = await prisma.document.create({
    data: {
      projectId: input.projectId,
      disruptionId: input.disruptionId ?? null,
      type: input.type,
      filename: stored.filename,
      mimeType,
      storagePath: stored.storagePath,
      extractedText,
    },
  });

  await logActivity({
    projectId: input.projectId,
    action: "DOCUMENT_UPLOADED",
    entityType: "Document",
    entityId: document.id,
    message: `Document uploaded: ${document.filename} (${document.type})`,
    metadata: {
      disruptionId: document.disruptionId,
      hasExtractedText: Boolean(extractedText),
      storagePath: document.storagePath,
    },
  });

  return document;
}
