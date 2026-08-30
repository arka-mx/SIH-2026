import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect admin paths
  if (path.startsWith("/admin") && path !== "/admin/login") {
    const adminSession = request.cookies.get("momentum_admin_session")?.value;

    if (!adminSession) {
      // Redirect to admin login page
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Protect rescuer paths (prevent changing route IDs manually)
  if (path.startsWith("/rescuer") && path !== "/rescuer/login") {
    const adminSession = request.cookies.get("momentum_admin_session")?.value;
    const rescuerSession = request.cookies.get("momentum_rescuer_session")?.value;

    // Segment extraction: e.g. "/rescuer/demo-team-alpha" -> targetId = "demo-team-alpha"
    const segments = path.split("/");
    const targetId = segments[2];

    if (!adminSession) {
      if (!rescuerSession || (targetId && rescuerSession !== targetId)) {
        return NextResponse.redirect(new URL("/rescuer/login", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/rescuer/:path*",
  ],
};
