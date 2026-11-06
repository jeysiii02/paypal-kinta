/**
 * Smoke-test Phase 2 APIs against a running Next.js server.
 * Usage: npx tsx scripts/verify-phase2.ts [baseUrl]
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

type ApiResult<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

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

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`Phase 2 smoke test → ${BASE}\n`);

  // Users
  const users = await api<Array<{ id: string; email: string }>>("GET", "/api/users");
  assert(users.status === 200 && users.json.success, "GET /api/users failed");
  const userId = users.json.success ? users.json.data[0]?.id : undefined;
  assert(!!userId, "No seeded user found — run prisma db seed");
  console.log("✓ GET /api/users");

  // List projects
  const projects = await api<Array<{ id: string; name: string }>>("GET", "/api/projects");
  assert(projects.status === 200 && projects.json.success, "GET /api/projects failed");
  const summit = projects.json.success
    ? projects.json.data.find((p) => p.name === "University Tech Summit")
    : undefined;
  assert(!!summit, "University Tech Summit not found");
  console.log("✓ GET /api/projects");

  // Project details
  const detail = await api<{ id: string; suppliers: unknown[]; commitments: unknown[] }>(
    "GET",
    `/api/projects/${summit!.id}`,
  );
  assert(detail.status === 200 && detail.json.success, "GET project details failed");
  console.log("✓ GET /api/projects/:id");

  // Create project
  const created = await api<{ id: string; name: string }>("POST", "/api/projects", {
    userId,
    name: "Phase 2 Smoke Test Event",
    description: "Temporary project for API verification",
    eventDate: "2027-01-20T09:00:00+08:00",
    location: "Manila",
    budget: 2500000,
    expectedAttendees: 40,
    status: "DRAFT",
  });
  assert(created.status === 201 && created.json.success, "POST /api/projects failed");
  const projectId = created.json.success ? created.json.data.id : "";
  console.log("✓ POST /api/projects");

  // Update project
  const updated = await api<{ location: string }>("PATCH", `/api/projects/${projectId}`, {
    location: "Makati",
    expectedAttendees: 50,
  });
  assert(
    updated.status === 200 &&
      updated.json.success &&
      updated.json.data.location === "Makati",
    "PATCH /api/projects/:id failed",
  );
  console.log("✓ PATCH /api/projects/:id");

  // Create supplier
  const supplier = await api<{ id: string }>("POST", `/api/projects/${projectId}/suppliers`, {
    name: "AV Echo",
    contactPerson: "Sam Lee",
    email: "av@echo.demo",
    phone: "+63-900-000-0000",
    category: "EQUIPMENT",
    notes: "Smoke test supplier",
  });
  assert(supplier.status === 201 && supplier.json.success, "POST supplier failed");
  const supplierId = supplier.json.success ? supplier.json.data.id : "";
  console.log("✓ POST /api/projects/:id/suppliers");

  // List suppliers
  const suppliers = await api<unknown[]>("GET", `/api/projects/${projectId}/suppliers`);
  assert(suppliers.status === 200 && suppliers.json.success, "GET suppliers failed");
  console.log("✓ GET /api/projects/:id/suppliers");

  // Create commitment
  const commitment = await api<{ id: string }>(
    "POST",
    `/api/projects/${projectId}/commitments`,
    {
      supplierId,
      title: "PA system rental",
      description: "Full day PA",
      agreedAmount: 400000,
      amountPaid: 100000,
      serviceDate: "2027-01-20T08:00:00+08:00",
      cancellationConditions: "50% if cancelled within 7 days",
      refundConditions: "Deposit non-refundable after 14 days",
      status: "CONFIRMED",
    },
  );
  assert(commitment.status === 201 && commitment.json.success, "POST commitment failed");
  const commitmentId = commitment.json.success ? commitment.json.data.id : "";
  console.log("✓ POST /api/projects/:id/commitments");

  // Dependency
  const dep = await api<{ id: string }>(
    "POST",
    `/api/commitments/${commitmentId}/dependencies`,
    {
      dependencyType: "EVENT_DATE",
      description: "Equipment needed on event date",
    },
  );
  assert(dep.status === 201 && dep.json.success, "POST dependency failed");
  console.log("✓ POST /api/commitments/:id/dependencies");

  // Update commitment status
  const statusChange = await api<{ status: string }>(
    "PATCH",
    `/api/commitments/${commitmentId}`,
    { status: "AT_RISK" },
  );
  assert(
    statusChange.status === 200 &&
      statusChange.json.success &&
      statusChange.json.data.status === "AT_RISK",
    "PATCH commitment failed",
  );
  console.log("✓ PATCH /api/commitments/:id");

  // Expense
  const expense = await api<{ id: string; amount: number }>(
    "POST",
    `/api/projects/${projectId}/expenses`,
    {
      description: "Deposit paid to AV Echo",
      amount: 100000,
      category: "SUPPLIER_PAYMENT",
      commitmentId,
    },
  );
  assert(expense.status === 201 && expense.json.success, "POST expense failed");
  console.log("✓ POST /api/projects/:id/expenses");

  // Activity log
  const activity = await api<Array<{ action: string }>>(
    "GET",
    `/api/projects/${projectId}/activity?limit=20`,
  );
  assert(
    activity.status === 200 &&
      activity.json.success &&
      activity.json.data.length >= 4,
    "GET activity failed or incomplete",
  );
  console.log("✓ GET /api/projects/:id/activity");

  // Archive
  const archived = await api<{ status: string }>(
    "POST",
    `/api/projects/${projectId}/archive`,
  );
  assert(
    archived.status === 200 &&
      archived.json.success &&
      archived.json.data.status === "ARCHIVED",
    "POST archive failed",
  );
  console.log("✓ POST /api/projects/:id/archive");

  // Validation error sample
  const bad = await api("POST", "/api/projects", { name: "missing fields" });
  assert(bad.status === 400 && !bad.json.success, "Expected validation error");
  console.log("✓ validation error response shape");

  console.log("\nAll Phase 2 smoke checks passed.");
}

main().catch((err) => {
  console.error("\nPhase 2 smoke test FAILED:", err);
  process.exit(1);
});
