import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACTIVE_PROJECT_COOKIE = "kinta_active_project";

/** Capture /projects/:id from the URL and persist as active workspace project. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  const match = pathname.match(/^\/projects\/([^/]+)/);
  const projectId = match?.[1];

  // Ignore static segment routes like /projects/new
  if (projectId && projectId !== "new") {
    response.cookies.set(ACTIVE_PROJECT_COOKIE, projectId, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 180,
    });
  }

  return response;
}

export const config = {
  matcher: ["/projects/:path*"],
};

export { ACTIVE_PROJECT_COOKIE };
