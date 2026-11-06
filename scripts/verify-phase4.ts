/**
 * Smoke-test Phase 4 dependency analysis APIs.
 * Usage: npx tsx scripts/verify-phase4.ts [baseUrl]
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
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as ApiResult<T>;
  return { status: res.status, json };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

type DepResult = {
  directlyAffected: Array<{ commitmentId: string; title: string; assumedCancelled: boolean }>;
  indirectlyAffected: Array<{ commitmentId: string; title: string }>;
  uncertain: Array<{ commitmentId: string; title: string }>;
  unaffected: Array<{ commitmentId: string; title: string }>;
};

async function main() {
  console.log(`Phase 4 smoke test → ${BASE}\n`);

  const projects = await api<Array<{ id: string; name: string }>>(
    "GET",
    "/api/projects",
  );
  assert(projects.json.success, "projects failed");
  const summit = projects.json.success
    ? projects.json.data.find((p) => p.name === "University Tech Summit")
    : undefined;
  assert(!!summit, "seed project missing");

  const commitments = await api<
    Array<{ id: string; title: string; supplier: { name: string } }>
  >("GET", `/api/projects/${summit!.id}/commitments`);
  assert(commitments.json.success, "commitments failed");
  const venue = commitments.json.success
    ? commitments.json.data.find((c) =>
        c.supplier.name.toLowerCase().includes("venue"),
      )
    : undefined;
  assert(!!venue, "venue commitment missing");

  // Ensure AI analysis exists so disruption analyze can use seeds
  const disruptions = await api<Array<{ id: string; title: string }>>(
    "GET",
    `/api/projects/${summit!.id}/disruptions`,
  );
  assert(disruptions.json.success, "disruptions failed");
  const seeded = disruptions.json.success
    ? disruptions.json.data.find((d) =>
        d.title.toLowerCase().includes("venue alpha"),
      )
    : undefined;
  assert(!!seeded, "seeded disruption missing");

  await api("POST", `/api/disruptions/${seeded!.id}/analyze`);

  const viaProject = await api<DepResult>(
    "POST",
    `/api/projects/${summit!.id}/dependencies/analyze`,
    { seedCommitmentIds: [venue!.id] },
  );
  assert(
    viaProject.status === 200 && viaProject.json.success,
    `project analyze failed: ${JSON.stringify(viaProject.json)}`,
  );

  if (viaProject.json.success) {
    const r = viaProject.json.data;
    assert(r.directlyAffected.length === 1, "expected 1 direct (venue)");
    assert(
      r.indirectlyAffected.length >= 2,
      `expected ≥2 indirect (catering, equipment), got ${r.indirectlyAffected.length}`,
    );
    assert(
      r.uncertain.some((c) => c.title.toLowerCase().includes("photo")),
      "photography should be uncertain",
    );
    assert(
      r.directlyAffected.every((c) => c.assumedCancelled === false),
      "must not assume cancelled",
    );
    console.log(
      `✓ project analyze — direct=${r.directlyAffected.length}, indirect=${r.indirectlyAffected.length}, uncertain=${r.uncertain.length}, unaffected=${r.unaffected.length}`,
    );
  }

  const viaDisruption = await api<DepResult>(
    "POST",
    `/api/disruptions/${seeded!.id}/dependencies/analyze`,
    {},
  );
  assert(
    viaDisruption.status === 200 && viaDisruption.json.success,
    `disruption analyze failed: ${JSON.stringify(viaDisruption.json)}`,
  );
  console.log("✓ POST /api/disruptions/:id/dependencies/analyze");

  const stored = await api<DepResult>(
    "GET",
    `/api/disruptions/${seeded!.id}/dependencies`,
  );
  assert(stored.status === 200 && stored.json.success, "GET stored deps failed");
  console.log("✓ GET /api/disruptions/:id/dependencies");

  console.log("\nAll Phase 4 smoke checks passed.");
}

main().catch((err) => {
  console.error("\nPhase 4 smoke test FAILED:", err);
  process.exit(1);
});
