import YAML from "yaml";
import type { PipelineConfig } from "../types";
import { getDefaultConfig } from "./defaults";
import { validateConfig } from "./schema";
import { deepMerge } from "./merge";
import { resolveExtends } from "./extends";

export function parseConfig(yaml: string): PipelineConfig {
  const raw = YAML.parse(yaml);

  if (!raw || typeof raw !== "object") {
    return getDefaultConfig();
  }

  const rawObj = raw as Record<string, unknown>;

  // 1. Resolve any `extends:` packs into a single merged base config. Built-in
  //    packs resolve offline; circular / unknown packs throw with a clear
  //    message. The `extends` key itself is not part of the schema, so strip it
  //    before validating the local layer below.
  const packBase = resolveExtends(rawObj);
  const { extends: _extends, ...localRaw } = rawObj;

  // 2. Validate the local file on its own so per-field errors point at the
  //    user's YAML, not the merged blob. Pack configs are authored against the
  //    same shapes and validated transitively via the final merged result.
  const validatedLocal = validateConfig(localRaw);

  // 3. Layer in merge order: defaults (bottom) -> packs -> local file (top).
  const defaults = getDefaultConfig() as unknown as Record<string, unknown>;
  const withPacks = deepMerge(defaults, packBase);
  const merged = deepMerge(
    withPacks,
    validatedLocal as unknown as Record<string, unknown>,
  );

  // 4. Validate the fully merged result so a pack can never produce an invalid
  //    PipelineConfig (e.g. an out-of-range entropy threshold).
  return validateConfig(merged);
}
