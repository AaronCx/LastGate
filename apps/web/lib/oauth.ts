/** Cookie holding the one-time OAuth CSRF state nonce (set by the start route,
 * verified by the token-exchange route). Lives here, not in a route file, because
 * Next.js only allows route handlers to be exported from route.ts. */
export const OAUTH_STATE_COOKIE = "lastgate_oauth_state";
