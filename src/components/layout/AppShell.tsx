import Link from "next/link";

export function AppShell({
  children,
  projectName,
  projectId,
}: {
  children: React.ReactNode;
  projectName?: string;
  projectId?: string;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--line)]/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="group flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ink)] text-sm font-bold tracking-tight text-white shadow-[var(--shadow-sm)] transition group-hover:bg-[var(--teal)]">
                K
              </span>
              <span className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--ink)]">
                KINTA
              </span>
            </Link>
            {projectName && projectId ? (
              <nav className="hidden items-center gap-1 text-sm text-[var(--ink-muted)] md:flex">
                <Link href="/dashboard" className="rounded-lg px-2 py-1 hover:bg-[var(--paper-2)]">
                  Dashboard
                </Link>
                <span>/</span>
                <Link
                  href={`/projects/${projectId}`}
                  className="rounded-lg px-2 py-1 font-medium text-[var(--ink)] hover:bg-[var(--paper-2)]"
                >
                  {projectName}
                </Link>
              </nav>
            ) : null}
          </div>
          <p className="hidden text-xs font-medium uppercase tracking-[0.16em] text-[var(--ink-muted)] sm:block">
            Impact & Recovery Intelligence
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
