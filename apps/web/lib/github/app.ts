import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";

function getAppCredentials() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error(
      "Missing GitHub App credentials: GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY are required"
    );
  }

  return { appId, privateKey: privateKey.replace(/\\n/g, "\n") };
}

let cachedAppOctokit: Octokit | null = null;

export function getAppOctokit(): Octokit {
  if (cachedAppOctokit) return cachedAppOctokit;

  const { appId, privateKey } = getAppCredentials();

  cachedAppOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
    },
  });

  return cachedAppOctokit;
}

export async function getInstallationOctokit(
  installationId: number
): Promise<Octokit> {
  const { appId, privateKey } = getAppCredentials();

  // Use JWT-based auth to obtain a scoped installation access token
  const auth = createAppAuth({
    appId,
    privateKey,
  });

  const installationAuth = await auth({
    type: "installation",
    installationId,
  });

  const octokit = new Octokit({
    auth: installationAuth.token,
  });

  return octokit;
}
