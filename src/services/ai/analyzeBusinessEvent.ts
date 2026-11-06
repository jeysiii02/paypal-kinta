import type { Commitment, Document, Disruption, Project, Supplier } from "@prisma/client";
import {
  eventAnalysisResultSchema,
  type EventAnalysisResult,
} from "@/lib/validators/disruptions";
import { generateJsonWithGemini, getAiProviderName } from "@/services/ai/provider";
import { AppError } from "@/lib/errors";

export type AnalysisContext = {
  project: Project;
  disruption: Disruption;
  suppliers: Supplier[];
  commitments: Array<
    Commitment & {
      supplier: Pick<Supplier, "id" | "name" | "category">;
      dependencies: Array<{
        id: string;
        dependencyType: string;
        description: string;
        dependsOnCommitmentId: string | null;
      }>;
    }
  >;
  documents: Document[];
};

const LEGAL_DISCLAIMER =
  "This analysis does not determine legal refund entitlement. Confirm outcomes with suppliers and applicable agreements.";

function buildPrompt(ctx: AnalysisContext): string {
  const supplierLines = ctx.suppliers
    .map(
      (s) =>
        `- id=${s.id} | ${s.name} | category=${s.category} | contact=${s.contactPerson ?? "n/a"}`,
    )
    .join("\n");

  const commitmentLines = ctx.commitments
    .map((c) => {
      const deps = c.dependencies
        .map(
          (d) =>
            `    dep: type=${d.dependencyType}; dependsOn=${d.dependsOnCommitmentId ?? "n/a"}; ${d.description}`,
        )
        .join("\n");
      return [
        `- id=${c.id} | title=${c.title} | supplierId=${c.supplierId} (${c.supplier.name})`,
        `  agreedAmountCentavos=${c.agreedAmount} amountPaidCentavos=${c.amountPaid} status=${c.status} paymentStatus=${c.paymentStatus}`,
        `  cancellationConditions=${c.cancellationConditions ?? "n/a"}`,
        `  refundConditions=${c.refundConditions ?? "n/a"}`,
        deps || "    (no dependencies)",
      ].join("\n");
    })
    .join("\n");

  const documentBlocks = ctx.documents
    .map((d, i) => {
      const text = d.extractedText?.trim() || "(no extracted text)";
      return `--- Document ${i + 1}: ${d.type} / ${d.filename} ---\n${text}`;
    })
    .join("\n\n");

  return `You are KINTA's business disruption analyst for event/project recovery.

CRITICAL RULES:
1. Use ONLY information present in the project data, commitments, and document text below.
2. Do NOT fabricate supplier quotes, refund guarantees, or facts not in the source material.
3. Do NOT determine legal refund entitlement. Never claim a party "must" refund by law.
4. Clearly separate confirmed facts vs assumptions vs missing information.
5. Distinguishing commitments:
   - affectedCommitmentIds: directly impacted by the incident (e.g. cancelled venue)
   - potentiallyAffectedCommitmentIds: may be impacted via dependency / logistics, but not confirmed cancelled
   - unaffectedCommitmentIds: no clear impact from the supplied evidence
6. Only include supplier/commitment IDs that exist in the lists below.
7. Return STRICT JSON matching the schema. No markdown.

PROJECT
- id: ${ctx.project.id}
- name: ${ctx.project.name}
- eventDate: ${ctx.project.eventDate.toISOString()}
- location: ${ctx.project.location}
- budgetCentavos: ${ctx.project.budget}
- expectedAttendees: ${ctx.project.expectedAttendees}
- status: ${ctx.project.status}

DISRUPTION REPORT
- id: ${ctx.disruption.id}
- title: ${ctx.disruption.title}
- description: ${ctx.disruption.description}
- reportedAt: ${ctx.disruption.reportedAt.toISOString()}

SUPPLIERS
${supplierLines || "(none)"}

COMMITMENTS
${commitmentLines || "(none)"}

DOCUMENTS / EXTRACTED TEXT
${documentBlocks || "(no documents uploaded)"}

JSON SCHEMA TO RETURN:
{
  "incidentType": string,
  "incidentSummary": string,
  "affectedSupplierIds": string[],
  "affectedCommitmentIds": string[],
  "potentiallyAffectedCommitmentIds": string[],
  "unaffectedCommitmentIds": string[],
  "relevantDates": string[],
  "relevantAgreementConditions": string[],
  "evidenceReferences": string[],
  "missingInformation": string[],
  "assumptions": string[],
  "confidenceLevel": "LOW" | "MEDIUM" | "HIGH",
  "legalDisclaimer": string,
  "analysisMethod": "gemini"
}`;
}

function filterKnownIds(ids: string[], known: Set<string>) {
  return ids.filter((id) => known.has(id));
}

function sanitizeAnalysis(
  raw: EventAnalysisResult,
  ctx: AnalysisContext,
  method: "gemini" | "heuristic",
): EventAnalysisResult {
  const supplierIds = new Set(ctx.suppliers.map((s) => s.id));
  const commitmentIds = new Set(ctx.commitments.map((c) => c.id));

  return eventAnalysisResultSchema.parse({
    ...raw,
    affectedSupplierIds: filterKnownIds(raw.affectedSupplierIds, supplierIds),
    affectedCommitmentIds: filterKnownIds(
      raw.affectedCommitmentIds,
      commitmentIds,
    ),
    potentiallyAffectedCommitmentIds: filterKnownIds(
      raw.potentiallyAffectedCommitmentIds,
      commitmentIds,
    ),
    unaffectedCommitmentIds: filterKnownIds(
      raw.unaffectedCommitmentIds,
      commitmentIds,
    ),
    legalDisclaimer: LEGAL_DISCLAIMER,
    analysisMethod: method,
  });
}

/**
 * Offline deterministic extractor for local demo when Gemini is unavailable.
 * Uses document/DB text only — does not invent refund entitlements.
 */
export function heuristicAnalyzeBusinessEvent(
  ctx: AnalysisContext,
): EventAnalysisResult {
  const corpus = [
    ctx.disruption.title,
    ctx.disruption.description,
    ...ctx.documents.map((d) => d.extractedText ?? ""),
  ]
    .join("\n")
    .toLowerCase();

  const cancellationHints =
    /cancel|unavailable|maintenance|force majeure|postpone/.test(corpus);

  const affectedSuppliers = ctx.suppliers.filter((s) => {
    const name = s.name.toLowerCase();
    return name.length > 0 && corpus.includes(name.toLowerCase());
  });

  const affectedByName = new Set(affectedSuppliers.map((s) => s.id));

  // Commitments whose supplier is named in the notice, or title terms appear
  const directlyAffected = ctx.commitments.filter((c) => {
    if (affectedByName.has(c.supplierId)) return true;
    const title = c.title.toLowerCase();
    return title.length > 3 && corpus.includes(title);
  });

  const directIds = new Set(directlyAffected.map((c) => c.id));

  const potentiallyAffected = ctx.commitments.filter((c) => {
    if (directIds.has(c.id)) return false;
    return c.dependencies.some((d) => {
      if (
        d.dependsOnCommitmentId &&
        directIds.has(d.dependsOnCommitmentId)
      ) {
        return true;
      }
      if (
        cancellationHints &&
        (d.dependencyType === "VENUE_ACCESS" ||
          d.dependencyType === "LOCATION" ||
          d.dependencyType === "EVENT_DATE")
      ) {
        // Only mark potentially affected if a venue-like supplier was hit
        const venueHit = affectedSuppliers.some(
          (s) => s.category === "VENUE",
        );
        if (!venueHit) return false;
        if (d.dependencyType === "EVENT_DATE") {
          // Event-date deps (e.g. photography) are uncertain, not auto-cancelled
          return true;
        }
        return true;
      }
      return false;
    });
  });

  const potentialIds = new Set(potentiallyAffected.map((c) => c.id));

  const unaffected = ctx.commitments.filter(
    (c) => !directIds.has(c.id) && !potentialIds.has(c.id),
  );

  const dates: string[] = [];
  const dateMatches = corpus.match(
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b/gi,
  );
  if (dateMatches) dates.push(...new Set(dateMatches.map((d) => d.trim())));
  dates.push(`Project event date: ${ctx.project.eventDate.toISOString()}`);

  const agreementBits: string[] = [];
  for (const doc of ctx.documents) {
    if (doc.type !== "AGREEMENT" && doc.type !== "NOTICE") continue;
    const text = doc.extractedText ?? "";
    const lines = text
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) =>
        /cancel|refund|deposit|alternate|mutual agreement|section/i.test(l),
      );
    agreementBits.push(...lines.slice(0, 8));
  }

  const evidence = ctx.documents.map(
    (d) => `${d.type}:${d.filename}${d.extractedText ? " (text extracted)" : " (no text)"}`,
  );
  evidence.push(`Disruption description provided by user`);

  const missing: string[] = [];
  if (ctx.documents.length === 0) {
    missing.push("No notice/agreement documents uploaded");
  }
  if (!ctx.documents.some((d) => d.type === "AGREEMENT")) {
    missing.push("Full supplier agreements for dependent suppliers not provided");
  }
  missing.push(
    "Written confirmation of deposit disposition from the cancelling supplier",
  );
  missing.push(
    "Availability/change fees from potentially affected suppliers (catering, photography, equipment)",
  );

  const assumptions = [
    "Supplier names appearing in the notice refer to the matching project suppliers",
    "Dependency records in the database remain accurate",
    cancellationHints
      ? "Wording such as cancel/unavailable indicates a service disruption for matching suppliers"
      : "Incident classification inferred from disruption description only",
  ];

  const raw: EventAnalysisResult = {
    incidentType: cancellationHints
      ? "SUPPLIER_CANCELLATION"
      : "BUSINESS_DISRUPTION",
    incidentSummary: cancellationHints
      ? `Reported disruption involving cancellation/unavailability language. Matched ${directlyAffected.length} commitment(s) directly and ${potentiallyAffected.length} as potentially affected via dependencies. This is a heuristic extraction — not a legal determination.`
      : `Disruption reported: ${ctx.disruption.title}. Heuristic extraction found limited cancellation keywords; review evidence manually.`,
    affectedSupplierIds: affectedSuppliers.map((s) => s.id),
    affectedCommitmentIds: directlyAffected.map((c) => c.id),
    potentiallyAffectedCommitmentIds: potentiallyAffected.map((c) => c.id),
    unaffectedCommitmentIds: unaffected.map((c) => c.id),
    relevantDates: dates,
    relevantAgreementConditions: agreementBits.slice(0, 12),
    evidenceReferences: evidence,
    missingInformation: missing,
    assumptions,
    confidenceLevel:
      directlyAffected.length > 0 && ctx.documents.some((d) => d.extractedText)
        ? "MEDIUM"
        : "LOW",
    legalDisclaimer: LEGAL_DISCLAIMER,
    analysisMethod: "heuristic",
  };

  return sanitizeAnalysis(raw, ctx, "heuristic");
}

async function geminiAnalyzeBusinessEvent(
  ctx: AnalysisContext,
): Promise<EventAnalysisResult> {
  const prompt = buildPrompt(ctx);
  const rawJson = await generateJsonWithGemini(prompt);

  let parsed: EventAnalysisResult;
  try {
    parsed = eventAnalysisResultSchema.parse({
      ...(rawJson as object),
      analysisMethod: "gemini",
      legalDisclaimer: LEGAL_DISCLAIMER,
    });
  } catch (error) {
    throw AppError.badRequest(
      "AI analysis response failed schema validation",
      error,
    );
  }

  return sanitizeAnalysis(parsed, ctx, "gemini");
}

/**
 * analyzeBusinessEvent()
 * Identifies incident type, affected/potential/unaffected commitments,
 * agreement conditions, evidence, missing info, assumptions, confidence.
 * Never fabricates IDs or legal refund entitlement.
 */
export async function analyzeBusinessEvent(
  ctx: AnalysisContext,
): Promise<EventAnalysisResult> {
  const provider = getAiProviderName();
  if (provider === "heuristic") {
    return heuristicAnalyzeBusinessEvent(ctx);
  }
  return geminiAnalyzeBusinessEvent(ctx);
}
