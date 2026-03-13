import type { NotificationPayload } from "./types";

export function buildSlackMessage(payload: NotificationPayload, mention?: string | null) {
  const statusEmoji = payload.status === "failed" ? "\u274c" : payload.status === "warned" ? "\u26a0\ufe0f" : "\u2705";
  const statusText = payload.status === "failed" ? "Check Failed" : payload.status === "warned" ? "Check Warnings" : "All Checks Passed";
  const shortSha = payload.commitSha.slice(0, 7);

  const blocks: any[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `${statusEmoji} LastGate: ${statusText}` },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Repo:*\n<${payload.githubUrl}|${payload.repoFullName}>` },
        { type: "mrkdwn", text: `*Commit:*\n<${payload.githubUrl}/commit/${payload.commitSha}|\`${shortSha}\`>` },
        { type: "mrkdwn", text: `*Branch:*\n${payload.branch}` },
        { type: "mrkdwn", text: `*Failures:*\n${payload.failures.length} failed, ${payload.warnings.length} warning${payload.warnings.length !== 1 ? "s" : ""}` },
      ],
    },
  ];

  // Add failure details
  if (payload.failures.length > 0) {
    const failureText = payload.failures
      .map((f) => `\u2022 *${f.checkType.toUpperCase()}* \u2014 ${f.summary}`)
      .join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: failureText },
    });
  }

  // Add mention if configured
  if (mention && payload.status === "failed") {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `${mention} Critical failure requires attention` },
    });
  }

  // Action buttons
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "View in LastGate" },
        url: payload.dashboardUrl,
      },
      {
        type: "button",
        text: { type: "plain_text", text: "View on GitHub" },
        url: `${payload.githubUrl}/commit/${payload.commitSha}`,
      },
    ],
  });

  return { blocks };
}

export async function sendSlackNotification(webhookUrl: string, message: any): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    return response.ok;
  } catch {
    return false;
  }
}
