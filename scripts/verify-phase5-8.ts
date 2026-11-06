/**
 * End-to-end smoke for Phases 5–8 core APIs.
 * Usage: npx tsx scripts/verify-phase5-8.ts [baseUrl]
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
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as ApiResult<T>;
  return { status: res.status, json };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`Phase 5–8 smoke test → ${BASE}\n`);

  const projects = await api<Array<{ id: string; name: string }>>(
    "GET",
    "/api/projects",
  );
  assert(projects.json.success, "projects");
  const summit = projects.json.success
    ? projects.json.data.find((p) => p.name === "University Tech Summit")
    : undefined;
  assert(!!summit, "seed project");

  const disruptions = await api<Array<{ id: string; title: string }>>(
    "GET",
    `/api/projects/${summit!.id}/disruptions`,
  );
  const seeded = disruptions.json.success
    ? disruptions.json.data.find((d) =>
        d.title.toLowerCase().includes("venue alpha"),
      )
    : undefined;
  assert(!!seeded, "seeded disruption");

  // Ensure analysis + deps
  await api("POST", `/api/disruptions/${seeded!.id}/analyze`);
  await api("POST", `/api/disruptions/${seeded!.id}/dependencies/analyze`, {});

  // Phase 5 — recovery plans
  const planRes = await api<{
    id: string;
    plans: { strategies: Array<{ strategy: string }>; generationMethod: string };
    scenarios: Array<{
      id: string;
      strategy: string;
      financials: { netFinancialImpact: { amountCentavos: number } } | null;
    }>;
  }>("POST", `/api/disruptions/${seeded!.id}/recovery-plans`, {
    userAssumptions: ["Prefer keeping December date if a nearby venue exists"],
  });
  assert(
    planRes.status === 201 && planRes.json.success,
    `recovery plans failed: ${JSON.stringify(planRes.json)}`,
  );

  let cancelScenarioId = "";
  if (planRes.json.success) {
    const strategies = planRes.json.data.plans.strategies.map((s) => s.strategy);
    assert(
      strategies.includes("CANCEL") &&
        strategies.includes("RELOCATE") &&
        strategies.includes("RESCHEDULE"),
      "need 3 strategies",
    );
    assert(planRes.json.data.scenarios.length === 3, "3 scenarios persisted");
    cancelScenarioId =
      planRes.json.data.scenarios.find((s) => s.strategy === "CANCEL")?.id ??
      "";
    assert(!!cancelScenarioId, "CANCEL scenario id");
    console.log(
      `✓ Phase 5 recovery plans (${planRes.json.data.plans.generationMethod})`,
    );
  }

  // Phase 6 — recalculate
  const calc = await api<{
    financials: {
      remainingBudget: { amountCentavos: number };
      estimatedAdditionalCosts: { classification: string };
    };
  }>("POST", `/api/scenarios/${cancelScenarioId}/calculate`, {
    estimatedAdditionalCosts: 100000,
    estimatedRecoverableExpenses: 500000,
    estimatedNonrecoverableExpenses: 250000,
    potentialCustomerRefunds: 0,
    notes: ["Smoke-test assumption patch"],
  });
  assert(
    calc.status === 200 && calc.json.success,
    `calculate failed: ${JSON.stringify(calc.json)}`,
  );
  console.log("✓ Phase 6 scenario calculate");

  // Phase 7 — recovery actions
  const action = await api<{ id: string; status: string }>(
    "POST",
    `/api/projects/${summit!.id}/recovery-actions`,
    {
      scenarioId: cancelScenarioId,
      type: "REQUEST_REFUND",
      title: "Request venue deposit disposition",
      description: "Application-level approval only; no PayPal call",
      amount: 500000,
      requiresPaypal: false,
      status: "AWAITING_APPROVAL",
    },
  );
  assert(action.status === 201 && action.json.success, "create action failed");
  const actionId = action.json.success ? action.json.data.id : "";

  const approved = await api<{ status: string }>(
    "POST",
    `/api/recovery-actions/${actionId}/approve`,
  );
  assert(
    approved.status === 200 &&
      approved.json.success &&
      approved.json.data.status === "APPROVED",
    "approve failed",
  );

  const refundAction = await api<{ id: string }>(
    "POST",
    `/api/projects/${summit!.id}/recovery-actions`,
    {
      type: "CUSTOMER_REFUND",
      title: "Customer refund placeholder",
      amount: 50000,
      requiresPaypal: true,
      status: "DRAFT",
    },
  );
  assert(refundAction.json.success, "refund action create");
  const refundId = refundAction.json.success ? refundAction.json.data.id : "";

  const rejected = await api<{ status: string }>(
    "POST",
    `/api/recovery-actions/${refundId}/reject`,
    { reason: "No PayPal capture exists yet (Developer 2)" },
  );
  assert(
    rejected.json.success && rejected.json.data.status === "REJECTED",
    "reject failed",
  );
  console.log("✓ Phase 7 recovery actions approve/reject");

  const activity = await api<Array<{ action: string }>>(
    "GET",
    `/api/projects/${summit!.id}/activity?limit=50`,
  );
  assert(activity.json.success, "activity");
  const actions = activity.json.success
    ? new Set(activity.json.data.map((a) => a.action))
    : new Set();
  assert(actions.has("RECOVERY_PLAN_GENERATED"), "log recovery plan");
  assert(actions.has("SCENARIO_CALCULATED"), "log scenario calc");
  assert(actions.has("ACTION_APPROVED"), "log approve");
  assert(actions.has("ACTION_REJECTED"), "log reject");
  console.log("✓ activity logging");

  console.log("\nAll Phase 5–8 smoke checks passed.");
}

main().catch((err) => {
  console.error("\nPhase 5–8 smoke FAILED:", err);
  process.exit(1);
});
