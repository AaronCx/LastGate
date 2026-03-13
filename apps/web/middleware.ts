import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect dashboard routes
  const protectedPaths = [
    "/repos",
    "/activity",
    "/review",
    "/settings",
  ];

  const isProtected =
    protectedPaths.some((path) => pathname.startsWith(path)) ||
    (pathname === "/" && request.cookies.has("lastgate_session"));

  // Check for dashboard access (root path when logged in is dashboard)
  const isDashboardRoot = pathname === "/" && !request.headers.get("accept")?.includes("text/html");

  if (isProtected) {
    const session = request.cookies.get("lastgate_session");

    if (!session?.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect logged-in users from login page to dashboard
  if (pathname === "/login") {
    const session = request.cookies.get("lastgate_session");
    if (session?.value) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
