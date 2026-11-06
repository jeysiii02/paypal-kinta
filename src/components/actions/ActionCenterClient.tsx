"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api, ClientApiError } from "@/lib/client-api";
import { formatPhp } from "@/lib/money";
import {
  actionStatusTone,
  labelize,
  type Tone,
} from "@/lib/status";
import type { RecoveryActionStatus } from "@/lib/types";
type ActionRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status:
    | "DRAFT"
    | "NEEDS_CONFIRMATION"
    | "AWAITING_APPROVAL"
    | "APPROVED"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED"
    | "REJECTED";
  amount: number | null;
  requiresPaypal: boolean;
};

export function ActionCenterClient({ actions }: { actions: ActionRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function run(id: string, path: string, body?: unknown) {
    setError(null);
    startTransition(async () => {
      try {
        await api(`/api/recovery-actions/${id}/${path}`, {
          method: "POST",
          body,
        });
        setConfirmId(null);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof ClientApiError ? err.message : "Action failed",
        );
      }
    });
  }

  if (actions.length === 0) {
    return (
      <p className="text-sm text-[var(--ink-muted)]">
        No recovery actions yet. Generate plans from a disruption, then create
        or seed actions.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl border border-[var(--bad-line)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">
          {error}
        </p>
      ) : null}
      {actions.map((action) => (
        <div
          key={action.id}
          className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-[var(--ink)]">{action.title}</h3>
                <Badge
                  tone={
                    actionStatusTone(
                      action.status as RecoveryActionStatus,
                    ) as Tone
                  }
                >
                  {labelize(action.status)}
                </Badge>
                {action.requiresPaypal ? (
                  <Badge tone="accent">PayPal</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                {labelize(action.type)}
                {action.description ? ` · ${action.description}` : ""}
              </p>
              {action.amount != null ? (
                <p className="mt-1 text-sm font-medium">
                  {formatPhp(action.amount)}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {action.status !== "APPROVED" &&
              action.status !== "COMPLETED" &&
              action.status !== "REJECTED" ? (
                <>
                  {confirmId === action.id ? (
                    <>
                      <Button
                        disabled={pending}
                        onClick={() => run(action.id, "approve")}
                      >
                        Confirm approve
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={pending}
                        onClick={() => setConfirmId(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      disabled={pending}
                      onClick={() =>
                        action.amount != null || action.requiresPaypal
                          ? setConfirmId(action.id)
                          : run(action.id, "approve")
                      }
                    >
                      Approve
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    disabled={pending}
                    onClick={() =>
                      run(action.id, "reject", {
                        reason: "Rejected from Action Center",
                      })
                    }
                  >
                    Reject
                  </Button>
                </>
              ) : null}
              {action.status === "APPROVED" ? (
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => run(action.id, "complete")}
                >
                  Mark completed
                </Button>
              ) : null}
            </div>
          </div>
          {(action.amount != null || action.requiresPaypal) &&
          confirmId === action.id ? (
            <p className="mt-3 rounded-xl bg-[var(--warn-soft)] px-3 py-2 text-sm text-[var(--warn)]">
              Financial / PayPal-related action — confirm explicitly before
              approval. PayPal execution stays on the Transactions / disruption
              workbench routes.
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
