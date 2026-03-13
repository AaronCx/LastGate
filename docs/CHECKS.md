# Check Types

LastGate runs a pipeline of safety checks against every push and pull request. This document describes each check type in detail: what it detects, how it works, configuration options, and example findings.

---

## Table of Contents

- [Secret Scanner](#-secret-scanner)
- [Duplicate Detector](#-duplicate-detector)
- [Lint & Type Check](#-lint--type-check)
- [Build Verifier](#-build-verifier)
- [Dependency Auditor](#-dependency-auditor)
- [File Pattern Guard](#-file-pattern-guard)
- [Commit Message Validator](#-commit-message-validator)
- [Agent Pattern Analysis](#-agent-pattern-analysis)

---

## 🔐 Secret Scanner

**Check ID:** `secrets`
**Default Severity:** `error`

### Description

Scans added and modified lines in the diff for hardcoded secrets, API keys, tokens, passwords, and other credentials. Uses both regex pattern matching and Shannon entropy detection.

### What It Detects

Hardcoded credentials that should be stored in environment variables, secret managers, or vaults. This check runs against the diff only (added/modified lines), not the entire file.

### Regex Patterns

The scanner includes 20+ built-in patterns:

| Pattern | Description | Example Match |
|---|---|---|
| AWS Access Key | AWS IAM access key IDs | `AKIA1234567890ABCDEF` |
| AWS Secret Key | AWS secret access keys | `aws_secret_access_key = "wJalrX..."` |
| GitHub Token | GitHub personal access tokens | `ghp_1234567890abcdefghijklmnopqrstuv` |
| GitHub OAuth | GitHub OAuth app secrets | `gho_abcdefghijklmnop1234567890` |
| GitLab Token | GitLab personal/project tokens | `glpat-xxxxxxxxxxxxxxxxxxxx` |
| Slack Token | Slack bot and user tokens | `xoxb-1234-5678-abcdefgh` |
| Slack Webhook | Slack incoming webhook URLs | `https://hooks.slack.com/services/T.../B.../...` |
| Stripe Key | Stripe publishable and secret keys | `sk_live_1234567890abcdef` |
| Twilio | Twilio account SIDs and auth tokens | `SK••••••••••••••••••••••••••••••••` |
| SendGrid | SendGrid API keys | `SG.xxxxxx.yyyyyy` |
| Google API Key | Google Cloud API keys | `AIza...` (39 characters) |
| Firebase | Firebase config values | `firebase_api_key = "..."` |
| JWT | JSON Web Tokens | `eyJhbGciOiJ...` (3 dot-separated base64 segments) |
| Private Key | PEM-encoded private keys | `-----BEGIN RSA PRIVATE KEY-----` |
| Generic Password | Password assignments in code | `password = "hunter2"` |
| Generic Secret | Secret/token assignments | `api_secret = "..."` |
| Generic API Key | API key assignments | `apiKey: "sk-proj-..."` |
| Database URL | Connection strings with credentials | `postgres://user:pass@host/db` |
| NPM Token | npm auth tokens | `//registry.npmjs.org/:_authToken=...` |
| Heroku API Key | Heroku API keys | `HEROKU_API_KEY=...` (UUID format) |
| OpenAI API Key | OpenAI keys | `sk-proj-...` |
| Anthropic API Key | Anthropic keys | `sk-ant-...` |

### Shannon Entropy Detection

In addition to regex patterns, the scanner computes [Shannon entropy](https://en.wikipedia.org/wiki/Entropy_(information_theory)) for string literals and assignments. Strings with entropy above a threshold (default: 4.5 for hex, 5.0 for base64) are flagged as potential secrets.

This catches secrets that don't match any known pattern but look like random credentials.

### Configuration

```yaml
checks:
  secrets:
    enabled: true
    severity: error
    allow:
      - "**/*.example"           # Ignore example/template files
      - "**/*.test.ts"           # Ignore test files
      - ".env.sample"
    entropy_threshold_hex: 4.5   # Shannon entropy threshold for hex strings
    entropy_threshold_b64: 5.0   # Shannon entropy threshold for base64 strings
    min_secret_length: 8         # Minimum string length to check
    custom_patterns:
      - name: "Internal Token"
        regex: "INTERNAL_[A-Z]+_TOKEN=['\"][^'\"]+['\"]"
        severity: error
```

### Example Finding

```
🔴 error | secrets | src/api/client.ts:14
   Hardcoded API key detected (pattern: AWS Access Key)
   Found: AKIA****CDEF
   Suggestion: Move this value to an environment variable (e.g., process.env.AWS_ACCESS_KEY_ID)
```

---

## 🔄 Duplicate Detector

**Check ID:** `duplicates`
**Default Severity:** `warning`

### Description

Detects copy-pasted code blocks and redundant logic within the diff. AI agents frequently duplicate existing code rather than extracting shared functions.

### What It Detects

- Identical or near-identical code blocks added in multiple locations
- Functions or components with the same structure but different names
- Repeated logic that should be extracted into a shared utility

### How It Works

1. Tokenizes all added lines in the diff
2. Uses a sliding window to identify repeated token sequences
3. Filters out common patterns (imports, type declarations) that naturally repeat
4. Groups duplicates by similarity and reports the largest/most impactful ones

### Configuration

```yaml
checks:
  duplicates:
    enabled: true
    severity: warning
    min_lines: 6              # Minimum number of lines for a duplicate block
    min_tokens: 50            # Minimum token count for a duplicate block
    similarity_threshold: 0.9 # 0.0-1.0, how similar blocks must be
    ignore_imports: true      # Ignore import/require statements
    ignore_types: true        # Ignore type/interface declarations
```

### Example Finding

```
🟡 warning | duplicates | src/utils/validate.ts:45, src/helpers/check.ts:12
   Duplicated code block (14 lines, 92% similarity)
   Suggestion: Extract shared logic into a common utility function
```

---

## 🧹 Lint & Type Check

**Check ID:** `lint`
**Default Severity:** `error`

### Description

Runs ESLint and the TypeScript compiler (`tsc --noEmit`) against files changed in the diff. Catches syntax errors, type mismatches, unused variables, and style violations.

### What It Detects

- TypeScript type errors (e.g., type mismatches, missing properties)
- ESLint rule violations
- Unused imports and variables
- Unreachable code
- Formatting issues (if Prettier is configured as an ESLint plugin)

### How It Works

1. Identifies all files changed in the diff
2. Runs `tsc --noEmit` to check for type errors in changed files
3. Runs ESLint on changed files with the project's ESLint config
4. Maps errors back to diff lines (only reports issues on added/modified lines)

### Configuration

```yaml
checks:
  lint:
    enabled: true
    severity: error
    config: .eslintrc.json     # Custom ESLint config path (auto-detected if omitted)
    tsconfig: tsconfig.json    # Custom tsconfig path (auto-detected if omitted)
    rules_override:            # Override specific ESLint rules for this check
      no-console: warn
      no-unused-vars: error
```

### Example Finding

```
🔴 error | lint | src/utils/parse.ts:27
   TypeScript error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
   Suggestion: Check the type signature of parseInput() — expected number, received string.
```

---

## 🏗️ Build Verifier

**Check ID:** `build`
**Default Severity:** `error`

### Description

Runs the project's build command to verify the codebase still compiles after changes. Catches missing imports, broken references, and configuration errors that type-checking alone might miss.

### What It Detects

- Build failures (non-zero exit code)
- Missing module imports
- Broken path aliases
- Next.js page/API route compilation errors
- CSS/asset processing failures

### How It Works

1. Clones the repository at the target commit
2. Installs dependencies
3. Runs the configured build command (default: `bun run build`)
4. Captures stdout/stderr and exit code
5. Parses error output for file-level annotations

### Configuration

```yaml
checks:
  build:
    enabled: true
    severity: error
    command: "bun run build"    # Custom build command
    timeout: 120000             # Build timeout in ms (default: 2 minutes)
    env:                        # Additional environment variables for the build
      NEXT_TELEMETRY_DISABLED: "1"
```

### Example Finding

```
🔴 error | build | —
   Build failed with exit code 1
   Error: Module not found: Can't resolve '@/lib/missing-module'
   Suggestion: Check that the import path is correct and the module exists.
```

---

## 📦 Dependency Auditor

**Check ID:** `dependencies`
**Default Severity:** `warning`

### Description

Checks newly added or updated dependencies for known security vulnerabilities (CVEs) and optionally validates licenses.

### What It Detects

- Dependencies with known CVEs (via advisory databases)
- Outdated dependencies with critical security patches available
- Dependencies using licenses that conflict with project policy
- Typosquatting attempts (packages with names similar to popular packages)

### How It Works

1. Compares `package.json` and lockfile changes in the diff
2. Identifies newly added or version-changed dependencies
3. Queries vulnerability databases for known CVEs
4. Checks license compatibility against the allowlist/blocklist

### Configuration

```yaml
checks:
  dependencies:
    enabled: true
    severity: warning
    block_licenses:              # Block specific licenses
      - GPL-3.0
      - AGPL-3.0
      - SSPL-1.0
    allow_licenses:              # If set, only these licenses are allowed
      - MIT
      - Apache-2.0
      - BSD-2-Clause
      - BSD-3-Clause
      - ISC
    ignore_advisories:           # Ignore specific CVE IDs
      - GHSA-xxxx-yyyy-zzzz
    check_dev_dependencies: true # Also audit devDependencies (default: true)
```

### Example Finding

```
🟡 warning | dependencies | package.json
   Vulnerability found in lodash@4.17.20: Prototype Pollution (CVE-2021-23337, severity: high)
   Suggestion: Upgrade to lodash@4.17.21 or later.
```

---

## 📁 File Pattern Guard

**Check ID:** `file_patterns`
**Default Severity:** `warning`

### Description

Enforces rules about which files can be added or modified. Prevents AI agents from creating files in unexpected locations, modifying protected files, or skipping required file patterns.

### What It Detects

- Files created in blocked locations (e.g., `.env`, credentials files)
- Modifications to protected files (e.g., lockfiles, CI configs)
- Missing required files (e.g., tests alongside source files)
- Files that violate naming conventions

### Configuration

```yaml
checks:
  file_patterns:
    enabled: true
    severity: warning
    blocked:                     # Files that should never be added/modified
      - "**/*.env"
      - "**/*.env.*"
      - "!**/*.env.example"      # Exception: .env.example is allowed
      - "**/credentials.*"
      - "**/.secret*"
      - "**/id_rsa*"
    protected:                   # Files that generate a warning if modified
      - "bun.lockb"
      - "package-lock.json"
      - ".github/workflows/**"
    required:                    # Patterns that must exist if related files are added
      - pattern: "src/**/*.ts"
        requires: "src/**/*.test.ts"   # Source files must have corresponding tests
    naming:                      # File naming conventions
      - pattern: "src/components/**"
        convention: "PascalCase"
      - pattern: "src/utils/**"
        convention: "camelCase"
```

### Example Finding

```
🟡 warning | file_patterns | .env.production
   Blocked file pattern matched: "**/*.env.*"
   This file type should not be committed to the repository.
   Suggestion: Add this file to .gitignore and use environment variables instead.
```

---

## 📝 Commit Message Validator

**Check ID:** `commit_message`
**Default Severity:** `warning`

### Description

Validates that commit messages follow the project's conventions. By default, enforces the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### What It Detects

- Commit messages that don't match the required format
- Missing type prefix (e.g., `feat:`, `fix:`, `docs:`)
- Subject lines that are too long
- Missing or malformed scope
- Generic/unhelpful messages (e.g., "fix", "update", "changes")

### Configuration

```yaml
checks:
  commit_message:
    enabled: true
    severity: warning
    pattern: "^(feat|fix|docs|style|refactor|test|chore)(\\(.+\\))?: .{1,72}$"
    max_subject_length: 72
    require_scope: false         # Require a scope in parentheses
    reject_generic:              # Reject these generic messages
      - "fix"
      - "update"
      - "changes"
      - "wip"
      - "temp"
      - "test"
      - "asdf"
```

### Example Finding

```
🟡 warning | commit_message | commit abc1234
   Commit message does not match conventional commit format.
   Message: "updated stuff"
   Expected format: <type>(<scope>): <description>
   Suggestion: Use a message like "fix(auth): resolve token refresh race condition"
```

---

## 🤖 Agent Pattern Analysis

**Check ID:** `agent_patterns`
**Default Severity:** `warning`

### Description

Analyzes commit history and diff patterns to detect behavioral anti-patterns commonly exhibited by AI coding agents. These patterns indicate the agent may be stuck, confused, or producing low-quality output.

### What It Detects

#### Thrashing

**Definition:** The same file is modified multiple times in rapid succession without meaningful progress. The agent is stuck in a loop, repeatedly trying and failing to fix an issue.

**Detection:** Counts how many times each file appears in the last N commits on the same branch/PR. If a file exceeds the threshold, it's flagged.

**Default threshold:** 3 modifications of the same file in the commit window.

#### Scope Creep

**Definition:** A single PR or commit batch touches an unusually large number of files, suggesting the agent has gone off-track and is making unrelated changes.

**Detection:** Counts the total number of files changed in the PR or push. If it exceeds the threshold, it's flagged.

**Default threshold:** 10 files changed.

#### Config Churn

**Definition:** Configuration files (`tsconfig.json`, `package.json`, ESLint configs, etc.) are repeatedly modified. This often indicates the agent is trying to work around a problem by changing project settings rather than fixing the root cause.

**Detection:** Tracks modifications to known config file patterns across recent commits. Flags when config files are modified more than the threshold.

**Config file patterns:**
- `tsconfig*.json`
- `package.json`
- `.eslintrc*`
- `next.config.*`
- `tailwind.config.*`
- `postcss.config.*`
- `*.config.{js,ts,mjs,cjs}`
- `.env*`

**Default threshold:** 2 config file modifications in the commit window.

#### Test Skipping

**Definition:** The agent adds or modifies source code without adding or updating corresponding test files. This suggests the agent is ignoring the project's testing requirements.

**Detection:** Compares added/modified source files against added/modified test files. If source files are changed without corresponding test changes, it's flagged.

**Test file patterns:**
- `*.test.ts` / `*.test.tsx`
- `*.spec.ts` / `*.spec.tsx`
- `__tests__/**`

### Configuration

```yaml
checks:
  agent_patterns:
    enabled: true
    severity: warning
    thrash_threshold: 3          # Flag if same file changed N+ times
    scope_creep_files: 10        # Flag if PR touches more than N files
    config_churn_threshold: 2    # Flag if config files changed N+ times
    require_tests: true          # Flag source changes without test changes
    commit_window: 10            # Number of recent commits to analyze
    config_patterns:             # Additional config file patterns to monitor
      - "*.config.*"
      - ".env*"
```

### Example Findings

```
🟡 warning | agent_patterns | —
   Thrashing detected: src/lib/auth.ts modified 5 times in the last 8 commits.
   The agent may be stuck in a loop trying to fix this file.
   Suggestion: Step back and reassess the approach. Consider reverting to a known good state.

🟡 warning | agent_patterns | —
   Scope creep detected: This PR touches 23 files across 8 directories.
   Suggestion: Break this into smaller, focused PRs that each address a single concern.

🟡 warning | agent_patterns | —
   Config churn detected: tsconfig.json modified 3 times in the last 6 commits.
   The agent may be modifying config to work around a code issue.
   Suggestion: Fix the underlying code issue instead of changing project configuration.

🟡 warning | agent_patterns | —
   Test skipping detected: 4 source files added/modified without corresponding test files.
   Files missing tests: src/lib/auth.ts, src/utils/parse.ts, src/api/webhook.ts, src/checks/run.ts
   Suggestion: Add test files for each modified source file.
```
