"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Banknote,
  Boxes,
  ClipboardList,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  Menu,
  Radar,
  Settings,
  ShieldAlert,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";

export type NavContext = {
  projectId: string | null;
  projectName: string | null;
  userName: string;
  userEmail: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (pathname: string) => boolean;
};

function section(
  title: string,
  items: NavItem[],
  pathname: string,
  onNavigate?: () => void,
) {
  return (
    <div className="space-y-1">
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
        {title}
      </p>
      {items.map((item) => {
        const active = item.match
          ? item.match(pathname)
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
              active
                ? "bg-[var(--ink)] font-semibold text-[#ffffff] shadow-[var(--shadow-sm)]"
                : "text-[var(--ink-muted)] hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${active ? "text-[#ffffff]" : "opacity-90"}`}
            />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function SidebarNav({ context }: { context: NavContext }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pid = context.projectId;

  const workspace: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      match: (p) => p === "/dashboard" || p === "/",
    },
    {
      href: "/projects",
      label: "Projects",
      icon: FolderKanban,
      match: (p) => p === "/projects" || p.startsWith("/projects/"),
    },
    { href: "/suppliers", label: "Suppliers", icon: Boxes },
  ];

  const intelligence: NavItem[] = [
    { href: "/disruptions", label: "Disruptions", icon: ShieldAlert },
    {
      href: pid ? `/projects/${pid}/map` : "/map",
      label: "Dependency Map",
      icon: GitBranch,
      match: (p) => p.includes("/map") || p === "/map",
    },
    { href: "/recovery", label: "Recovery Plans", icon: Sparkles },
    { href: "/simulator", label: "Financial Simulator", icon: Wallet },
  ];

  const operations: NavItem[] = [
    { href: "/actions", label: "Action Center", icon: ClipboardList },
    { href: "/transactions", label: "Transactions", icon: Banknote },
    { href: "/activity", label: "Activity Log", icon: Activity },
  ];

  const navBody = (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--line)] px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ink)] text-sm font-bold text-[#ffffff]">
            K
          </span>
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg leading-none text-[var(--ink)]">
              KINTA
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              Recovery intelligence
            </p>
          </div>
        </Link>
        {context.projectName ? (
          <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              Active project
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-[var(--ink)]">
              {context.projectName}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {section("Workspace", workspace, pathname, () => setOpen(false))}
        {section("Intelligence", intelligence, pathname, () => setOpen(false))}
        {section("Operations", operations, pathname, () => setOpen(false))}
      </div>

      <div className="border-t border-[var(--line)] px-3 py-3">
        <Link
          href="/settings"
          onClick={() => setOpen(false)}
          className={`mb-2 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
            pathname === "/settings"
              ? "bg-[var(--ink)] font-semibold text-[#ffffff]"
              : "text-[var(--ink-muted)] hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
          }`}
        >
          <Settings
            className={`h-4 w-4 ${pathname === "/settings" ? "text-[#ffffff]" : ""}`}
          />
          Settings
        </Link>
        <div className="rounded-xl border border-[var(--line)] bg-white px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--teal-soft)] text-xs font-bold text-[var(--teal)]">
              {context.userName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--ink)]">
                {context.userName}
              </p>
              <p className="truncate text-[11px] text-[var(--ink-muted)]">
                {context.userEmail}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line)] bg-white shadow-sm lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-[var(--line)] bg-white/90 backdrop-blur lg:block">
        {navBody}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--ink)]/40"
            aria-label="Close navigation overlay"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col bg-white shadow-xl">
            <button
              type="button"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)]"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            {navBody}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function MobileTopBar({ title }: { title?: string }) {
  return (
    <div className="mb-4 flex items-center justify-end gap-2 pt-12 lg:hidden lg:pt-0">
      {title ? (
        <p className="mr-auto truncate pl-14 text-sm font-medium text-[var(--ink-muted)]">
          {title}
        </p>
      ) : (
        <span className="mr-auto pl-14" />
      )}
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--teal)]">
        <Radar className="h-3 w-3" />
        Live demo
      </span>
    </div>
  );
}
