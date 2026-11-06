import { Suspense } from "react";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { NewDisruptionForm } from "@/components/disruptions/NewDisruptionForm";

export const instant = false;

type Props = { params: Promise<{ id: string }> };

export default async function NewDisruptionPage({ params }: Props) {
  await connection();
  const { id } = await params;

  return (
    <AppShell>
      <Suspense fallback={<p className="text-sm text-[var(--ink-muted)]">Loading form…</p>}>
        <NewDisruptionForm projectId={id} />
      </Suspense>
    </AppShell>
  );
}
