# LastGate — GitHub Marketplace listing

This directory holds the artifacts needed to publish **LastGate** as a GitHub
App on the GitHub Marketplace. Everything here is generated/authored in-repo; the
final listing submission is a human step in the GitHub UI (see below).

## Files

| File | Purpose |
|---|---|
| `app-manifest.json` | GitHub App **manifest** — the machine-readable definition (name, webhook URL, permissions, events, setup/callback URLs). Used by the [App-manifest creation flow](https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest) to register the App in one round-trip instead of filling the form by hand. |
| `listing.json` | **Marketplace listing** metadata — tagline, categories, descriptions, and the three pricing plans (Free / Team / Enterprise). These fields map 1:1 to the Marketplace listing editor. |
| `README.md` | This file — the listing's detailed description copy and the submission runbook. |

## What the App actually does (accurate to this codebase)

LastGate receives `push` and `pull_request` webhooks
(`apps/web/app/api/webhooks/github/route.ts`), reads `.lastgate.yml` from the
repo under review, runs the `@lastgate/engine` check pipeline, and writes the
result back via the **Checks API** plus a structured PR comment. The permissions
in `app-manifest.json` are exactly what these code paths require:

- **Checks: write** — create/update the check run (`lib/github/checks.ts`).
- **Contents: read** — fetch `.lastgate.yml` and changed file contents.
- **Metadata: read** — required baseline for every App.
- **Pull requests: write** — post the structured review comment.
- **Commit statuses: write** — set the commit status / direct-push warning.

Events subscribed match `default_events`: `push`, `pull_request`,
`check_suite`, `check_run`. The webhook currently acts on `push` and
`pull_request`; `check_suite`/`check_run` are subscribed so re-run requests from
the Checks UI can be wired up without changing App permissions later.

## Policy packs (the 60-second adoption story)

A repo adopts a curated policy in one line of `.lastgate.yml`:

```yaml
extends: "@lastgate/agent-safety@1"
```

Built-in packs ship inside the engine (`packages/engine/src/config/packs/`):

- `@lastgate/agent-safety` — hardened defaults for repos where AI agents open
  PRs: strict secrets, agent-pattern detection as a failure, dangerous-file
  blocks, and semantic review in warn mode.
- `@lastgate/secrets-strict` — maximum-sensitivity secret scanning (low entropy
  threshold, entropy findings treated as critical, key/credential files blocked).
- `@lastgate/solo-dev` — lenient: only real secret leaks block, everything else
  warns, build verification off.

## Human submission runbook

Building the manifest is done; **publishing the listing is a manual step** that
requires an authenticated human in the GitHub UI. To list LastGate:

1. **Register the App from the manifest.** Either paste `app-manifest.json` into
   the [manifest creation flow](https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest)
   under the publishing org, or create the App manually using these exact
   permissions/events. Confirm the production `url`, `hook_attributes.url`,
   `setup_url`, and `callback_urls` match the live deployment domain.
2. **Generate and store the private key + webhook secret.** Put `GITHUB_APP_ID`,
   the `.pem`, and `GITHUB_WEBHOOK_SECRET` into the deployment environment (see
   `docs/SETUP.md`).
3. **Make the App public** and verify at least one test installation runs a check
   end-to-end on a real PR.
4. **Open the Marketplace listing.** App settings → *Marketplace* → *List this
   app*. Fill the editor from `listing.json`: tagline, categories, descriptions,
   and the three pricing plans.
5. **Add the listing logo and screenshots** (Marketplace requires a logo plus
   1–5 screenshots — use the dashboard check-run and PR-comment views).
6. **Complete the seller agreement / verification.** Marketplace requires the
   publishing org to accept the Marketplace Developer Agreement and, for paid
   plans, complete financial onboarding.
7. **Submit for review.** GitHub manually reviews every Marketplace listing
   before it goes live.

Steps 1–7 are all human/account actions in GitHub — they cannot be automated
from code. This directory provides everything those steps consume.
