"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { api, ClientApiError } from "@/lib/client-api";
import type { Disruption } from "@/lib/types";

export function NewDisruptionForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const disruption = await api<Disruption>(
        `/api/projects/${projectId}/disruptions`,
        {
          method: "POST",
          body: { title, description },
        },
      );
      startTransition(() => {
        router.push(`/projects/${projectId}/disruptions/${disruption.id}`);
      });
    } catch (err) {
      setError(
        err instanceof ClientApiError
          ? err.message
          : "Failed to create disruption",
      );
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
            Report disruption
          </h1>
          <p className="mt-1 text-[var(--ink-muted)]">
            Capture the incident, then continue into analysis and recovery.
          </p>
        </div>
        <ButtonLink href={`/projects/${projectId}`} variant="secondary">
          Cancel
        </ButtonLink>
      </div>

      <Card>
        <CardHeader
          title="Disruption details"
          description="POST /api/projects/:id/disruptions"
        />
        <CardBody>
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm">
              <span className="font-medium">Title</span>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Venue cancellation"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Description</span>
              <textarea
                className="mt-1 min-h-36 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="What happened, who is affected, and what evidence you have…"
              />
            </label>
            {error ? (
              <p className="rounded-xl border border-[var(--bad-line)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending}>
              Create disruption
            </Button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
