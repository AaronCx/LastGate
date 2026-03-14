import { describe, test, expect } from "bun:test";

/**
 * Tests for the repos API route logic — specifically the PATCH handler
 * validation, plus POST and GET validation patterns.
 *
 * Since these handlers depend on Next.js runtime and Supabase, we test
 * the extracted validation and transformation logic.
 */

// ---------------------------------------------------------------------------
// Extracted logic mirrors
// ---------------------------------------------------------------------------

/** Validates the POST request body for adding a repo. */
function validatePostBody(body: Record<string, unknown>): {
  valid: boolean;
  error?: string;
} {
  if (!body.full_name || !body.installation_id) {
    return {
      valid: false,
      error: "full_name and installation_id are required",
    };
  }
  return { valid: true };
}

/** Builds the default config for a newly added repo. */
function buildDefaultRepoConfig() {
  return {
    checks: {
      secrets: { enabled: true },
      duplicates: { enabled: true },
      lint: { enabled: true },
      build: { enabled: false },
      dependencies: { enabled: true },
      patterns: { enabled: true },
    },
  };
}

/** Validates the PATCH request body. */
function validatePatchBody(body: Record<string, unknown>): {
  valid: boolean;
  error?: string;
  status?: number;
} {
  if (!body.id) {
    return { valid: false, error: "id is required", status: 400 };
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (body.config) updates.config = body.config;

  if (Object.keys(updates).length === 0) {
    return { valid: false, error: "No fields to update", status: 400 };
  }

  return { valid: true };
}

/** Extracts the update fields from a PATCH body. */
function extractPatchUpdates(body: Record<string, unknown>): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (body.config) updates.config = body.config;
  return updates;
}

// ---------------------------------------------------------------------------
// Tests — POST validation
// ---------------------------------------------------------------------------

describe("Repos POST — request validation", () => {
  test("rejects when full_name is missing", () => {
    const result = validatePostBody({ installation_id: 123 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("full_name and installation_id are required");
  });

  test("rejects when installation_id is missing", () => {
    const result = validatePostBody({ full_name: "owner/repo" });
    expect(result.valid).toBe(false);
  });

  test("rejects when both fields are missing", () => {
    const result = validatePostBody({});
    expect(result.valid).toBe(false);
  });

  test("rejects when full_name is empty string", () => {
    const result = validatePostBody({ full_name: "", installation_id: 123 });
    expect(result.valid).toBe(false);
  });

  test("accepts valid body", () => {
    const result = validatePostBody({
      full_name: "owner/repo",
      installation_id: 12345,
    });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — default config
// ---------------------------------------------------------------------------

describe("Repos POST — default config", () => {
  test("builds config with all expected check types", () => {
    const config = buildDefaultRepoConfig();
    const checkNames = Object.keys(config.checks);

    expect(checkNames).toContain("secrets");
    expect(checkNames).toContain("duplicates");
    expect(checkNames).toContain("lint");
    expect(checkNames).toContain("build");
    expect(checkNames).toContain("dependencies");
    expect(checkNames).toContain("patterns");
  });

  test("build check is disabled by default", () => {
    const config = buildDefaultRepoConfig();
    expect(config.checks.build.enabled).toBe(false);
  });

  test("all other checks are enabled by default", () => {
    const config = buildDefaultRepoConfig();
    expect(config.checks.secrets.enabled).toBe(true);
    expect(config.checks.duplicates.enabled).toBe(true);
    expect(config.checks.lint.enabled).toBe(true);
    expect(config.checks.dependencies.enabled).toBe(true);
    expect(config.checks.patterns.enabled).toBe(true);
  });

  test("has exactly 6 check types", () => {
    const config = buildDefaultRepoConfig();
    expect(Object.keys(config.checks)).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// Tests — PATCH validation
// ---------------------------------------------------------------------------

describe("Repos PATCH — request validation", () => {
  test("rejects when id is missing", () => {
    const result = validatePatchBody({ is_active: true });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("id is required");
    expect(result.status).toBe(400);
  });

  test("rejects when id is null", () => {
    const result = validatePatchBody({ id: null, is_active: true });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("id is required");
  });

  test("rejects when id is empty string", () => {
    const result = validatePatchBody({ id: "", is_active: true });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("id is required");
  });

  test("rejects when no updateable fields are provided", () => {
    const result = validatePatchBody({ id: "uuid-123" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("No fields to update");
  });

  test("rejects when only unrecognized fields are provided", () => {
    const result = validatePatchBody({
      id: "uuid-123",
      full_name: "owner/repo",
      random_field: "value",
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("No fields to update");
  });

  test("accepts with is_active boolean true", () => {
    const result = validatePatchBody({ id: "uuid-123", is_active: true });
    expect(result.valid).toBe(true);
  });

  test("accepts with is_active boolean false", () => {
    const result = validatePatchBody({ id: "uuid-123", is_active: false });
    expect(result.valid).toBe(true);
  });

  test("accepts with config object", () => {
    const result = validatePatchBody({
      id: "uuid-123",
      config: { checks: { secrets: { enabled: false } } },
    });
    expect(result.valid).toBe(true);
  });

  test("accepts with both is_active and config", () => {
    const result = validatePatchBody({
      id: "uuid-123",
      is_active: false,
      config: { checks: {} },
    });
    expect(result.valid).toBe(true);
  });

  test("ignores is_active when it is not a boolean", () => {
    // is_active as string "true" should NOT be accepted as a valid update
    const result = validatePatchBody({ id: "uuid-123", is_active: "true" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("No fields to update");
  });

  test("ignores is_active when it is a number", () => {
    const result = validatePatchBody({ id: "uuid-123", is_active: 1 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("No fields to update");
  });
});

// ---------------------------------------------------------------------------
// Tests — PATCH update extraction
// ---------------------------------------------------------------------------

describe("Repos PATCH — update extraction", () => {
  test("extracts is_active when boolean true", () => {
    const updates = extractPatchUpdates({
      id: "uuid-123",
      is_active: true,
    });
    expect(updates).toEqual({ is_active: true });
  });

  test("extracts is_active when boolean false", () => {
    const updates = extractPatchUpdates({
      id: "uuid-123",
      is_active: false,
    });
    expect(updates).toEqual({ is_active: false });
  });

  test("extracts config when present", () => {
    const config = { checks: { secrets: { enabled: false } } };
    const updates = extractPatchUpdates({ id: "uuid-123", config });
    expect(updates).toEqual({ config });
  });

  test("extracts both is_active and config", () => {
    const config = { checks: {} };
    const updates = extractPatchUpdates({
      id: "uuid-123",
      is_active: true,
      config,
    });
    expect(updates).toEqual({ is_active: true, config });
  });

  test("does not include id in updates", () => {
    const updates = extractPatchUpdates({
      id: "uuid-123",
      is_active: true,
    });
    expect(updates).not.toHaveProperty("id");
  });

  test("does not include unrecognized fields in updates", () => {
    const updates = extractPatchUpdates({
      id: "uuid-123",
      is_active: true,
      full_name: "owner/repo",
      installation_id: 999,
    });
    expect(updates).toEqual({ is_active: true });
    expect(updates).not.toHaveProperty("full_name");
    expect(updates).not.toHaveProperty("installation_id");
  });

  test("returns empty object when no valid update fields", () => {
    const updates = extractPatchUpdates({ id: "uuid-123" });
    expect(updates).toEqual({});
    expect(Object.keys(updates)).toHaveLength(0);
  });

  test("ignores is_active when not strictly boolean", () => {
    const updates = extractPatchUpdates({
      id: "uuid-123",
      is_active: "true",
    });
    expect(updates).toEqual({});
  });
});
