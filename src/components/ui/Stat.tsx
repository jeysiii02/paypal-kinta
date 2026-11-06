export function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "teal" | "amber" | "ink" | "signal";
}) {
  const bar =
    accent === "amber"
      ? "from-[var(--amber)]/80"
      : accent === "signal"
        ? "from-[var(--signal)]/80"
        : accent === "ink"
          ? "from-[var(--ink)]/70"
          : "from-[var(--teal)]/80";

  return (
    <div className="kinta-rise relative overflow-hidden rounded-2xl border border-[var(--line)] bg-white/85 px-4 py-4 shadow-[var(--shadow-sm)] backdrop-blur-sm">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${bar} to-transparent`}
      />
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--ink-muted)]">{hint}</p> : null}
    </div>
  );
}
