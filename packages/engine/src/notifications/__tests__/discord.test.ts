import { describe, test, expect } from "bun:test";
import { buildDiscordEmbed } from "../discord";
import type { NotificationPayload } from "../types";

function makePayload(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  return {
    repoFullName: "AaronCx/AgentForge",
    commitSha: "abc1234567890def1234567890abcdef12345678",
    branch: "main",
    status: "failed",
    failures: [
      { checkType: "secrets", summary: "Possible API key detected" },
    ],
    warnings: [],
    dashboardUrl: "https://lastgate.vercel.app/repos/AaronCx/AgentForge/checks/123",
    githubUrl: "https://github.com/AaronCx/AgentForge",
    ...overrides,
  };
}

describe("Discord Embed Builder", () => {
  // Formatting
  test("generates valid Discord webhook JSON with embeds array", () => {
    const msg = buildDiscordEmbed(makePayload());
    expect(msg.embeds).toBeDefined();
    expect(msg.embeds).toBeArrayOfSize(1);
  });

  test("embed color is red for failures", () => {
    const msg = buildDiscordEmbed(makePayload());
    expect(msg.embeds[0].color).toBe(15548997);
  });

  test("embed color is yellow for warnings", () => {
    const msg = buildDiscordEmbed(makePayload({ status: "warned", failures: [], warnings: [{ checkType: "lint", summary: "issue" }] }));
    expect(msg.embeds[0].color).toBe(16776960);
  });

  test("embed color is green for all-pass", () => {
    const msg = buildDiscordEmbed(makePayload({ status: "passed", failures: [], warnings: [] }));
    expect(msg.embeds[0].color).toBe(5763719);
  });

  test("fields include repo, commit, and branch", () => {
    const msg = buildDiscordEmbed(makePayload());
    const fields = msg.embeds[0].fields;
    const names = fields.map((f: any) => f.name);
    expect(names).toContain("Repo");
    expect(names).toContain("Commit");
    expect(names).toContain("Branch");
  });

  test("timestamp is valid ISO 8601", () => {
    const msg = buildDiscordEmbed(makePayload());
    const ts = msg.embeds[0].timestamp;
    expect(new Date(ts).toISOString()).toBe(ts);
  });

  test("footer text is LastGate Pre-flight Check", () => {
    const msg = buildDiscordEmbed(makePayload());
    expect(msg.embeds[0].footer.text).toBe("LastGate Pre-flight Check");
  });

  // Content
  test("commit SHA is truncated to 7 characters in display", () => {
    const msg = buildDiscordEmbed(makePayload());
    const commitField = msg.embeds[0].fields.find((f: any) => f.name === "Commit");
    expect(commitField.value).toContain("`abc1234`");
    expect(commitField.value).toContain("abc1234567890def1234567890abcdef12345678");
  });

  test("Discord markdown formatting uses **bold**", () => {
    const msg = buildDiscordEmbed(makePayload());
    const failField = msg.embeds[0].fields.find((f: any) => f.name === "Failures");
    expect(failField.value).toContain("**SECRETS**");
  });

  test("repo is linked", () => {
    const msg = buildDiscordEmbed(makePayload());
    const repoField = msg.embeds[0].fields.find((f: any) => f.name === "Repo");
    expect(repoField.value).toContain("[AaronCx/AgentForge](https://github.com/AaronCx/AgentForge)");
  });

  test("warnings field is included when there are warnings", () => {
    const msg = buildDiscordEmbed(
      makePayload({
        status: "warned",
        failures: [],
        warnings: [{ checkType: "lint", summary: "Minor lint issue" }],
      })
    );
    const warnField = msg.embeds[0].fields.find((f: any) => f.name === "Warnings");
    expect(warnField).toBeDefined();
    expect(warnField.value).toContain("**LINT**");
  });

  // Mention
  test("mention on FAIL adds content field", () => {
    const msg = buildDiscordEmbed(makePayload(), "<@&role_id>");
    expect(msg.content).toContain("<@&role_id>");
  });

  test("mention NOT added on PASS", () => {
    const msg = buildDiscordEmbed(
      makePayload({ status: "passed", failures: [], warnings: [] }),
      "<@&role_id>"
    );
    expect(msg.content).toBeUndefined();
  });

  test("no mention configured means no content field", () => {
    const msg = buildDiscordEmbed(makePayload());
    expect(msg.content).toBeUndefined();
  });

  // Edge cases
  test("single embed only (not multiple)", () => {
    const msg = buildDiscordEmbed(makePayload());
    expect(msg.embeds.length).toBe(1);
  });
});
