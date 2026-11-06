import { toneClass, type Tone } from "@/lib/status";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${toneClass(tone)}`}
    >
      {children}
    </span>
  );
}
