import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "teal";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--ink)] text-[#ffffff] hover:bg-[var(--ink-soft)] hover:text-[#ffffff] shadow-[var(--shadow-sm)]",
  teal: "bg-[var(--teal)] text-[#ffffff] hover:bg-[var(--teal-bright)] hover:text-[#ffffff] shadow-[var(--shadow-sm)]",
  secondary:
    "bg-white text-[var(--ink)] border border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-2)]",
  ghost:
    "bg-transparent text-[var(--ink-muted)] hover:bg-white/80 hover:text-[var(--ink)]",
  danger:
    "bg-[var(--bad)] text-[#ffffff] hover:text-[#ffffff] hover:brightness-95",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
