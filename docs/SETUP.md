# Local Development Setup

This guide walks through setting up LastGate for local development from scratch.

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| [Bun](https://bun.sh) | 1.1+ | Runtime, package manager, test runner |
| [Node.js](https://nodejs.org) | 22+ | Required for some Next.js tooling |
| [Git](https://git-scm.com) | 2.40+ | Version control |
| [Supabase CLI](https://supabase.com/docs/guides/cli) | Latest | Local database and migrations |

You will also need accounts on:
- [Supabase](https://supabase.com) (free tier is fine)
- [GitHub](https://github.com) (for GitHub App creation)

---

## 1. Clone and Install

```bash
git clone https://github.com/AaronCx/LastGate.git
cd LastGate
bun install
```

---

## 2. Supabase Setup

### Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Choose a name (e.g., `lastgate-dev`) and set a database password.
3. Wait for the project to finish provisioning.

### Run database migrations

```bash
# Link your local repo to the Supabase project
bunx supabase link --project-ref <your-project-ref>

# Push migrations to the remote database
bunx supabase db push
```

Alternatively, to run locally with Docker:

```bash
bunx supabase start
bunx supabase db reset
```

### Get your keys

From the Supabase dashboard, go to **Settings > API** and copy:

- **Project URL** (e.g., `https://xxxx.supabase.co`)
- **Anon (public) key**
- **Service role key** (keep this secret)

---

## 3. GitHub App Setup

LastGate uses a GitHub App to receive webhooks and interact with the Checks API.

### Create the GitHub App

1. Go to **GitHub > Settings > Developer settings > GitHub Apps > New GitHub App**.

2. Fill in the form:

   | Field | Value |
   |---|---|
   | App name | `LastGate Dev` (must be unique on GitHub) |
   | Homepage URL | `http://localhost:3000` |
   | Webhook URL | Your public URL (use smee.io or ngrok for local dev) |
   | Webhook secret | Generate a strong random string |

3. Set **permissions**:

   | Permission | Access |
   |---|---|
   | Checks | Read & Write |
   | Contents | Read-only |
   | Metadata | Read-only |
   | Pull requests | Read & Write |
   | Commit statuses | Read & Write |

4. Subscribe to **events**:
   - `push`
   - `pull_request`
   - `check_suite`
   - `check_run`

5. Click **Create GitHub App**.

### Generate a private key

1. On the app settings page, scroll to **Private keys**.
2. Click **Generate a private key** — a `.pem` file will download.
3. Move it to the project root:
   ```bash
   mv ~/Downloads/lastgate-dev.*.pem ./github-app.pem
   ```

### Install the app

1. Go to the app's public page and click **Install**.
2. Choose the repositories you want to test with.
3. Note the **Installation ID** from the URL after installing (e.g., `https://github.com/settings/installations/12345678` — the ID is `12345678`).

### Set up a webhook proxy (for local development)

Since GitHub can't reach `localhost`, use [smee.io](https://smee.io):

```bash
# Install the smee client
bun install -g smee-client

# Create a channel at https://smee.io/new, then run:
smee -u https://smee.io/YOUR_CHANNEL_ID -t http://localhost:3000/api/webhook
```

Use your smee.io URL as the **Webhook URL** in the GitHub App settings.

---

## 4. Environment Variables

Create `apps/web/.env.local` with the following:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# GitHub App
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Optional: Demo mode (no real GitHub/Supabase calls)
DEMO_MODE=false
```

### Variable Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `GITHUB_APP_ID` | Yes | Your GitHub App's numeric ID |
| `GITHUB_APP_PRIVATE_KEY` | Yes | Contents of the `.pem` private key file (newlines as `\n`) |
| `GITHUB_WEBHOOK_SECRET` | Yes | Secret string for webhook signature verification |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of the app (for OAuth callbacks, etc.) |
| `NODE_ENV` | No | `development` or `production` (defaults to `development`) |
| `DEMO_MODE` | No | Set to `true` to run with mock data (no external calls) |

---

## 5. Running Locally

```bash
# Start the development server
bun run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Other commands

```bash
# Run all tests
bun test

# Run tests in watch mode
bun run test:watch

# Lint the codebase
bun run lint

# Type-check without emitting
bun run typecheck

# Build for production
bun run build

# Run the CLI locally
bun run cli -- check
```

---

## 6. Running Tests

```bash
# Full test suite
bun test

# Engine checks only
bun test packages/engine/

# Web app tests only
bun test apps/web/

# Single test file
bun test packages/engine/checks/secrets.test.ts

# Watch mode
bun run test:watch
```

### Test structure

- Unit tests live next to their source files (`*.test.ts`)
- Integration tests are in `packages/engine/__tests__/`
- Fixture files (sample diffs, configs) are in `packages/engine/fixtures/`

---

## Troubleshooting

### Webhook events not arriving

- Verify the smee client is running and forwarding to `http://localhost:3000/api/webhook`
- Check the GitHub App's **Advanced** tab for recent deliveries and response codes
- Ensure the webhook secret matches between GitHub and `.env.local`

### Supabase connection errors

- If using the hosted Supabase, check that your project is not paused (free tier pauses after inactivity)
- If using local Supabase, ensure Docker is running and run `bunx supabase start`

### GitHub App authentication errors

- Verify the App ID is correct
- Ensure the private key is properly formatted in `.env.local` (newlines as `\n`)
- Check that the app is installed on the repository you're testing with

### Build failures

- Run `bun install` to ensure all dependencies are up to date
- Check that you're using Bun 1.1+ and Node.js 22+
- Clear the Next.js cache: `rm -rf apps/web/.next`
