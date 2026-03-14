import { describe, test, expect } from "bun:test";

/**
 * Tests for middleware.ts path protection logic, redirect behavior,
 * and matcher configuration.
 *
 * We test the extracted logic patterns rather than the full Next.js
 * middleware handler, since NextRequest/NextResponse require the
 * Next.js runtime.
 */

// ---------------------------------------------------------------------------
// Extracted logic mirrors
// ---------------------------------------------------------------------------

const PROTECTED_PATHS = [
  "/overview",
  "/repos",
  "/activity",
  "/analytics",
  "/review",
  "/team",
  "/settings",
];

function isProtectedPath(pathname: string, hasCookie: boolean): boolean {
  return (
    PROTECTED_PATHS.some((path) => pathname.startsWith(path)) ||
    (pathname === "/" && hasCookie)
  );
}

function shouldRedirectToOverview(
  pathname: string,
  hasSession: boolean
): boolean {
  return (pathname === "/login" || pathname === "/") && hasSession;
}

function buildLoginRedirectUrl(
  pathname: string,
  baseUrl: string = "http://localhost:3000"
): string {
  const loginUrl = new URL("/login", baseUrl);
  loginUrl.searchParams.set("redirect", pathname);
  return loginUrl.toString();
}

/**
 * The matcher regex from middleware config — used by Next.js to decide which
 * requests even reach the middleware function.
 */
const MATCHER_REGEX = /^\/((?!api|_next\/static|_next\/image|favicon\.ico|.*\..*$).*)/;

function matchesMiddleware(pathname: string): boolean {
  return MATCHER_REGEX.test(pathname);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Middleware — protected paths", () => {
  test("all dashboard routes are protected", () => {
    for (const path of PROTECTED_PATHS) {
      expect(isProtectedPath(path, false)).toBe(true);
    }
  });

  test("sub-paths of protected routes are also protected", () => {
    expect(isProtectedPath("/repos/my-repo", false)).toBe(true);
    expect(isProtectedPath("/settings/profile", false)).toBe(true);
    expect(isProtectedPath("/analytics/weekly", false)).toBe(true);
    expect(isProtectedPath("/team/members", false)).toBe(true);
  });

  test("root path is protected only when session cookie exists", () => {
    expect(isProtectedPath("/", true)).toBe(true);
    expect(isProtectedPath("/", false)).toBe(false);
  });

  test("non-protected paths are not protected", () => {
    expect(isProtectedPath("/login", false)).toBe(false);
    expect(isProtectedPath("/callback", false)).toBe(false);
    expect(isProtectedPath("/pricing", false)).toBe(false);
    expect(isProtectedPath("/about", false)).toBe(false);
  });
});

describe("Middleware — redirect to login", () => {
  test("redirect URL includes original path as redirect param", () => {
    const url = buildLoginRedirectUrl("/overview");
    expect(url).toBe("http://localhost:3000/login?redirect=%2Foverview");
  });

  test("redirect URL preserves nested paths", () => {
    const url = buildLoginRedirectUrl("/repos/my-repo");
    expect(url).toBe("http://localhost:3000/login?redirect=%2Frepos%2Fmy-repo");
  });

  test("redirect URL works with different base URLs", () => {
    const url = buildLoginRedirectUrl(
      "/settings",
      "https://app.lastgate.dev"
    );
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://app.lastgate.dev");
    expect(parsed.pathname).toBe("/login");
    expect(parsed.searchParams.get("redirect")).toBe("/settings");
  });
});

describe("Middleware — redirect authenticated users away from login/root", () => {
  test("authenticated user on /login is redirected", () => {
    expect(shouldRedirectToOverview("/login", true)).toBe(true);
  });

  test("authenticated user on / is redirected", () => {
    expect(shouldRedirectToOverview("/", true)).toBe(true);
  });

  test("unauthenticated user on /login is NOT redirected", () => {
    expect(shouldRedirectToOverview("/login", false)).toBe(false);
  });

  test("unauthenticated user on / is NOT redirected", () => {
    expect(shouldRedirectToOverview("/", false)).toBe(false);
  });

  test("authenticated user on other paths is NOT redirected to overview", () => {
    expect(shouldRedirectToOverview("/repos", true)).toBe(false);
    expect(shouldRedirectToOverview("/callback", true)).toBe(false);
  });
});

describe("Middleware — matcher configuration", () => {
  test("matches normal page routes", () => {
    expect(matchesMiddleware("/")).toBe(true);
    expect(matchesMiddleware("/login")).toBe(true);
    expect(matchesMiddleware("/overview")).toBe(true);
    expect(matchesMiddleware("/repos")).toBe(true);
    expect(matchesMiddleware("/settings")).toBe(true);
  });

  test("excludes API routes", () => {
    expect(matchesMiddleware("/api/auth/github")).toBe(false);
    expect(matchesMiddleware("/api/repos")).toBe(false);
    expect(matchesMiddleware("/api/webhooks")).toBe(false);
  });

  test("excludes Next.js static files", () => {
    expect(matchesMiddleware("/_next/static/chunks/main.js")).toBe(false);
  });

  test("excludes Next.js image optimization", () => {
    expect(matchesMiddleware("/_next/image")).toBe(false);
  });

  test("excludes favicon", () => {
    expect(matchesMiddleware("/favicon.ico")).toBe(false);
  });

  test("excludes public files with extensions", () => {
    expect(matchesMiddleware("/logo.png")).toBe(false);
    expect(matchesMiddleware("/robots.txt")).toBe(false);
    expect(matchesMiddleware("/sitemap.xml")).toBe(false);
    expect(matchesMiddleware("/images/hero.webp")).toBe(false);
  });
});

describe("Middleware — combined flow scenarios", () => {
  test("unauthenticated user visiting /repos gets login redirect with redirect param", () => {
    const hasSession = false;
    const pathname = "/repos";

    expect(isProtectedPath(pathname, hasSession)).toBe(true);

    // Since no session, they should be redirected to login
    const redirectUrl = buildLoginRedirectUrl(pathname);
    const parsed = new URL(redirectUrl);
    expect(parsed.pathname).toBe("/login");
    expect(parsed.searchParams.get("redirect")).toBe("/repos");
  });

  test("authenticated user visiting / is redirected to /overview", () => {
    const hasSession = true;
    const pathname = "/";

    // Root with session is protected, but the redirect-to-overview check
    // takes priority in the actual middleware flow
    expect(shouldRedirectToOverview(pathname, hasSession)).toBe(true);
  });

  test("unauthenticated user visiting /login sees login page (no redirect)", () => {
    const hasSession = false;
    const pathname = "/login";

    expect(isProtectedPath(pathname, hasSession)).toBe(false);
    expect(shouldRedirectToOverview(pathname, hasSession)).toBe(false);
    // Neither redirect fires — NextResponse.next() would be called
  });

  test("request to /api/repos bypasses middleware entirely via matcher", () => {
    expect(matchesMiddleware("/api/repos")).toBe(false);
  });
});
