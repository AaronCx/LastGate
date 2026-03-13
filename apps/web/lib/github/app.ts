import { Octokit } from "octokit";

let cachedAppOctokit: Octokit | null = null;

export function getAppOctokit(): Octokit {
  if (cachedAppOctokit) return cachedAppOctokit;

  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error(
      "Missing GitHub App credentials: GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY are required"
    );
  }

  cachedAppOctokit = new Octokit({
    authStrategy: undefined, // Will be configured per-installation
    auth: {
      appId,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    },
  });

  return cachedAppOctokit;
}

export async function getInstallationOctokit(
  installationId: number
): Promise<Octokit> {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error(
      "Missing GitHub App credentials: GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY are required"
    );
  }

  // Create an installation-scoped token
  // In production, use @octokit/app createAppAuth for proper JWT-based auth
  const octokit = new Octokit({
    auth: process.env.GITHUB_APP_INSTALLATION_TOKEN, // Placeholder
  });

  return octokit;
}
