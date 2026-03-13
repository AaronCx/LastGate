# Contributing to LastGate

Thanks for your interest in contributing to LastGate! This document covers everything you need to get started.

---

## Prerequisites

Before you begin, make sure you have the following installed:

- **[Bun](https://bun.sh)** v1.1 or later (primary runtime and package manager)
- **[Node.js](https://nodejs.org)** v22 or later (required for some tooling)
- **[Supabase](https://supabase.com)** account (free tier works for development)
- **[GitHub](https://github.com)** account (required for GitHub App testing)
- **Git** v2.40 or later

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/AaronCx/LastGate.git
cd LastGate
```

### 2. Install dependencies

```bash
bun install
```

This installs dependencies for all workspaces (web app, engine, CLI).

### 3. Set up environment variables

```bash
cp apps/web/.env.example apps/web/.env.local
```

Fill in the required values — see [docs/SETUP.md](docs/SETUP.md) for a full guide on configuring Supabase and GitHub App credentials.

### 4. Start the development server

```bash
bun run dev
```

This starts the Next.js development server on `http://localhost:3000`.

---

## Project Structure

```
LastGate/
├── apps/
│   └── web/                   # Next.js 14 web application
│       ├── app/               # App Router pages and API routes
│       ├── components/        # React components
│       ├── lib/               # Shared utilities, Supabase client, GitHub helpers
│       └── public/            # Static assets
├── packages/
│   ├── engine/                # Core check engine
│   │   ├── checks/            # Individual check implementations
│   │   ├── pipeline/          # Check pipeline orchestration
│   │   └── types/             # Shared TypeScript types
│   └── cli/                   # CLI tool
│       ├── commands/          # CLI command implementations
│       └── utils/             # CLI utilities
├── docs/                      # Documentation
├── supabase/                  # Database migrations and seed data
└── .github/                   # GitHub Actions workflows
```

---

## Development Workflow

### Running the full stack locally

```bash
# Start the Next.js dev server
bun run dev

# In another terminal, run the check engine tests in watch mode
bun run test:watch

# Run the CLI locally
bun run cli -- check
```

### Running specific packages

```bash
# Web app only
bun run --filter web dev

# Engine tests only
bun run --filter engine test

# CLI only
bun run --filter cli build
```

---

## Testing

We use Bun's built-in test runner.

```bash
# Run all tests
bun test

# Run tests for a specific package
bun test --filter engine

# Run tests in watch mode
bun run test:watch

# Run a specific test file
bun test packages/engine/checks/secrets.test.ts
```

### Writing tests

- Place test files alongside the source file they test: `foo.ts` -> `foo.test.ts`
- Use descriptive test names that explain the expected behavior
- Cover both positive cases (finding issues) and negative cases (clean code)
- For check engine tests, use fixture files in `packages/engine/fixtures/`

---

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/). All commit messages must follow this format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Code style changes (formatting, semicolons, etc.) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, or dependency changes |

### Scopes

Use the package or area name: `web`, `engine`, `cli`, `ci`, `docs`.

### Examples

```
feat(engine): add Shannon entropy detection to secret scanner
fix(web): resolve dashboard crash on empty repo list
docs: update SETUP.md with Supabase migration steps
test(engine): add edge case tests for duplicate detector
chore(ci): upgrade GitHub Actions to Node 22
```

---

## Pull Request Process

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** and ensure:
   - All tests pass (`bun test`)
   - Linting passes (`bun run lint`)
   - TypeScript compiles (`bun run typecheck`)
   - The project builds (`bun run build`)

3. **Commit your changes** following the commit conventions above.

4. **Open a pull request** against `main` with:
   - A clear title following conventional commit format
   - A description of what changed and why
   - Screenshots for any UI changes
   - Links to any related issues

5. **Address review feedback** — push additional commits (don't force-push during review).

6. **Merge** — PRs are squash-merged into `main` after approval.

---

## Code Style

- **TypeScript** — strict mode, no `any` unless absolutely necessary
- **Formatting** — handled by Prettier (runs on save / pre-commit)
- **Linting** — ESLint with the project config
- **Imports** — use path aliases (`@/lib/...`, `@/components/...`)
- **Components** — functional components with TypeScript props interfaces
- **Naming** — camelCase for variables/functions, PascalCase for components/types, SCREAMING_SNAKE for constants

---

## Need Help?

- Open an issue for bugs or feature requests
- Check [docs/SETUP.md](docs/SETUP.md) for environment setup problems
- Check [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design questions
