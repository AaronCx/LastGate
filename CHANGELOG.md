# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-13

### Added
- Initial release
- GitHub App webhook integration (push, pull_request, check_suite events)
- Check engine with 8 check types: secrets, duplicates, lint, build, dependencies, file patterns, commit message, agent patterns
- Secret scanner with 20+ regex patterns and Shannon entropy detection
- Next.js dashboard with overview, repo detail, PR review, agent activity, and settings pages
- CLI tool (`lastgate check`, `lastgate init`, `lastgate login`, `lastgate history`)
- `.lastgate.yml` configuration file support
- Agent feedback system (structured PR comments for AI agent self-correction)
- Supabase database schema with RLS policies
- GitHub Actions CI/CD workflows
- Demo mode for portfolio viewing
