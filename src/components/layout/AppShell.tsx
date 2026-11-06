import { MobileTopBar, SidebarNav } from "@/components/layout/SidebarNav";
import { getWorkspaceContext } from "@/lib/workspace";

export async function AppShell({
  children,
  title,
  projectId,
  projectName,
}: {
  children: React.ReactNode;
  title?: string;
  /** Prefer this project as active (current project detail route). */
  projectId?: string;
  projectName?: string;
}) {
  const { user, projects, project } = await getWorkspaceContext(projectId);

  // Prefer the resolved workspace project so a stale prop cannot desync the switcher.
  const activeId = project?.id ?? projectId ?? null;
  const activeName =
    project?.name ??
    projectName ??
    (activeId
      ? (projects.find((item) => item.id === activeId)?.name ?? null)
      : null);

  return (
    <div className="min-h-screen bg-[var(--paper)] lg:flex">
      <SidebarNav
        context={{
          projectId: activeId,
          projectName: activeName,
          userName: user.name,
          userEmail: user.email,
          projects: projects.map((item) => ({
            id: item.id,
            name: item.name,
            status: item.status,
          })),
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
