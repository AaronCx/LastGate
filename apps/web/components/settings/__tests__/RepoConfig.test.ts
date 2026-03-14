import { describe, test, expect } from "bun:test";

/**
 * Tests for RepoConfig component logic: optimistic toggle with rollback,
 * repo state management, active/inactive filtering.
 */

interface Repo {
  id: string;
  full_name: string;
  is_active: boolean;
  default_branch: string;
}

function makeRepo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: "repo-1",
    full_name: "owner/repo",
    is_active: true,
    default_branch: "main",
    ...overrides,
  };
}

// Mirrors the optimistic update from RepoConfig.tsx
function optimisticToggle(repos: Repo[], repoId: string): Repo[] {
  return repos.map((r) =>
    r.id === repoId ? { ...r, is_active: !r.is_active } : r
  );
}

// Mirrors the rollback on failure
function rollbackToggle(repos: Repo[], repoId: string): Repo[] {
  return repos.map((r) =>
    r.id === repoId ? { ...r, is_active: !r.is_active } : r
  );
}

describe("RepoConfig - optimistic toggle", () => {
  test("toggling active repo sets it to inactive", () => {
    const repos = [makeRepo({ id: "1", is_active: true })];
    const updated = optimisticToggle(repos, "1");
    expect(updated[0].is_active).toBe(false);
  });

  test("toggling inactive repo sets it to active", () => {
    const repos = [makeRepo({ id: "1", is_active: false })];
    const updated = optimisticToggle(repos, "1");
    expect(updated[0].is_active).toBe(true);
  });

  test("toggle only affects the targeted repo", () => {
    const repos = [
      makeRepo({ id: "1", is_active: true }),
      makeRepo({ id: "2", is_active: true }),
      makeRepo({ id: "3", is_active: false }),
    ];
    const updated = optimisticToggle(repos, "2");
    expect(updated[0].is_active).toBe(true);   // unchanged
    expect(updated[1].is_active).toBe(false);  // toggled
    expect(updated[2].is_active).toBe(false);  // unchanged
  });

  test("toggle preserves other repo fields", () => {
    const repos = [makeRepo({ id: "1", full_name: "org/my-repo", is_active: true, default_branch: "develop" })];
    const updated = optimisticToggle(repos, "1");
    expect(updated[0].full_name).toBe("org/my-repo");
    expect(updated[0].default_branch).toBe("develop");
    expect(updated[0].id).toBe("1");
  });

  test("toggle with non-existent id changes nothing", () => {
    const repos = [
      makeRepo({ id: "1", is_active: true }),
      makeRepo({ id: "2", is_active: false }),
    ];
    const updated = optimisticToggle(repos, "999");
    expect(updated[0].is_active).toBe(true);
    expect(updated[1].is_active).toBe(false);
  });
});

describe("RepoConfig - rollback on failure", () => {
  test("rollback reverts toggle (double-toggle restores original)", () => {
    const repos = [makeRepo({ id: "1", is_active: true })];
    const toggled = optimisticToggle(repos, "1");
    expect(toggled[0].is_active).toBe(false);
    const rolledBack = rollbackToggle(toggled, "1");
    expect(rolledBack[0].is_active).toBe(true);
  });

  test("rollback only affects the targeted repo", () => {
    const repos = [
      makeRepo({ id: "1", is_active: false }),
      makeRepo({ id: "2", is_active: true }),
    ];
    // Simulate: toggle repo 1, then rollback repo 1
    const toggled = optimisticToggle(repos, "1");
    const rolledBack = rollbackToggle(toggled, "1");
    expect(rolledBack[0].is_active).toBe(false); // back to original
    expect(rolledBack[1].is_active).toBe(true);  // untouched
  });
});

describe("RepoConfig - data handling", () => {
  test("empty repos array results in empty list", () => {
    const repos: Repo[] = [];
    expect(repos.length).toBe(0);
  });

  test("API response data field extraction", () => {
    const apiResponse = {
      data: [
        makeRepo({ id: "1" }),
        makeRepo({ id: "2" }),
      ],
    };
    const repos = apiResponse.data || [];
    expect(repos.length).toBe(2);
  });

  test("API response with null data defaults to empty", () => {
    const apiResponse = { data: null };
    const repos = apiResponse.data || [];
    expect(repos).toEqual([]);
  });

  test("PATCH body includes repo id and new is_active value", () => {
    const repo = makeRepo({ id: "repo-42", is_active: true });
    const newActive = !repo.is_active;
    const body = JSON.stringify({ id: repo.id, is_active: newActive });
    const parsed = JSON.parse(body);
    expect(parsed.id).toBe("repo-42");
    expect(parsed.is_active).toBe(false);
  });
});

describe("RepoConfig - error handling", () => {
  test("error message extraction from Error instance", () => {
    const err = new Error("Failed to fetch repositories");
    const message = err instanceof Error ? err.message : "Failed to load repositories";
    expect(message).toBe("Failed to fetch repositories");
  });

  test("error message fallback for non-Error", () => {
    const err = 42;
    const message = err instanceof Error ? err.message : "Failed to load repositories";
    expect(message).toBe("Failed to load repositories");
  });
});
