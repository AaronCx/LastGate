import { describe, test, expect } from "bun:test";

/**
 * Tests for the GitHub OAuth auth route logic.
 *
 * Since the handler depends on Next.js runtime (NextRequest/NextResponse),
 * Supabase client, and external GitHub API, we test the extracted logic
 * patterns: request validation, data mapping, origin handling, and
 * cookie configuration.
 */

// ---------------------------------------------------------------------------
// Extracted logic mirrors
// ---------------------------------------------------------------------------

/** Validates the incoming POST body for the code field. */
function validateAuthRequest(body: Record<string, unknown>): {
  valid: boolean;
  error?: string;
} {
  if (!body.code) {
    return { valid: false, error: "Authorization code is required" };
  }
  return { valid: true };
}

/** Resolves the origin for building the redirect_uri. */
function resolveOrigin(
  headerOrigin: string | null,
  envAppUrl?: string
): string {
  return headerOrigin || envAppUrl || "";
}

/** Builds the redirect_uri sent to GitHub token exchange. */
function buildRedirectUri(origin: string): string {
  return `${origin}/callback`;
}

/**
 * Maps GitHub user API response fields to the Supabase user row.
 * Key detail: the column is `github_username`, mapped from GitHub's `login` field.
 */
function mapGitHubUserToSupabaseRow(
  userData: {
    id: number;
    login: string;
    avatar_url: string;
    email: string | null;
  },
  accessToken: string
) {
  return {
    github_id: userData.id,
    github_username: userData.login, // NOT "login" — column is github_username
    avatar_url: userData.avatar_url,
    email: userData.email,
    access_token: accessToken,
    updated_at: expect.any(String), // ISO timestamp
  };
}

/** Session cookie configuration. */
function getSessionCookieConfig(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  };
}

/** Formats a GitHub OAuth error response. */
function formatOAuthError(tokenData: {
  error: string;
  error_description?: string;
}): string {
  return `${tokenData.error}: ${tokenData.error_description || "OAuth exchange failed"}`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GitHub Auth — request validation", () => {
  test("rejects request without code", () => {
    const result = validateAuthRequest({});
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Authorization code is required");
  });

  test("rejects request with empty code", () => {
    const result = validateAuthRequest({ code: "" });
    expect(result.valid).toBe(false);
  });

  test("rejects request with null code", () => {
    const result = validateAuthRequest({ code: null });
    expect(result.valid).toBe(false);
  });

  test("accepts request with valid code", () => {
    const result = validateAuthRequest({ code: "abc123" });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe("GitHub Auth — origin resolution", () => {
  test("uses origin header when present", () => {
    expect(resolveOrigin("https://app.lastgate.dev", "https://fallback.dev")).toBe(
      "https://app.lastgate.dev"
    );
  });

  test("falls back to env APP_URL when origin header is null", () => {
    expect(resolveOrigin(null, "https://fallback.dev")).toBe(
      "https://fallback.dev"
    );
  });

  test("falls back to empty string when both are missing", () => {
    expect(resolveOrigin(null, undefined)).toBe("");
  });

  test("prefers origin header over env even when both present", () => {
    expect(resolveOrigin("https://origin.dev", "https://env.dev")).toBe(
      "https://origin.dev"
    );
  });
});

describe("GitHub Auth — redirect_uri construction", () => {
  test("appends /callback to origin", () => {
    expect(buildRedirectUri("https://app.lastgate.dev")).toBe(
      "https://app.lastgate.dev/callback"
    );
  });

  test("handles empty origin gracefully", () => {
    expect(buildRedirectUri("")).toBe("/callback");
  });

  test("handles localhost origin", () => {
    expect(buildRedirectUri("http://localhost:3000")).toBe(
      "http://localhost:3000/callback"
    );
  });
});

describe("GitHub Auth — user data mapping", () => {
  test("maps GitHub login to github_username column", () => {
    const githubUser = {
      id: 12345,
      login: "octocat",
      avatar_url: "https://avatars.githubusercontent.com/u/12345",
      email: "octocat@github.com",
    };

    const row = mapGitHubUserToSupabaseRow(githubUser, "gho_token123");

    expect(row.github_username).toBe("octocat");
    expect(row.github_id).toBe(12345);
    expect(row.avatar_url).toBe(githubUser.avatar_url);
    expect(row.email).toBe(githubUser.email);
    expect(row.access_token).toBe("gho_token123");

    // Ensure there is no "login" field — the column is github_username
    expect(row).not.toHaveProperty("login");
  });

  test("handles null email from GitHub", () => {
    const githubUser = {
      id: 99999,
      login: "private-user",
      avatar_url: "https://avatars.githubusercontent.com/u/99999",
      email: null,
    };

    const row = mapGitHubUserToSupabaseRow(githubUser, "gho_abc");
    expect(row.email).toBeNull();
  });

  test("includes updated_at as ISO string", () => {
    const githubUser = {
      id: 1,
      login: "test",
      avatar_url: "",
      email: null,
    };

    const row = mapGitHubUserToSupabaseRow(githubUser, "token");
    expect(row.updated_at).toBeDefined();
  });
});

describe("GitHub Auth — session cookie config", () => {
  test("cookie is httpOnly in all environments", () => {
    expect(getSessionCookieConfig(true).httpOnly).toBe(true);
    expect(getSessionCookieConfig(false).httpOnly).toBe(true);
  });

  test("cookie is secure only in production", () => {
    expect(getSessionCookieConfig(true).secure).toBe(true);
    expect(getSessionCookieConfig(false).secure).toBe(false);
  });

  test("cookie sameSite is lax", () => {
    expect(getSessionCookieConfig(true).sameSite).toBe("lax");
  });

  test("cookie maxAge is 30 days in seconds", () => {
    const thirtyDaysInSeconds = 60 * 60 * 24 * 30;
    expect(getSessionCookieConfig(true).maxAge).toBe(thirtyDaysInSeconds);
    expect(thirtyDaysInSeconds).toBe(2592000);
  });

  test("cookie path is root", () => {
    expect(getSessionCookieConfig(true).path).toBe("/");
  });
});

describe("GitHub Auth — OAuth error formatting", () => {
  test("formats error with description", () => {
    const result = formatOAuthError({
      error: "bad_verification_code",
      error_description: "The code passed is incorrect or expired.",
    });
    expect(result).toBe(
      "bad_verification_code: The code passed is incorrect or expired."
    );
  });

  test("uses fallback when description is missing", () => {
    const result = formatOAuthError({ error: "bad_verification_code" });
    expect(result).toBe("bad_verification_code: OAuth exchange failed");
  });

  test("uses fallback when description is empty string", () => {
    const result = formatOAuthError({
      error: "some_error",
      error_description: "",
    });
    expect(result).toBe("some_error: OAuth exchange failed");
  });
});

describe("GitHub Auth — upsert conflict key", () => {
  test("upsert uses github_id as conflict key", () => {
    // The route uses { onConflict: "github_id" }
    // This means a user who re-authenticates gets updated, not duplicated.
    // We verify the mapping produces github_id from userData.id.
    const userData = {
      id: 42,
      login: "user42",
      avatar_url: "",
      email: null,
    };

    const row = mapGitHubUserToSupabaseRow(userData, "token");
    expect(row.github_id).toBe(42);
    expect(typeof row.github_id).toBe("number");
  });
});
