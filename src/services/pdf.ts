import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export type ExtractedPdf = {
  text: string;
  pageCount: number | null;
};

/**
 * Extract plain text from a PDF buffer using pdf-parse v2.
 */
export async function extractPdfText(buffer: Buffer): Promise<ExtractedPdf> {
  try {
    // Worker/canvas setup must load before PDFParse (Node DOMMatrix polyfill).
    const { CanvasFactory } = await import("pdf-parse/worker");
    const { PDFParse } = await import("pdf-parse");

    const parser = new PDFParse({
      data: new Uint8Array(buffer),
      CanvasFactory,
    });

    const result = await parser.getText();
    const text = (result.text ?? "").trim();

    return {
      text,
      pageCount:
        typeof result.total === "number"
          ? result.total
          : Array.isArray(result.pages)
            ? result.pages.length
            : null,
    };
  } catch (error) {
    console.error("[pdf] extraction failed", error);
    throw AppError.badRequest(
      "Failed to extract text from PDF. Ensure the file is a valid PDF.",
      { cause: error instanceof Error ? error.message : String(error) },
    );
  }
}

export type StoredUpload = {
  storagePath: string;
  absolutePath: string;
  filename: string;
};

/**
 * Persist an uploaded file under /uploads/{projectId}/{uuid}-{safeName}
 */
export async function storeUpload(
  projectId: string,
  originalFilename: string,
  buffer: Buffer,
): Promise<StoredUpload> {
  const safeName = originalFilename
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 120);
  const filename = `${randomUUID()}-${safeName || "document.pdf"}`;
  const relativeDir = path.join(projectId);
  const absoluteDir = path.join(UPLOAD_ROOT, relativeDir);
  await mkdir(absoluteDir, { recursive: true });

  const absolutePath = path.join(absoluteDir, filename);
  await writeFile(absolutePath, buffer);

  return {
    storagePath: path.join(relativeDir, filename).replace(/\\/g, "/"),
    absolutePath,
    filename: safeName || "document.pdf",
  };
}

export function isPdfMime(mimeType: string, filename: string) {
  const normalized = mimeType.toLowerCase();
  return (
    normalized === "application/pdf" ||
    normalized === "application/x-pdf" ||
    filename.toLowerCase().endsWith(".pdf")
  );
}
