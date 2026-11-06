export type StepItem = {
  id: string;
  label: string;
  description?: string;
  state: "complete" | "current" | "upcoming";
};

export function Stepper({ steps }: { steps: StepItem[] }) {
  return (
    <ol className="grid gap-3 md:grid-cols-4">
      {steps.map((step, index) => {
        const complete = step.state === "complete";
        const current = step.state === "current";
        return (
          <li
            key={step.id}
            className={`relative rounded-2xl border px-4 py-3 transition ${
              current
                ? "border-[var(--teal)] bg-[var(--teal-soft)] shadow-[var(--shadow-sm)]"
                : complete
                  ? "border-[var(--good-line)] bg-[var(--good-soft)]"
                  : "border-[var(--line)] bg-white/70"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  current
                    ? "bg-[var(--teal)] text-white"
                    : complete
                      ? "bg-[var(--good)] text-white"
                      : "bg-[var(--paper-2)] text-[var(--ink-muted)]"
                }`}
              >
                {complete ? "✓" : index + 1}
              </span>
              <p className="text-sm font-semibold text-[var(--ink)]">{step.label}</p>
            </div>
            {step.description ? (
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                {step.description}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
