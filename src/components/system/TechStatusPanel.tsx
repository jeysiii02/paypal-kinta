import { connection } from "next/server";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { getAiTechStatus } from "@/services/ai/status";
import { getPayPalTechStatus } from "@/services/paypal/client";

export async function TechStatusPanel() {
  await connection();
  const ai = getAiTechStatus();
  const paypal = getPayPalTechStatus();

  return (
    <Card>
      <CardHeader
        title="PayPal + AI wiring"
        description="Technological implementation checklist for judges"
      />
      <CardBody className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">AI</h3>
            <Badge tone={ai.ready ? "good" : "bad"}>
              {ai.ready ? "Ready" : "Needs key"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Provider <span className="font-medium text-[var(--ink)]">{ai.provider}</span>
            {" · "}
            Model <span className="font-medium text-[var(--ink)]">{ai.model}</span>
          </p>
          <ul className="mt-3 space-y-1 text-sm text-[var(--ink)]">
            {ai.capabilities.slice(0, 3).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--ink-muted)]">
            AI never owns final money math or legal entitlement.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">PayPal</h3>
            <Badge tone={paypal.mode === "live" ? "good" : "warn"}>
              {paypal.mode === "live" ? "Sandbox live" : "Mock demo"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Currency <span className="font-medium text-[var(--ink)]">{paypal.currency}</span>
            {" · "}
            SDK {paypal.sdkReady ? "enabled" : "mock fallback"}
          </p>
          <ul className="mt-3 space-y-1 text-sm text-[var(--ink)]">
            {paypal.apis.slice(0, 4).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--ink-muted)]">
            Set PAYPAL_CLIENT_ID + SECRET and PAYPAL_MOCK=false for real Sandbox Buttons.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
