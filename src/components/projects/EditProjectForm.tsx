"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { api, ClientApiError } from "@/lib/client-api";
import { toCentavos, toPesos } from "@/lib/money";

type Props = {
  project: {
    id: string;
    name: string;
    description: string | null;
    eventDate: string | Date;
    location: string;
    budget: number;
    expectedAttendees: number;
    status: string;
  };
};

function toLocalInputValue(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EditProjectForm({ project }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await api(`/api/projects/${project.id}`, {
          method: "PATCH",
          body: {
            name: String(formData.get("name") ?? "").trim(),
            description: String(formData.get("description") ?? "").trim() || null,
            eventDate: String(formData.get("eventDate")),
            location: String(formData.get("location") ?? "").trim(),
            budget: toCentavos(Number(formData.get("budgetPesos"))),
            expectedAttendees: Number(formData.get("expectedAttendees")),
            status: String(formData.get("status")),
          },
        });
        setMessage("Project updated.");
        router.push(`/projects/${project.id}`);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof ClientApiError ? err.message : "Failed to update project",
        );
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Name</span>
          <input
            name="name"
            required
            defaultValue={project.name}
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Description</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={project.description ?? ""}
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Event date</span>
          <input
            type="datetime-local"
            name="eventDate"
            required
            defaultValue={toLocalInputValue(project.eventDate)}
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Location</span>
          <input
            name="location"
            required
            defaultValue={project.location}
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Budget (₱)</span>
          <input
            type="number"
            name="budgetPesos"
            min={0}
            step="0.01"
            required
            defaultValue={toPesos(project.budget)}
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Expected attendees</span>
          <input
            type="number"
            name="expectedAttendees"
            min={1}
            required
            defaultValue={project.expectedAttendees}
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Status</span>
          <select
            name="status"
            defaultValue={project.status}
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
          >
            {["DRAFT", "ACTIVE", "DISRUPTED", "RECOVERING", "COMPLETED"].map(
              (status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      {error ? (
        <p className="rounded-xl border border-[var(--bad-line)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-[var(--good)]">{message}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => router.push(`/projects/${project.id}`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
