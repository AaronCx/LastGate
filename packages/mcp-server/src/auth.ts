export function validateApiKey(apiKey: string | undefined): { valid: boolean; error?: string } {
  if (!apiKey) {
    return { valid: false, error: "LASTGATE_API_KEY environment variable is required" };
  }

  if (!apiKey.startsWith("lg_cli_") && !apiKey.startsWith("lg_")) {
    return { valid: false, error: "Invalid API key format — must start with 'lg_cli_' or 'lg_'" };
  }

  if (apiKey.length < 20) {
    return { valid: false, error: "API key is too short" };
  }

  return { valid: true };
}
