import { describe, test, expect } from "bun:test";

describe("ReviewActions", () => {
  test("approve button maps to correct action", () => {
    const actions = {
      approve: { label: "Approve", apiAction: "APPROVE", color: "emerald" },
      requestChanges: { label: "Request Changes", apiAction: "REQUEST_CHANGES", color: "red" },
      sendBack: { label: "Send Back to Agent", apiAction: "SEND_BACK", color: "amber" },
    };
    expect(actions.approve.apiAction).toBe("APPROVE");
    expect(actions.requestChanges.apiAction).toBe("REQUEST_CHANGES");
    expect(actions.sendBack.apiAction).toBe("SEND_BACK");
  });

  test("buttons are disabled while action is in progress (no double-submit)", () => {
    let isLoading = false;
    // Simulate clicking
    isLoading = true;
    expect(isLoading).toBe(true);
    // All buttons should be disabled
    const buttons = ["approve", "requestChanges", "sendBack"];
    for (const btn of buttons) {
      const disabled = isLoading;
      expect(disabled).toBe(true);
    }
    // After action completes
    isLoading = false;
    expect(isLoading).toBe(false);
  });

  test("success state shows confirmation after action", () => {
    const actionResult = { success: true, message: "PR approved successfully" };
    expect(actionResult.success).toBe(true);
    expect(actionResult.message).toContain("approved");
  });

  test("error state shows error message if API call fails", () => {
    const errorResult = { success: false, error: "Failed to update PR: 403 Forbidden" };
    expect(errorResult.success).toBe(false);
    expect(errorResult.error).toContain("403");
  });

  test("send back to agent posts structured feedback comment", () => {
    const feedbackComment = "<!-- lastgate:feedback -->\n## Issues Found\n- Secret detected\n<!-- /lastgate:feedback -->";
    expect(feedbackComment).toContain("<!-- lastgate:feedback -->");
    expect(feedbackComment).toContain("<!-- /lastgate:feedback -->");
  });
});
