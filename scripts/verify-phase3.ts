/**
 * Smoke-test Phase 3 disruption / document / analysis APIs.
 * Expects AI_PROVIDER=heuristic (or a valid AI_API_KEY for gemini).
 * Usage: npx tsx scripts/verify-phase3.ts [baseUrl]
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

async function api<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: ApiResult<T> }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as ApiResult<T>;
  return { status: res.status, json };
}

async function uploadText(
  path: string,
  filename: string,
  text: string,
  type: string,
) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([text], { type: "text/plain" }),
    filename,
  );
  form.append("type", type);
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: form });
  const json = (await res.json()) as ApiResult<{
    id: string;
    extractedText: string | null;
  }>;
  return { status: res.status, json };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`Phase 3 smoke test → ${BASE}\n`);

  const projects = await api<Array<{ id: string; name: string }>>(
    "GET",
    "/api/projects",
  );
  assert(projects.status === 200 && projects.json.success, "list projects failed");
  const summit = projects.json.success
    ? projects.json.data.find((p) => p.name === "University Tech Summit")
    : undefined;
  assert(!!summit, "University Tech Summit missing — run db seed");
  console.log("✓ found University Tech Summit");

  // Seeded disruption should exist
  const listed = await api<
    Array<{ id: string; title: string; documents: unknown[] }>
  >("GET", `/api/projects/${summit!.id}/disruptions`);
  assert(listed.status === 200 && listed.json.success, "list disruptions failed");
  const seeded = listed.json.success
    ? listed.json.data.find((d) =>
        d.title.toLowerCase().includes("venue alpha"),
      )
    : undefined;
  assert(!!seeded, "seeded Venue Alpha disruption missing");
  console.log("✓ GET /api/projects/:id/disruptions");

  // Analyze seeded disruption (heuristic or gemini)
  const analyzed = await api<{
    analysis: {
      incidentType: string;
      affectedCommitmentIds: string[];
      potentiallyAffectedCommitmentIds: string[];
      unaffectedCommitmentIds: string[];
      confidenceLevel: string;
      analysisMethod: string;
      legalDisclaimer: string;
    };
  }>("POST", `/api/disruptions/${seeded!.id}/analyze`);

  assert(
    analyzed.status === 200 && analyzed.json.success,
    `analyze failed: ${JSON.stringify(analyzed.json)}`,
  );

  if (analyzed.json.success) {
    const a = analyzed.json.data.analysis;
    assert(a.affectedCommitmentIds.length >= 1, "expected ≥1 affected commitment");
    assert(
      a.potentiallyAffectedCommitmentIds.length >= 1,
      "expected ≥1 potentially affected (catering/photo/equipment)",
    );
    assert(
      a.legalDisclaimer.toLowerCase().includes("legal refund"),
      "missing legal disclaimer",
    );
    console.log(
      `✓ POST analyze (${a.analysisMethod}) — affected=${a.affectedCommitmentIds.length}, potential=${a.potentiallyAffectedCommitmentIds.length}, unaffected=${a.unaffectedCommitmentIds.length}`,
    );
  }

  const fetched = await api<{ analysis: { incidentType: string } }>(
    "GET",
    `/api/disruptions/${seeded!.id}/analysis`,
  );
  assert(fetched.status === 200 && fetched.json.success, "GET analysis failed");
  console.log("✓ GET /api/disruptions/:id/analysis");

  // Create a fresh disruption + upload text notice
  const created = await api<{ id: string }>(
    "POST",
    `/api/projects/${summit!.id}/disruptions`,
    {
      title: "Phase 3 smoke disruption",
      description:
        "Temporary disruption for API verification. Catering Beta may delay delivery.",
    },
  );
  assert(created.status === 201 && created.json.success, "create disruption failed");
  const disruptionId = created.json.success ? created.json.data.id : "";
  console.log("✓ POST /api/projects/:id/disruptions");

  const notice = `
CATERING BETA — DELAY NOTICE (FICTIONAL)
Date: November 5, 2026
To: University Tech Summit
Catering Beta reports a possible delay for December 15, 2026 service in Quezon City.
Deposit received remains subject to written mutual agreement. This is not a legal refund determination.
`.trim();

  const uploaded = await uploadText(
    `/api/disruptions/${disruptionId}/documents`,
    "catering-delay-notice.txt",
    notice,
    "NOTICE",
  );
  assert(
    uploaded.status === 201 &&
      uploaded.json.success &&
      Boolean(uploaded.json.data.extractedText),
    `upload failed: ${JSON.stringify(uploaded.json)}`,
  );
  console.log("✓ POST /api/disruptions/:id/documents (text extraction)");

  const reanalyze = await api<{
    analysis: { affectedSupplierIds: string[]; analysisMethod: string };
  }>("POST", `/api/disruptions/${disruptionId}/analyze`);
  assert(
    reanalyze.status === 200 && reanalyze.json.success,
    `re-analyze failed: ${JSON.stringify(reanalyze.json)}`,
  );
  console.log("✓ re-analyze after document upload");

  // Detail endpoint
  const detail = await api<{
    documents: unknown[];
    eventAnalysis: { id: string } | null;
  }>("GET", `/api/disruptions/${disruptionId}`);
  assert(
    detail.status === 200 &&
      detail.json.success &&
      detail.json.data.eventAnalysis !== null,
    "GET disruption detail missing analysis",
  );
  console.log("✓ GET /api/disruptions/:id");

  console.log("\nAll Phase 3 smoke checks passed.");
}

main().catch((err) => {
  console.error("\nPhase 3 smoke test FAILED:", err);
  process.exit(1);
});
