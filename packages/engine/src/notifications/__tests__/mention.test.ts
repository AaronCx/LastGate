import { describe, test, expect } from "bun:test";
import { buildSlackMessage } from "../slack";
import { buildDiscordEmbed } from "../discord";
import type { NotificationPayload } from "../types";

function makePayload(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  return {
    repoFullName: "AaronCx/AgentForge",
    commitSha: "abc1234567890",
    branch: "main",
    status: "failed",
    failures: [{ checkType: "secrets", summary: "API key detected" }],
    warnings: [],
    dashboardUrl: "https://lastgate.vercel.app/check/1",
    githubUrl: "https://github.com/AaronCx/AgentForge",
    ...overrides,
  };
}

describe("Mention on Critical", () => {
  // Slack
  test("Slack: mention prepended on FAIL results", () => {
    const msg = buildSlackMessage(makePayload(), "<@U123>");
    const mentionBlock = msg.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("<@U123>")
    );
    expect(mentionBlock).toBeDefined();
  });

  test("Slack: mention NOT added on WARN results", () => {
    const msg = buildSlackMessage(
      makePayload({ status: "warned", failures: [], warnings: [{ checkType: "lint", summary: "issue" }] }),
      "<@U123>"
    );
    const mentionBlock = msg.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("<@U123>")
    );
    expect(mentionBlock).toBeUndefined();
  });

  test("Slack: mention NOT added on PASS results", () => {
    const msg = buildSlackMessage(
      makePayload({ status: "passed", failures: [], warnings: [] }),
      "<@U123>"
    );
    const mentionBlock = msg.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("<@U123>")
    );
    expect(mentionBlock).toBeUndefined();
  });

  // Discord
  test("Discord: mention added on FAIL results", () => {
    const msg = buildDiscordEmbed(makePayload(), "<@&role_id>");
    expect(msg.content).toContain("<@&role_id>");
  });

  test("Discord: mention NOT added on WARN", () => {
    const msg = buildDiscordEmbed(
      makePayload({ status: "warned", failures: [], warnings: [{ checkType: "lint", summary: "issue" }] }),
      "<@&role_id>"
    );
    expect(msg.content).toBeUndefined();
  });

  test("Discord: mention NOT added on PASS", () => {
    const msg = buildDiscordEmbed(
      makePayload({ status: "passed", failures: [], warnings: [] }),
      "<@&role_id>"
    );
    expect(msg.content).toBeUndefined();
  });

  // No mention configured
  test("no mention_on_critical configured means no mention added", () => {
    const slackMsg = buildSlackMessage(makePayload());
    const mentionBlock = slackMsg.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("Critical failure")
    );
    expect(mentionBlock).toBeUndefined();

    const discordMsg = buildDiscordEmbed(makePayload());
    expect(discordMsg.content).toBeUndefined();
  });

  test("empty string mention means no mention added", () => {
    const slackMsg = buildSlackMessage(makePayload(), "");
    const mentionBlock = slackMsg.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("Critical failure")
    );
    expect(mentionBlock).toBeUndefined();
  });
});
