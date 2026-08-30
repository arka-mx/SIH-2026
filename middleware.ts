import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/jwt-edge";

type SessionClaims =
  | { role: "admin"; sub: string }
  | { role: "rescuer"; sub: string; rescuerId: string };

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken<SessionClaims>(token) : null;

  const isEntry =
    pathname === "/" || pathname === "/admin/login" || pathname === "/rescuer/login";
  const isAdminArea = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isRescuerArea = pathname.startsWith("/rescuer") && pathname !== "/rescuer/login";

  // A signed-in user landing on the home / login screens goes straight to their workspace.
  if (isEntry && session) {
    if (session.role === "admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (session.role === "rescuer") {
      return NextResponse.redirect(
        new URL(`/rescuer/${encodeURIComponent(session.rescuerId)}`, req.url)
      );
    }
  }

  if (isAdminArea && session?.role !== "admin") {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (isRescuerArea) {
    const targetId = pathname.split("/")[2];
    const allowed =
      session?.role === "admin" ||
      (session?.role === "rescuer" && (!targetId || session.rescuerId === targetId));
    if (!allowed) {
      return NextResponse.redirect(new URL("/rescuer/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*", "/rescuer/:path*"],
};
