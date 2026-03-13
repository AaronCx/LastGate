import { createHash } from "crypto";
import type { FixSuggestion } from "./types";

// In-memory suggestion cache
const cache = new Map<string, FixSuggestion>();

export function getCacheKey(checkType: string, file: string, message: string): string {
  const hash = createHash("sha256")
    .update(`${checkType}:${file}:${message}`)
    .digest("hex")
    .slice(0, 16);
  return hash;
}

export function getCachedSuggestion(key: string): FixSuggestion | null {
  return cache.get(key) || null;
}

export function cacheSuggestion(key: string, suggestion: FixSuggestion): void {
  cache.set(key, suggestion);
}

export function clearCache(): void {
  cache.clear();
}

export function getCacheSize(): number {
  return cache.size;
}
