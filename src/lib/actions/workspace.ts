"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/workspace";

export async function setActiveProject(projectId: string, redirectTo?: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PROJECT_COOKIE, projectId, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 180,
  });

  // Only navigate when the caller needs a new URL (e.g. /projects/:id).
  // Same-path redirects can skip RSC refresh — clients should router.refresh() instead.
  if (redirectTo) {
    redirect(redirectTo);
  }
}

export async function clearActiveProjectCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_PROJECT_COOKIE);
}
