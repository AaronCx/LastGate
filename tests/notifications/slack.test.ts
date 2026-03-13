import { describe, test, expect } from "bun:test";
import { buildSlackMessage } from "../../packages/engine/src/notifications/slack";
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

describe("Slack Notification", () => {
  test("builds Block Kit message with header", () => {
    const msg = buildSlackMessage(basePayload);
    expect(msg.blocks).toBeDefined();
    expect(msg.blocks[0].type).toBe("header");
    expect(msg.blocks[0].text.text).toContain("LastGate");
    expect(msg.blocks[0].text.text).toContain("Failed");
  });

  test("includes repo name and short SHA in fields", () => {
    const msg = buildSlackMessage(basePayload);
    const section = msg.blocks[1];
    expect(section.type).toBe("section");
    const fieldsText = section.fields.map((f: any) => f.text).join(" ");
    expect(fieldsText).toContain("AaronCx/AgentForge");
    expect(fieldsText).toContain("abc1234");
    expect(fieldsText).toContain("main");
  });

  test("includes failure details", () => {
    const msg = buildSlackMessage(basePayload);
    const detailBlock = msg.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("SECRETS")
    );
    expect(detailBlock).toBeDefined();
    expect(detailBlock.text.text).toContain("OpenAI API key");
  });

  test("includes action buttons", () => {
    const msg = buildSlackMessage(basePayload);
    const actions = msg.blocks.find((b: any) => b.type === "actions");
    expect(actions).toBeDefined();
    expect(actions.elements).toHaveLength(2);
    expect(actions.elements[0].text.text).toContain("LastGate");
    expect(actions.elements[1].text.text).toContain("GitHub");
  });

  test("adds mention on critical failures", () => {
    const msg = buildSlackMessage(basePayload, "<@U12345>");
    const mentionBlock = msg.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("<@U12345>")
    );
    expect(mentionBlock).toBeDefined();
  });

  test("no mention block when mention is null", () => {
    const msg = buildSlackMessage(basePayload, null);
    const mentionBlock = msg.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("<@")
    );
    expect(mentionBlock).toBeUndefined();
  });

  test("passed status uses different header text", () => {
    const passedPayload = { ...basePayload, status: "passed" as const, failures: [] };
    const msg = buildSlackMessage(passedPayload);
    expect(msg.blocks[0].text.text).toContain("Passed");
  });

  test("warned status uses different header text", () => {
    const warnPayload = { ...basePayload, status: "warned" as const, failures: [] };
    const msg = buildSlackMessage(warnPayload);
    expect(msg.blocks[0].text.text).toContain("Warnings");
  });
});
