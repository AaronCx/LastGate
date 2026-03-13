import type { NotificationPayload } from "./types";

const STATUS_COLORS: Record<string, number> = {
  failed: 15548997,  // #ed4245 red
  warned: 16776960,  // #ffff00 yellow
  passed: 5763719,   // #57f287 green
};

export function buildDiscordEmbed(payload: NotificationPayload, mention?: string | null) {
  const statusText = payload.status === "failed" ? "Check Failed" : payload.status === "warned" ? "Check Warnings" : "All Checks Passed";
  const statusEmoji = payload.status === "failed" ? "\u274c" : payload.status === "warned" ? "\u26a0\ufe0f" : "\u2705";
  const shortSha = payload.commitSha.slice(0, 7);

  const fields = [
    { name: "Repo", value: `[${payload.repoFullName}](${payload.githubUrl})`, inline: true },
    { name: "Commit", value: `[\`${shortSha}\`](${payload.githubUrl}/commit/${payload.commitSha})`, inline: true },
    { name: "Branch", value: payload.branch, inline: true },
  ];

  if (payload.failures.length > 0) {
    const failureText = payload.failures
      .map((f) => `**${f.checkType.toUpperCase()}** \u2014 ${f.summary}`)
      .join("\n");
    fields.push({ name: "Failures", value: failureText, inline: false });
  }

  if (payload.warnings.length > 0) {
    const warnText = payload.warnings
      .map((w) => `**${w.checkType.toUpperCase()}** \u2014 ${w.summary}`)
      .join("\n");
    fields.push({ name: "Warnings", value: warnText, inline: false });
  }

  const embed: any = {
    embeds: [{
      title: `${statusEmoji} LastGate: ${statusText}`,
      color: STATUS_COLORS[payload.status] || STATUS_COLORS.passed,
      fields,
      timestamp: new Date().toISOString(),
      footer: { text: "LastGate Pre-flight Check" },
    }],
  };

  if (mention && payload.status === "failed") {
    embed.content = `${mention} Critical failure requires attention`;
  }

  return embed;
}

export async function sendDiscordNotification(webhookUrl: string, message: any): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    return response.ok || response.status === 204;
  } catch {
    return false;
  }
}
