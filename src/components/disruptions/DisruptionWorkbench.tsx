"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ScenarioCharts } from "@/components/charts/ScenarioCharts";
import { api, ClientApiError } from "@/lib/client-api";
import { formatPhp, toCentavos } from "@/lib/money";
import {
  actionStatusTone,
  impactTone,
  labelize,
  strategyLabel,
} from "@/lib/status";
import type {
  EventAnalysis,
  RecoveryAction,
  RecoveryPlan,
  Scenario,
  ScenarioFinancials,
} from "@/lib/types";
import { asStringArray, parseJsonField } from "@/lib/types";

type DependencyImpactItem = {
  commitmentId: string;
  title?: string;
  classification:
    | "DIRECTLY_AFFECTED"
    | "INDIRECTLY_AFFECTED"
    | "UNCERTAIN"
    | "UNAFFECTED";
  explanation: string;
  assumedCancelled: boolean;
};

type DependencyAnalysisResult = {
  directlyAffected?: DependencyImpactItem[];
  indirectlyAffected?: DependencyImpactItem[];
  uncertain?: DependencyImpactItem[];
  unaffected?: DependencyImpactItem[];
  impacts?: DependencyImpactItem[];
  items?: DependencyImpactItem[];
};

function flattenDependencies(
  result: DependencyAnalysisResult | DependencyImpactItem[] | null | undefined,
): DependencyImpactItem[] {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (result.impacts) return result.impacts;
  if (result.items) return result.items;
  return [
    ...(result.directlyAffected ?? []),
    ...(result.indirectlyAffected ?? []),
    ...(result.uncertain ?? []),
    ...(result.unaffected ?? []),
  ];
}

type Props = {
  projectId: string;
  disruptionId: string;
  initialAnalysis: EventAnalysis | null;
  initialDependencies: DependencyImpactItem[];
  initialPlans: RecoveryPlan[];
  initialActions: RecoveryAction[];
  commitmentTitles: Record<string, string>;
};

function moneyField(
  financials: ScenarioFinancials | null | undefined,
  key: keyof ScenarioFinancials,
) {
  const value = financials?.[key];
  if (!value || typeof value !== "object" || !("amountCentavos" in value)) {
    return 0;
  }
  return (value as { amountCentavos: number }).amountCentavos;
}

export function DisruptionWorkbench({
  projectId,
  disruptionId,
  initialAnalysis,
  initialDependencies,
  initialPlans,
  initialActions,
  commitmentTitles,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [dependencies, setDependencies] = useState(initialDependencies);
  const [plans, setPlans] = useState(initialPlans);
  const [actions, setActions] = useState(initialActions);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    initialPlans[0]?.scenarios?.[0]?.id ?? null,
  );
  const [assumptions, setAssumptions] = useState({
    estimatedAdditionalCosts: "",
    estimatedRecoverableExpenses: "",
    estimatedNonrecoverableExpenses: "",
    potentialCustomerRefunds: "",
  });

  const latestPlan = plans[0];
  const scenarios = useMemo(() => latestPlan?.scenarios ?? [], [latestPlan]);
  const selectedScenario =
    scenarios.find((s) => s.id === selectedScenarioId) ?? scenarios[0] ?? null;

  async function run(label: string, fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
      startTransition(() => router.refresh());
    } catch (err) {
      const message =
        err instanceof ClientApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : `Failed: ${label}`;
      setError(message);
    }
  }

  async function analyze() {
    await run("analyze", async () => {
      const result = await api<{ analysis: EventAnalysis }>(
        `/api/disruptions/${disruptionId}/analyze`,
        { method: "POST", body: {} },
      );
      setAnalysis(result.analysis);
    });
  }

  async function analyzeDependencies() {
    await run("dependencies", async () => {
      const result = await api<DependencyAnalysisResult>(
        `/api/disruptions/${disruptionId}/dependencies/analyze`,
        { method: "POST", body: {} },
      );
      setDependencies(flattenDependencies(result));
    });
  }

  async function generatePlans() {
    await run("recovery plans", async () => {
      const plan = await api<RecoveryPlan & { scenarios: Scenario[] }>(
        `/api/disruptions/${disruptionId}/recovery-plans`,
        { method: "POST", body: {} },
      );
      setPlans([plan, ...plans]);
      setSelectedScenarioId(plan.scenarios?.[0]?.id ?? null);
    });
  }

  async function recalculate() {
    if (!selectedScenario) return;
    await run("calculate", async () => {
      const body: Record<string, number | string[]> = {};
      for (const [key, raw] of Object.entries(assumptions)) {
        if (!raw.trim()) continue;
        body[key] = toCentavos(Number(raw));
      }
      const updated = await api<Scenario & { financials: ScenarioFinancials }>(
        `/api/scenarios/${selectedScenario.id}/calculate`,
        { method: "POST", body },
      );
      setPlans((current) =>
        current.map((plan) => ({
          ...plan,
          scenarios: (plan.scenarios ?? []).map((scenario) =>
            scenario.id === updated.id
              ? {
                  ...scenario,
                  ...updated,
                  financialsJson: JSON.stringify(updated.financials),
                  financials: updated.financials,
                }
              : scenario,
          ),
        })),
      );
    });
  }

  async function createRefundAction() {
    if (!selectedScenario) return;
    await run("create action", async () => {
      const action = await api<RecoveryAction>(
        `/api/projects/${projectId}/recovery-actions`,
        {
          method: "POST",
          body: {
            scenarioId: selectedScenario.id,
            type: "CUSTOMER_REFUND",
            title: `Customer refund — ${strategyLabel(selectedScenario.strategy)}`,
            description:
              "Demo recovery action that requires PayPal Sandbox refund after approval.",
            amount: moneyField(
              parseJsonField<ScenarioFinancials | null>(
                selectedScenario.financialsJson,
                selectedScenario.financials ?? null,
              ),
              "potentialCustomerRefunds",
            ) || 50000,
            requiresPaypal: true,
            status: "AWAITING_APPROVAL",
          },
        },
      );
      setActions((current) => [action, ...current]);
    });
  }

  async function approveAction(actionId: string) {
    await run("approve", async () => {
      const action = await api<RecoveryAction>(
        `/api/recovery-actions/${actionId}/approve`,
        { method: "POST", body: {} },
      );
      setActions((current) =>
        current.map((item) => (item.id === actionId ? action : item)),
      );
    });
  }

  async function executePaypalRefund(actionId: string) {
    await run("paypal refund", async () => {
      const result = await api<{ action: RecoveryAction }>(
        `/api/paypal/recovery-actions/${actionId}/execute`,
        { method: "POST", body: {} },
      );
      setActions((current) =>
        current.map((item) => (item.id === actionId ? result.action : item)),
      );
    });
  }

  const selectedFinancials =
    parseJsonField<ScenarioFinancials | null>(
      selectedScenario?.financialsJson,
      selectedScenario?.financials ?? null,
    ) ?? null;

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-[var(--bad-line)] bg-[var(--bad-soft)] px-4 py-3 text-sm text-[var(--bad)]">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader
          title="1. AI event analysis"
          description="POST /api/disruptions/:id/analyze — never invents legal entitlement"
          action={
            <Button onClick={analyze} disabled={pending}>
              {analysis ? "Re-run analysis" : "Analyze disruption"}
            </Button>
          }
        />
        <CardBody>
          {!analysis ? (
            <p className="text-sm text-[var(--ink-muted)]">
              No analysis yet. Run heuristic or Gemini analysis to continue.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone="info">{analysis.incidentType}</Badge>
                <Badge tone="accent">{analysis.confidenceLevel} confidence</Badge>
              </div>
              <p className="text-[var(--ink)]">{analysis.incidentSummary}</p>
              <div className="grid gap-3 md:grid-cols-3">
                <InfoList
                  title="Affected commitments"
                  items={asStringArray(analysis.affectedCommitmentIds).map(
                    (id) => commitmentTitles[id] ?? id,
                  )}
                />
                <InfoList
                  title="Missing information"
                  items={asStringArray(analysis.missingInformation)}
                />
                <InfoList
                  title="Assumptions"
                  items={asStringArray(analysis.assumptions)}
                />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="2. Dependency impact"
          description="DIRECT / INDIRECT / UNCERTAIN / UNAFFECTED"
          action={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  (window.location.href = `/projects/${projectId}/map?disruptionId=${disruptionId}`)
                }
              >
                Open map
              </Button>
              <Button onClick={analyzeDependencies} disabled={pending || !analysis}>
                Analyze dependencies
              </Button>
            </div>
          }
        />
        <CardBody className="space-y-3">
          {dependencies.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">
              Run dependency analysis after event analysis.
            </p>
          ) : (
            dependencies.map((item) => (
              <div
                key={item.commitmentId}
                className="rounded-xl border border-[var(--line)] px-3 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {commitmentTitles[item.commitmentId] ?? item.commitmentId}
                  </p>
                  <Badge tone={impactTone(item.classification)}>
                    {labelize(item.classification)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{item.explanation}</p>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="3. Recovery scenarios"
          description="Cancel · Relocate · Reschedule with deterministic financials"
          action={
            <Button onClick={generatePlans} disabled={pending || !analysis}>
              Generate plans
            </Button>
          }
        />
        <CardBody className="space-y-5">
          {scenarios.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">
              Generate recovery plans after analysis.
            </p>
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-3">
                {scenarios.map((scenario) => {
                  const financials = parseJsonField<ScenarioFinancials | null>(
                    scenario.financialsJson,
                    scenario.financials ?? null,
                  );
                  const selected = scenario.id === selectedScenario?.id;
                  return (
                    <button
                      key={scenario.id}
                      type="button"
                      onClick={() => setSelectedScenarioId(scenario.id)}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        selected
                          ? "border-[var(--teal)] bg-[var(--teal-soft)] shadow-[var(--shadow-sm)]"
                          : "border-[var(--line)] bg-white hover:border-[var(--teal-line)]"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                        {strategyLabel(scenario.strategy)}
                      </p>
                      <p className="mt-2 text-sm text-[var(--ink)]">{scenario.summary}</p>
                      <p className="mt-3 font-[family-name:var(--font-display)] text-xl">
                        {formatPhp(moneyField(financials, "netFinancialImpact"))}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">Net financial impact</p>
                    </button>
                  );
                })}
              </div>

              {selectedScenario ? (
                <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                    <p className="text-sm font-semibold">Adjust assumptions (₱)</p>
                    {(
                      [
                        ["estimatedAdditionalCosts", "Additional costs"],
                        ["estimatedRecoverableExpenses", "Recoverable expenses"],
                        ["estimatedNonrecoverableExpenses", "Nonrecoverable"],
                        ["potentialCustomerRefunds", "Customer refunds"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="block text-sm">
                        <span className="text-[var(--ink-muted)]">{label}</span>
                        <input
                          className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                          inputMode="decimal"
                          value={assumptions[key]}
                          onChange={(e) =>
                            setAssumptions((current) => ({
                              ...current,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder="e.g. 2500"
                        />
                      </label>
                    ))}
                    <Button onClick={recalculate} disabled={pending}>
                      Recalculate
                    </Button>
                  </div>
                  <ScenarioCharts
                    scenarios={scenarios}
                    selectedId={selectedScenario.id}
                  />
                </div>
              ) : null}

              {selectedFinancials ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(
                    [
                      ["remainingBudget", "Remaining budget"],
                      ["remainingFinancialExposure", "Exposure"],
                      ["estimatedRecoverableExpenses", "Recoverable"],
                      ["potentialCustomerRefunds", "Refunds out"],
                    ] as const
                  ).map(([key, label]) => (
                    <div
                      key={key}
                      className="rounded-xl border border-[var(--line)] bg-white px-3 py-3"
                    >
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                        {label}
                      </p>
                      <p className="mt-1 font-semibold">
                        {formatPhp(moneyField(selectedFinancials, key))}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="4. Recovery actions + PayPal"
          description="Approve first; PayPal executes only when requiresPaypal is true"
          action={
            <Button
              onClick={createRefundAction}
              disabled={pending || !selectedScenario}
              variant="secondary"
            >
              Create customer refund action
            </Button>
          }
        />
        <CardBody className="space-y-3">
          {actions.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">
              No recovery actions yet.
            </p>
          ) : (
            actions.map((action) => (
              <div
                key={action.id}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{action.title}</p>
                    <Badge tone={actionStatusTone(action.status)}>
                      {labelize(action.status)}
                    </Badge>
                    {action.requiresPaypal ? <Badge tone="accent">PayPal</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    {labelize(action.type)}
                    {action.amount != null ? ` · ${formatPhp(action.amount)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {action.status === "AWAITING_APPROVAL" ||
                  action.status === "DRAFT" ||
                  action.status === "NEEDS_CONFIRMATION" ? (
                    <Button onClick={() => approveAction(action.id)} disabled={pending}>
                      Approve
                    </Button>
                  ) : null}
                  {action.requiresPaypal &&
                  action.status === "APPROVED" &&
                  action.type === "CUSTOMER_REFUND" ? (
                    <Button
                      onClick={() => executePaypalRefund(action.id)}
                      disabled={pending}
                    >
                      Execute PayPal refund
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
        {title}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-[var(--ink)]">
        {items.length === 0 ? (
          <li className="text-[var(--ink-muted)]">None</li>
        ) : (
          items.map((item) => <li key={item}>• {item}</li>)
        )}
      </ul>
    </div>
  );
}
