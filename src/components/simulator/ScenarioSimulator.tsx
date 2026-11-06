"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { api, ClientApiError } from "@/lib/client-api";
import { formatPhp, toCentavos, toPesos } from "@/lib/money";
import { labelize, strategyLabel } from "@/lib/status";
import type { RecoveryStrategy, ScenarioFinancials } from "@/lib/types";

type SimScenario = {
  id: string;
  strategy: RecoveryStrategy;
  assumptions?: {
    estimatedAdditionalCosts?: number;
    estimatedRecoverableExpenses?: number;
    estimatedNonrecoverableExpenses?: number;
    potentialCustomerRefunds?: number;
  };
  financials?: ScenarioFinancials | null;
};

type Props = {
  scenarios: SimScenario[];
};

function field(
  financials: ScenarioFinancials | null | undefined,
  key: keyof ScenarioFinancials,
) {
  const value = financials?.[key];
  if (!value || typeof value !== "object" || !("amountCentavos" in value)) {
    return null;
  }
  return value as {
    amountCentavos: number;
    classification: string;
    label: string;
  };
}

export function ScenarioSimulator({ scenarios }: Props) {
  const [selectedId, setSelectedId] = useState(scenarios[0]?.id ?? "");
  const selected = useMemo(
    () => scenarios.find((s) => s.id === selectedId) ?? scenarios[0],
    [scenarios, selectedId],
  );
  const [financials, setFinancials] = useState<ScenarioFinancials | null>(
    selected?.financials ?? null,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const assumptions = (selected?.assumptions ?? {}) as {
    estimatedAdditionalCosts?: number;
    estimatedRecoverableExpenses?: number;
    estimatedNonrecoverableExpenses?: number;
    potentialCustomerRefunds?: number;
  };

  function onSelect(id: string) {
    setSelectedId(id);
    const next = scenarios.find((s) => s.id === id);
    setFinancials(next?.financials ?? null);
    setError(null);
    setMessage(null);
  }

  function onRecalculate(formData: FormData) {
    if (!selected) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const updated = await api<{
          financials: ScenarioFinancials;
        }>(`/api/scenarios/${selected.id}/calculate`, {
          method: "POST",
          body: {
            estimatedAdditionalCosts: toCentavos(
              Number(formData.get("additionalPesos") || 0),
            ),
            estimatedRecoverableExpenses: toCentavos(
              Number(formData.get("recoverablePesos") || 0),
            ),
            estimatedNonrecoverableExpenses: toCentavos(
              Number(formData.get("nonrecoverablePesos") || 0),
            ),
            potentialCustomerRefunds: toCentavos(
              Number(formData.get("refundsPesos") || 0),
            ),
            notes: ["Recalculated from Financial Simulator UI"],
          },
        });
        setFinancials(updated.financials);
        setMessage("Recalculated via backend calculateScenarioFinancials()");
      } catch (err) {
        setError(
          err instanceof ClientApiError
            ? err.message
            : "Recalculation failed",
        );
      }
    });
  }

  if (!selected) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-[var(--ink-muted)]">
            No scenarios yet. Generate recovery plans from a disruption first.
          </p>
        </CardBody>
      </Card>
    );
  }

  const rows: Array<keyof ScenarioFinancials> = [
    "originalProjectBudget",
    "totalRecordedCommitments",
    "paymentsAlreadyMade",
    "customerPaymentsCollected",
    "estimatedAdditionalCosts",
    "estimatedRecoverableExpenses",
    "estimatedNonrecoverableExpenses",
    "potentialCustomerRefunds",
    "remainingBudget",
    "remainingFinancialExposure",
    "netFinancialImpact",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => onSelect(scenario.id)}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              scenario.id === selected.id
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--line)] bg-white text-[var(--ink-muted)] hover:border-[var(--line-strong)]"
            }`}
          >
            {strategyLabel(scenario.strategy)}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader
            title="Assumptions"
            description="Values posted to POST /api/scenarios/:id/calculate (centavos on server)"
          />
          <CardBody>
            <form action={onRecalculate} className="space-y-3">
              {(
                [
                  ["additionalPesos", "Additional costs (₱)", assumptions.estimatedAdditionalCosts],
                  ["recoverablePesos", "Recoverable (₱)", assumptions.estimatedRecoverableExpenses],
                  ["nonrecoverablePesos", "Nonrecoverable (₱)", assumptions.estimatedNonrecoverableExpenses],
                  ["refundsPesos", "Customer refunds (₱)", assumptions.potentialCustomerRefunds],
                ] as const
              ).map(([name, label, cents]) => (
                <label key={name} className="block text-sm">
                  <span className="mb-1 block font-medium">{label}</span>
                  <input
                    name={name}
                    type="number"
                    step="0.01"
                    min={0}
                    defaultValue={toPesos(cents ?? 0)}
                    className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5"
                  />
                </label>
              ))}
              <Button type="submit" disabled={pending}>
                {pending ? "Calculating…" : "Recalculate"}
              </Button>
            </form>
            {error ? (
              <p className="mt-3 text-sm text-[var(--bad)]">{error}</p>
            ) : null}
            {message ? (
              <p className="mt-3 text-sm text-[var(--good)]">{message}</p>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={`${strategyLabel(selected.strategy)} financials`}
            description="Classifications come from the deterministic backend engine"
          />
          <CardBody className="space-y-2">
            {rows.map((key) => {
              const item = field(financials, key);
              if (!item) return null;
              return (
                <div
                  key={key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--ink)]">
                      {item.label}
                    </p>
                    <Badge tone="neutral">{labelize(item.classification)}</Badge>
                  </div>
                  <p className="font-semibold">{formatPhp(item.amountCentavos)}</p>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
