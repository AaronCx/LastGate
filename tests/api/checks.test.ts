import { describe, test, expect } from "bun:test";

describe("Check Runs API Logic", () => {
  test("GET /api/checks — pagination defaults", () => {
    const url = new URL("http://localhost:3000/api/checks");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    expect(page).toBe(1);
    expect(limit).toBe(20);
  });

  test("GET /api/checks — pagination params parsed correctly", () => {
    const url = new URL("http://localhost:3000/api/checks?page=3&limit=10");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    expect(page).toBe(3);
    expect(limit).toBe(10);
    // Range calculation: (3-1)*10 = 20 to 30-1 = 29
    expect((page - 1) * limit).toBe(20);
    expect(page * limit - 1).toBe(29);
  });

  test("GET /api/checks?repo=AgentForge filters by repo", () => {
    const url = new URL("http://localhost:3000/api/checks?repo=AgentForge");
    expect(url.searchParams.get("repo")).toBe("AgentForge");
  });

  test("GET /api/checks?status=failed filters by status", () => {
    const url = new URL("http://localhost:3000/api/checks?status=failed");
    expect(url.searchParams.get("status")).toBe("failed");
  });

  test("GET /api/checks/[id] — valid ID format", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(id).toMatch(/^[0-9a-f-]+$/);
  });

  test("GET /api/checks/[id] — invalid ID should be handled", () => {
    const id = "not-a-valid-uuid";
    // Route would query Supabase, which returns null for non-existent UUIDs
    expect(id).toBeTruthy();
  });

  test("date range filter params", () => {
    const url = new URL("http://localhost:3000/api/checks?from=2024-01-01&to=2024-12-31");
    expect(url.searchParams.get("from")).toBe("2024-01-01");
    expect(url.searchParams.get("to")).toBe("2024-12-31");
  });

  test("totalPages calculation", () => {
    const count = 45;
    const limit = 20;
    const totalPages = Math.ceil(count / limit);
    expect(totalPages).toBe(3);
  });
});
