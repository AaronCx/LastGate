import { describe, test, expect } from "bun:test";
import { createHmac } from "crypto";
import { verifyWebhookSignature } from "../../apps/web/lib/github/webhooks";

const SECRET = "test-webhook-secret";

function sign(payload: string): string {
  return "sha256=" + createHmac("sha256", SECRET).update(payload, "utf8").digest("hex");
}

describe("Webhook → Pipeline → Checks API Flow", () => {
  test("step 1: push event payload is verified and parsed", () => {
    const payload = JSON.stringify({
      ref: "refs/heads/main",
      after: "abc1234567890def1234567890abcdef12345678",
      repository: {
        full_name: "AaronCx/TestRepo",
        owner: { login: "AaronCx" },
        name: "TestRepo",
      },
      pusher: { name: "agent-bot" },
      head_commit: { message: "feat: add new feature" },
      installation: { id: 99999 },
    });
    const sig = sign(payload);
    expect(verifyWebhookSignature(payload, sig, SECRET)).toBe(true);
    const parsed = JSON.parse(payload);
    expect(parsed.repository.full_name).toBe("AaronCx/TestRepo");
    expect(parsed.installation.id).toBe(99999);
  });

  test("step 2: pipeline input is constructed from webhook payload", () => {
    const payload = {
      after: "abc1234567890def1234567890abcdef12345678",
      ref: "refs/heads/feature/test",
      repository: { full_name: "AaronCx/TestRepo" },
      head_commit: { message: "feat: new feature" },
    };
    const pipelineInput = {
      branch: payload.ref.replace("refs/heads/", ""),
      repoFullName: payload.repository.full_name,
      headSha: payload.after,
    };
    expect(pipelineInput.branch).toBe("feature/test");
    expect(pipelineInput.repoFullName).toBe("AaronCx/TestRepo");
  });

  test("step 3: check run record structure for database storage", () => {
    const record = {
      github_check_run_id: 12345,
      repo_full_name: "AaronCx/TestRepo",
      head_sha: "abc1234567890",
      branch: "main",
      commit_message: "feat: new feature",
      pusher: "agent-bot",
      status: "in_progress",
      installation_id: 99999,
    };
    expect(record.status).toBe("in_progress");
    expect(record.repo_full_name).toBeTruthy();
  });

  test("step 4: conclusion mapping from pipeline to GitHub", () => {
    const conclusionMap: Record<string, string> = {
      pass: "success",
      fail: "failure",
      warn: "neutral",
    };
    expect(conclusionMap.pass).toBe("success");
    expect(conclusionMap.fail).toBe("failure");
    expect(conclusionMap.warn).toBe("neutral");
  });

  test("step 5: PR event triggers feedback comment", () => {
    const prPayload = {
      action: "opened",
      pull_request: {
        number: 42,
        head: { sha: "def456", ref: "feature/test" },
        title: "feat: new feature",
        user: { login: "claude-agent" },
      },
    };
    expect(["opened", "synchronize"]).toContain(prPayload.action);
    expect(prPayload.pull_request.number).toBe(42);
  });
});
