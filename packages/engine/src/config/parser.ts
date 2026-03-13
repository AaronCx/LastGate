import YAML from "yaml";
import type { PipelineConfig } from "../types";
import { getDefaultConfig } from "./defaults";
import { validateConfig } from "./schema";

function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>,
): T {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = (target as Record<string, unknown>)[key];

    if (
      sourceVal !== undefined &&
      sourceVal !== null &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === "object" &&
      targetVal !== null &&
      !Array.isArray(targetVal)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else if (sourceVal !== undefined) {
      (result as Record<string, unknown>)[key] = sourceVal;
    }
  }

  return result;
}

export function parseConfig(yaml: string): PipelineConfig {
  const raw = YAML.parse(yaml);

  if (!raw || typeof raw !== "object") {
    return getDefaultConfig();
  }

  // Validate the parsed YAML against the schema
  const validated = validateConfig(raw);

  // Merge with defaults so any unspecified values get default behavior
  const defaults = getDefaultConfig();
  return deepMerge(
    defaults as unknown as Record<string, unknown>,
    validated as unknown as Record<string, unknown>,
  ) as PipelineConfig;
}
