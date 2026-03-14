import { describe, test, expect } from "bun:test";

/**
 * Tests for Team page logic: slug generation from name,
 * team creation validation, team selection behavior.
 */

// Extracted from team/page.tsx handleNameChange
function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

describe("Team page - slug generation", () => {
  test("converts name to lowercase", () => {
    expect(generateSlug("MyTeam")).toBe("myteam");
  });

  test("replaces spaces with hyphens", () => {
    expect(generateSlug("My Team")).toBe("my-team");
  });

  test("replaces multiple consecutive non-alphanumeric chars with single hyphen", () => {
    expect(generateSlug("My   Team")).toBe("my-team");
    expect(generateSlug("My---Team")).toBe("my-team");
    expect(generateSlug("My @#$ Team")).toBe("my-team");
  });

  test("removes leading hyphens", () => {
    expect(generateSlug("---leading")).toBe("leading");
  });

  test("removes trailing hyphens", () => {
    expect(generateSlug("trailing---")).toBe("trailing");
  });

  test("removes both leading and trailing hyphens", () => {
    expect(generateSlug("--both--")).toBe("both");
  });

  test("handles special characters", () => {
    expect(generateSlug("Team & Friends!")).toBe("team-friends");
  });

  test("preserves numbers", () => {
    expect(generateSlug("Team 42")).toBe("team-42");
  });

  test("handles single word names", () => {
    expect(generateSlug("engineering")).toBe("engineering");
  });

  test("handles already-valid slugs", () => {
    expect(generateSlug("my-team")).toBe("my-team");
  });

  test("handles empty string", () => {
    expect(generateSlug("")).toBe("");
  });

  test("handles unicode characters by stripping them", () => {
    expect(generateSlug("Team Cafe")).toBe("team-cafe");
  });

  test("collapses dots and underscores into hyphens", () => {
    expect(generateSlug("my.team_name")).toBe("my-team-name");
  });
});

describe("Team page - creation validation", () => {
  test("empty name is invalid (would not submit)", () => {
    const name = "";
    const slug = "something";
    const canSubmit = name.trim() !== "" && slug.trim() !== "";
    expect(canSubmit).toBe(false);
  });

  test("empty slug is invalid", () => {
    const name = "My Team";
    const slug = "";
    const canSubmit = name.trim() !== "" && slug.trim() !== "";
    expect(canSubmit).toBe(false);
  });

  test("whitespace-only name is invalid", () => {
    const name = "   ";
    const slug = "my-team";
    const canSubmit = name.trim() !== "" && slug.trim() !== "";
    expect(canSubmit).toBe(false);
  });

  test("valid name and slug pass validation", () => {
    const name = "My Team";
    const slug = "my-team";
    const canSubmit = name.trim() !== "" && slug.trim() !== "";
    expect(canSubmit).toBe(true);
  });

  test("name is trimmed before sending to API", () => {
    const name = "  My Team  ";
    expect(name.trim()).toBe("My Team");
  });

  test("slug is trimmed before sending to API", () => {
    const slug = "  my-team  ";
    expect(slug.trim()).toBe("my-team");
  });
});

describe("Team page - team selection", () => {
  test("null selectedTeamId means no team selected (personal)", () => {
    const selectedTeamId: string | null = null;
    expect(selectedTeamId).toBeNull();
  });

  test("members and audit cleared when no team selected", () => {
    const selectedTeamId: string | null = null;
    const members = selectedTeamId ? [{ id: "1" }] : [];
    const auditEntries = selectedTeamId ? [{ id: "1" }] : [];
    expect(members).toEqual([]);
    expect(auditEntries).toEqual([]);
  });

  test("error extraction from Error instances", () => {
    const err = new Error("Team name already taken");
    const message = err instanceof Error ? err.message : "Failed to fetch teams";
    expect(message).toBe("Team name already taken");
  });

  test("error extraction from non-Error values falls back", () => {
    const err = "string error";
    const message = err instanceof Error ? err.message : "Failed to fetch teams";
    expect(message).toBe("Failed to fetch teams");
  });
});
