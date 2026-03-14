import { describe, test, expect } from "bun:test";
import { buildSlackMessage } from "../slack";
import type { NotificationPayload } from "../types";

function makePayload(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  return {
    repoFullName: "AaronCx/AgentForge",
    commitSha: "abc1234567890def1234567890abcdef12345678",
    branch: "main",
    status: "failed",
    failures: [
      { checkType: "secrets", summary: "Possible API key detected in src/config.ts" },
    ],
    warnings: [],
    dashboardUrl: "https://lastgate.vercel.app/repos/AaronCx/AgentForge/checks/123",
    githubUrl: "https://github.com/AaronCx/AgentForge",
    ...overrides,
  };
}

describe("Slack Message Builder", () => {
  // Formatting
  test("generates valid Slack Block Kit JSON for a failed check run", () => {
    const msg = buildSlackMessage(makePayload());
    expect(msg.blocks).toBeDefined();
    expect(msg.blocks.length).toBeGreaterThanOrEqual(3);
  });

  test("header block shows correct emoji and status text for failure", () => {
    const msg = buildSlackMessage(makePayload());
    const header = msg.blocks[0];
    expect(header.type).toBe("header");
    expect(header.text.text).toContain("❌");
    expect(header.text.text).toContain("LastGate: Check Failed");
  });

  test("section fields include repo name, commit SHA, branch, failure count", () => {
    const msg = buildSlackMessage(makePayload());
    const section = msg.blocks[1];
    expect(section.type).toBe("section");
    expect(section.fields.length).toBeGreaterThanOrEqual(4);

    const fieldTexts = section.fields.map((f: any) => f.text).join(" ");
    expect(fieldTexts).toContain("AaronCx/AgentForge");
    expect(fieldTexts).toContain("abc1234");
    expect(fieldTexts).toContain("main");
    expect(fieldTexts).toContain("1 failed");
  });

  test("failure details section lists each finding with type and message", () => {
    const msg = buildSlackMessage(makePayload());
    const failureBlock = msg.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("SECRETS")
    );
    expect(failureBlock).toBeDefined();
    expect(failureBlock.text.text).toContain("Possible API key");
  });

  test("actions block includes View in LastGate and View on GitHub buttons", () => {
    const msg = buildSlackMessage(makePayload());
    const actionsBlock = msg.blocks.find((b: any) => b.type === "actions");
    expect(actionsBlock).toBeDefined();
    expect(actionsBlock.elements.length).toBe(2);
    expect(actionsBlock.elements[0].text.text).toBe("View in LastGate");
    expect(actionsBlock.elements[1].text.text).toBe("View on GitHub");
    expect(actionsBlock.elements[0].url).toContain("lastgate.vercel.app");
    expect(actionsBlock.elements[1].url).toContain("github.com");
  });

  test("all-pass notification uses green styling and passed header", () => {
    const msg = buildSlackMessage(makePayload({ status: "passed", failures: [], warnings: [] }));
    const header = msg.blocks[0];
    expect(header.text.text).toContain("✅");
    expect(header.text.text).toContain("All Checks Passed");
  });

  test("warning-only notification uses yellow styling", () => {
    const msg = buildSlackMessage(
      makePayload({
        status: "warned",
        failures: [],
        warnings: [{ checkType: "lint", summary: "Minor lint issue" }],
      })
    );
    const header = msg.blocks[0];
    expect(header.text.text).toContain("⚠️");
    expect(header.text.text).toContain("Check Warnings");
  });

  // Content
  test("repo name is formatted as a Slack mrkdwn link", () => {
    const msg = buildSlackMessage(makePayload());
    const section = msg.blocks[1];
    const repoField = section.fields.find((f: any) => f.text.includes("Repo"));
    expect(repoField.text).toContain("<https://github.com/AaronCx/AgentForge|AaronCx/AgentForge>");
  });

  test("commit SHA is truncated to 7 characters in display", () => {
    const msg = buildSlackMessage(makePayload());
    const section = msg.blocks[1];
    const commitField = section.fields.find((f: any) => f.text.includes("Commit"));
    expect(commitField.text).toContain("`abc1234`");
    // Full SHA in the link
    expect(commitField.text).toContain("abc1234567890def1234567890abcdef12345678");
  });

  test("findings are listed with bullet points and bold check type names", () => {
    const msg = buildSlackMessage(
      makePayload({
        failures: [
          { checkType: "secrets", summary: "API key in source" },
          { checkType: "lint", summary: "Unused import" },
        ],
      })
    );
    const failureBlock = msg.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("SECRETS")
    );
    expect(failureBlock.text.text).toContain("•");
    expect(failureBlock.text.text).toContain("*SECRETS*");
    expect(failureBlock.text.text).toContain("*LINT*");
  });

  test("empty findings list shows no failure section", () => {
    const msg = buildSlackMessage(makePayload({ status: "passed", failures: [], warnings: [] }));
    const failureBlock = msg.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("•")
    );
    expect(failureBlock).toBeUndefined();
  });

  // Edge cases
  test("very long repo name doesn't break layout", () => {
    const longName = "AaronCx/" + "a".repeat(200);
    const msg = buildSlackMessage(makePayload({ repoFullName: longName }));
    expect(msg.blocks).toBeDefined();
    expect(msg.blocks.length).toBeGreaterThanOrEqual(3);
  });

  // Mention
  test("mention is prepended on FAIL results", () => {
    const msg = buildSlackMessage(makePayload(), "<@U123>");
    const mentionBlock = msg.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("<@U123>")
    );
    expect(mentionBlock).toBeDefined();
  });

  test("mention is NOT added on PASS results", () => {
    const msg = buildSlackMessage(
      makePayload({ status: "passed", failures: [], warnings: [] }),
      "<@U123>"
    );
    const mentionBlock = msg.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("<@U123>")
    );
    expect(mentionBlock).toBeUndefined();
  });

  test("no mention configured adds no mention block", () => {
    const msg = buildSlackMessage(makePayload());
    const mentionBlock = msg.blocks.find(
      (b: any) => b.type === "section" && b.text?.text?.includes("Critical failure")
    );
    expect(mentionBlock).toBeUndefined();
  });
});
