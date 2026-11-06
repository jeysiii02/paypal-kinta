import { getDemoContext } from "@/lib/demo";
import { MobileTopBar, SidebarNav } from "@/components/layout/SidebarNav";

export async function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  /** Optional mobile subtitle */
  title?: string;
  /** Kept for backward compatibility with older pages */
  projectName?: string;
  projectId?: string;
}) {
  const { user, project } = await getDemoContext();

  return (
    <div className="min-h-screen bg-[var(--paper)] lg:flex">
      <SidebarNav
        context={{
          projectId: project?.id ?? null,
          projectName: project?.name ?? null,
          userName: user.name,
          userEmail: user.email,
        }}
      />
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <MobileTopBar title={title} />
          {children}
        </main>
      </div>
    </div>
  );
}
