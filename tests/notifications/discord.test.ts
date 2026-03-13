import { describe, test, expect } from "bun:test";
import { buildDiscordEmbed } from "../../packages/engine/src/notifications/discord";
import type { NotificationPayload } from "../../packages/engine/src/notifications/types";

const basePayload: NotificationPayload = {
  repoFullName: "AaronCx/AgentForge",
  commitSha: "abc1234567890def",
  branch: "main",
  status: "failed",
  failures: [{ checkType: "secrets", summary: "Possible OpenAI API key in src/config.ts:14" }],
  warnings: [],
  dashboardUrl: "https://lastgate.vercel.app/checks/run-123",
  githubUrl: "https://github.com/AaronCx/AgentForge",
};

describe("Discord Notification", () => {
  test("builds embed with title", () => {
    const msg = buildDiscordEmbed(basePayload);
    expect(msg.embeds).toHaveLength(1);
    expect(msg.embeds[0].title).toContain("LastGate");
    expect(msg.embeds[0].title).toContain("Failed");
  });

  test("uses red color for failures", () => {
    const msg = buildDiscordEmbed(basePayload);
    expect(msg.embeds[0].color).toBe(15548997);
  });

  test("uses green color for passes", () => {
    const passedPayload = { ...basePayload, status: "passed" as const, failures: [] };
    const msg = buildDiscordEmbed(passedPayload);
    expect(msg.embeds[0].color).toBe(5763719);
  });

  test("includes repo, commit, and branch fields", () => {
    const msg = buildDiscordEmbed(basePayload);
    const fields = msg.embeds[0].fields;
    const names = fields.map((f: any) => f.name);
    expect(names).toContain("Repo");
    expect(names).toContain("Commit");
    expect(names).toContain("Branch");
  });

  test("includes failure details in fields", () => {
    const msg = buildDiscordEmbed(basePayload);
    const failureField = msg.embeds[0].fields.find((f: any) => f.name === "Failures");
    expect(failureField).toBeDefined();
    expect(failureField.value).toContain("SECRETS");
    expect(failureField.value).toContain("OpenAI API key");
  });

  test("includes warnings field when present", () => {
    const warnPayload = {
      ...basePayload,
      warnings: [{ checkType: "lint", summary: "2 lint warnings" }],
    };
    const msg = buildDiscordEmbed(warnPayload);
    const warnField = msg.embeds[0].fields.find((f: any) => f.name === "Warnings");
    expect(warnField).toBeDefined();
    expect(warnField.value).toContain("LINT");
  });

  test("adds content mention on critical failures", () => {
    const msg = buildDiscordEmbed(basePayload, "<@&123456>");
    expect(msg.content).toContain("<@&123456>");
  });

  test("no content field when mention is null", () => {
    const msg = buildDiscordEmbed(basePayload, null);
    expect(msg.content).toBeUndefined();
  });

  test("includes timestamp and footer", () => {
    const msg = buildDiscordEmbed(basePayload);
    expect(msg.embeds[0].timestamp).toBeDefined();
    expect(msg.embeds[0].footer.text).toContain("LastGate");
  });
});
