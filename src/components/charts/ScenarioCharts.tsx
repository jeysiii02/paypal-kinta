"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPhp } from "@/lib/money";
import { strategyLabel } from "@/lib/status";
import type { Scenario, ScenarioFinancials } from "@/lib/types";
import { parseJsonField } from "@/lib/types";

function amount(
  financials: ScenarioFinancials | null,
  key:
    | "netFinancialImpact"
    | "remainingBudget"
    | "remainingFinancialExposure"
    | "estimatedAdditionalCosts",
) {
  return financials?.[key]?.amountCentavos ?? 0;
}

export function ScenarioCharts({
  scenarios,
  selectedId,
}: {
  scenarios: Scenario[];
  selectedId?: string | null;
}) {
  const data = scenarios.map((scenario) => {
    const financials = parseJsonField<ScenarioFinancials | null>(
      scenario.financialsJson,
      scenario.financials ?? null,
    );
    return {
      id: scenario.id,
      name: strategyLabel(scenario.strategy),
      netImpact: amount(financials, "netFinancialImpact") / 100,
      remaining: amount(financials, "remainingBudget") / 100,
      exposure: amount(financials, "remainingFinancialExposure") / 100,
      extras: amount(financials, "estimatedAdditionalCosts") / 100,
      selected: scenario.id === selectedId,
    };
  });

  return (
    <div className="h-[320px] rounded-2xl border border-[var(--line)] bg-white p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d5dee8" />
          <XAxis dataKey="name" tick={{ fill: "#5b6f82", fontSize: 12 }} />
          <YAxis
            tick={{ fill: "#5b6f82", fontSize: 12 }}
            tickFormatter={(value) => `₱${Number(value).toLocaleString("en-PH")}`}
          />
          <Tooltip
            formatter={(value) => formatPhp(Math.round(Number(value) * 100))}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #d5dee8",
              boxShadow: "0 8px 24px rgba(11,31,51,0.06)",
            }}
          />
          <Legend />
          <Bar dataKey="netImpact" name="Net impact" fill="#0f766e" radius={[8, 8, 0, 0]} />
          <Bar dataKey="exposure" name="Exposure" fill="#c47a12" radius={[8, 8, 0, 0]} />
          <Bar dataKey="remaining" name="Remaining" fill="#1d4f91" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
