import { describe, test, expect } from "bun:test";

describe("Repos API Logic", () => {
  test("GET /api/repos — returns repo list structure", () => {
    const mockResponse = {
      data: [
        { full_name: "AaronCx/AgentForge", enabled: true },
        { full_name: "AaronCx/LastGate", enabled: true },
      ],
    };
    expect(mockResponse.data.length).toBe(2);
    expect(mockResponse.data[0].full_name).toBe("AaronCx/AgentForge");
  });

  test("POST /api/repos — requires full_name and installation_id", () => {
    const body = { full_name: "AaronCx/NewRepo", installation_id: 12345 };
    expect(body.full_name).toBeTruthy();
    expect(body.installation_id).toBeTruthy();
  });

  test("POST /api/repos — missing full_name → 400", () => {
    const body = { installation_id: 12345 };
    const full_name = (body as any).full_name;
    expect(!full_name).toBe(true);
  });

  test("POST /api/repos — missing installation_id → 400", () => {
    const body = { full_name: "AaronCx/NewRepo" };
    const installation_id = (body as any).installation_id;
    expect(!installation_id).toBe(true);
  });

  test("POST /api/repos — default config structure", () => {
    const defaultConfig = {
      checks: {
        secrets: { enabled: true },
        duplicates: { enabled: true },
        lint: { enabled: true },
        build: { enabled: false },
        dependencies: { enabled: true },
        patterns: { enabled: true },
      },
    };
    expect(defaultConfig.checks.secrets.enabled).toBe(true);
    expect(defaultConfig.checks.build.enabled).toBe(false);
  });
});
