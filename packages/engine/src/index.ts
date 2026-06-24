export { runCheckPipeline, runChecksIterable, runSingleCheck, resolveMeta, formatMetaFooter } from "./pipeline";
export { ENGINE_VERSION } from "./version";
export { parseConfig } from "./config/parser";
export { getDefaultConfig } from "./config/defaults";
export { resolveExtends } from "./config/extends";
export {
  parsePackRef,
  resolveBuiltinPack,
  BUILTIN_PACK_NAMES,
} from "./config/packs";
export type { PolicyPack, PackRef, PackResolver } from "./config/packs";
export { parseAddedLines } from "./diff/parse";
export { statusFromFindings } from "./checks/status";
export { checkSemantic } from "./checks/semantic";
export type { SemanticReviewCall, SemanticContext, SemanticFinding } from "./checks/semantic";
export {
  isPathAllowed,
  isLineIgnored,
  fingerprint,
  loadBaseline,
  writeBaseline,
  DEFAULT_BASELINE_PATH,
} from "./config/allowlist";
export type {
  CheckResult,
  CheckRunResults,
  CheckRunMeta,
  PipelineConfig,
  ChangedFile,
  CommitInfo,
  CheckStatus,
  CheckType,
  Annotation,
  AddedLine,
  Finding,
  FindingSeverity,
  SemanticCheckConfig,
} from "./types";
export type { PipelineInput } from "./pipeline";

// AI fix-suggestion pipeline (opt-in; the caller injects the LLM call).
export { generateFixSuggestions, getSurroundingLines } from "./ai/suggest-fix";
export { estimateCost, isKnownModel, isWithinBudget, estimateTokenCount } from "./ai/cost";
export { clearCache, getCacheSize, getCacheKey } from "./ai/cache";
export type {
  FixSuggestion,
  FixSuggestionRequest,
  AiSuggestionsConfig,
  AiUsageRecord,
} from "./ai/types";
