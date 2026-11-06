"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { api, ClientApiError } from "@/lib/client-api";
import { toCentavos } from "@/lib/money";

export function CreateProjectForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        const budgetPesos = Number(formData.get("budgetPesos"));
        const project = await api<{ id: string }>("/api/projects", {
          method: "POST",
          body: {
            userId,
            name: String(formData.get("name") ?? "").trim(),
            description: String(formData.get("description") ?? "").trim() || null,
            eventDate: String(formData.get("eventDate")),
            location: String(formData.get("location") ?? "").trim(),
            budget: toCentavos(budgetPesos),
            expectedAttendees: Number(formData.get("expectedAttendees")),
            status: "DRAFT",
          },
        });
        router.push(`/projects/${project.id}`);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof ClientApiError
            ? err.message
            : "Failed to create project",
        );
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-[var(--ink)]">Name</span>
          <input
            name="name"
            required
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
            placeholder="University Tech Summit"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-[var(--ink)]">
            Description
          </span>
          <textarea
            name="description"
            rows={3}
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--ink)]">
            Event date
          </span>
          <input
            type="datetime-local"
            name="eventDate"
            required
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--ink)]">
            Location
          </span>
          <input
            name="location"
            required
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
            placeholder="Quezon City"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--ink)]">
            Budget (₱)
          </span>
          <input
            type="number"
            name="budgetPesos"
            min={0}
            step="0.01"
            required
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
            placeholder="60000"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--ink)]">
            Expected attendees
          </span>
          <input
            type="number"
            name="expectedAttendees"
            min={1}
            required
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
            placeholder="100"
          />
        </label>
      </div>
      {error ? (
        <p className="rounded-xl border border-[var(--bad-line)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create project"}
      </Button>
    </form>
  );
}
