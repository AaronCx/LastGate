# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-03-15

### Added
- **Dashboard redesign** — Full dark theme with Tremor components replacing custom Recharts
- **Design system** — Deep midnight palette, violet accent, JetBrains Mono + Plus Jakarta Sans fonts
- **KPI cards** — Tremor SparkAreaChart sparklines with BadgeDelta change indicators
- **Check Volume chart** — Stacked AreaChart showing pass/fail/warn trends over time
- **Failure Breakdown** — Interactive DonutChart with BarList detail view
- **Repo Health tracker** — Tremor Tracker with colored segments per check run and hover tooltips
- **Live Activity feed** — Staggered fade-in animations, live pulse indicator, clickable rows
- **PassRateTrend** — Interactive area chart with metric toggle (Pass Rate %, Check Count, Failures)
- **Failure Heatmap** — GitHub contribution-style 90-day calendar grid with red intensity scale
- **Agent Reliability** — ProgressCircle scorecards with SparkBarChart per agent
- **Check detail status pills** — Horizontal check-type pills replacing sidebar list
- **Skeleton loading states** — Pulse animations matching layout shape (no spinners)
- **Micro-animations** — `pulse-live`, `count-up`, `fade-in-up` keyframes

### Changed
- **Next.js 14 → 15** — Upgraded to 15.5.12 to resolve two Dependabot security alerts (HTTP deserialization DoS, Image Optimizer DoS)
- **React 18 → 19** — Required by Next.js 15
- **Dashboard layout** — Dark sidebar with violet accent active states, backdrop-blur top bar
- **All analytics components** — Replaced recharts with Tremor (AreaChart, BarChart, DonutChart, BarList, ProgressCircle, SparkBarChart, Tracker)
- **Color scheme** — Light gray → deep midnight dark theme across all dashboard pages

## [0.2.0] - 2026-03-15

### Added
- **Rich detail in all outputs** — Check findings now include file, line, pattern, rule, and severity across dashboard, PR comments, and CLI
- **Automatic PR comments** — Every check run posts/updates a detailed PR comment with findings table and agent instructions (no manual trigger needed)
- **Deploy blocking (3 layers)** — Branch protection auto-configured on repo connect, correct Checks API conclusions, direct push alerts on protected branches
- **Branch protection helper** — `configureBranchProtection()` adds LastGate as required status check via GitHub API
- **Direct push alerts** — Warning comments posted on commits pushed directly to protected branches with failures
- **Notification dispatcher** — Urgent alert stub for future Slack/Discord integration
- **Tree-style CLI output** — Findings shown inline under each check with `├─`/`└─` tree branches, file:line locations, and actionable fix summaries
- **PR comment builder** — Check-type-specific rendering (secrets table, lint table, commit message format help, build output)
- **Agent feedback always on** — Structured `<!-- lastgate:feedback -->` section appended to every PR comment automatically
- **Branch protection indicators** — Dashboard repo cards show protection status with enable button

### Changed
- **Check run name** — Renamed from "LastGate Check Pipeline" to "LastGate Pre-flight Check" (matches branch protection context name)
- **Lint check** — Now extracts rule names from linter output and populates `findings` field in standard format
- **Build check** — Pass/fail results now include `output` field for richer reporting
- **File patterns check** — Findings now include human-readable `message` field and `checked` patterns list
- **Dependencies check** — Results now include `findings` alias for standard rendering
- **Commit message check** — Results now include `received` field showing the actual commit message
- **CLI formatter** — Complete rewrite with tree-style output, per-finding detail, and actionable summary section

### Removed
- **"Send Back to Agent" button** — Removed from ReviewActions component; feedback is now automatic
- **`agent_feedback.enabled` config** — Removed toggle; agent feedback is always on
- **`send-back` API action** — Removed from valid review actions

## [0.1.0] - 2026-03-13

### Added
- Initial release
- GitHub App webhook integration (push, pull_request events)
- Check engine with 8 check types: secrets, duplicates, lint, build, dependencies, file patterns, commit message, agent patterns
- Secret scanner with 20+ regex patterns and Shannon entropy detection
- Next.js dashboard with overview, repo detail, PR review, agent activity, and settings pages
- CLI tool (`lastgate check`, `lastgate init`, `lastgate login`, `lastgate history`)
- `.lastgate.yml` configuration file support with Zod validation
- Supabase database schema with RLS policies
- GitHub Actions CI/CD workflows (CI + npm publish on tag)
- MCP server for AI agent integration
- SDK package for custom check authoring
- Demo mode for unauthenticated dashboard viewing
- Comprehensive test suite (1247 tests across 112 files)
