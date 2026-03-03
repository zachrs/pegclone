# Patient Education Genius (PEG)

A multi-tenant SaaS platform that enables healthcare providers to send patient education materials via SMS, email, or QR code — without requiring patients to download an app or create an account.

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript (strict)
- **UI:** Tailwind CSS v4, shadcn/ui
- **Database:** PostgreSQL 16, Drizzle ORM
- **Auth:** Keycloak (OIDC) via Auth.js v5
- **Job Queue:** pg-boss (Postgres-backed)
- **SMS:** Twilio (stubbed for local dev)
- **Email:** Mailgun (stubbed for local dev)
- **Search:** Algolia (stubbed for local dev)
- **Storage:** GCP Cloud Storage (stubbed for local dev)

## Prerequisites

- Node.js 20+ (recommend [nvm](https://github.com/nvm-sh/nvm))
- pnpm (`npm install -g pnpm`)
- Docker & Docker Compose

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy env file
cp .env.local.example .env.local

# Start Postgres + Keycloak
pnpm docker:up

# Push DB schema
pnpm db:push

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Keycloak admin console: [http://localhost:8080](http://localhost:8080) (admin/admin)

### Test Users (Keycloak)

| Email | Password | Role |
|---|---|---|
| superadmin@peg.test | password | super_admin |
| provider@acme.test | password | provider |
| admin@acme.test | password | org_user (is_admin) |

> Note: Users must be provisioned in PEG's `users` table before they can log in. Run `pnpm db:seed` to create matching records.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type checker |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Seed database with test data |
| `pnpm docker:up` | Start Docker services |
| `pnpm docker:down` | Stop Docker services |
| `pnpm docker:reset` | Reset Docker (destroys data) |

## Project Structure

```
src/
  app/
    (dashboard)/         # Authenticated dashboard routes
      library/           # Content library & folders
      send/              # Send flow (single + bulk)
      recipients/        # Recipient history
      analytics/         # Engagement dashboard
      admin/             # Org admin panel
    (super-admin)/       # Platform admin routes
    m/[token]/           # Patient viewer (public, no auth)
    api/
      auth/              # Auth.js endpoints
      webhooks/          # Twilio/Mailgun callbacks
      viewer/            # PDF proxy
  components/
    ui/                  # shadcn/ui components
    layout/              # App shell (sidebar, header)
    providers/           # React context providers
  lib/
    auth/                # Auth config, permissions
    db/                  # Drizzle client, types
    tenancy/             # Multi-tenant helpers
    delivery/            # Twilio/Mailgun service wrappers
    algolia/             # Algolia search client
    jobs/                # pg-boss job handlers
    storage/             # GCS client
    qr/                  # QR code generation
    bulk-import/         # CSV/Excel parsing
    validators/          # Zod schemas
  drizzle/
    schema.ts            # All table definitions
    relations.ts         # Drizzle relation definitions
    migrations/          # Migration files
```

## Architecture

- **Multi-tenant:** All org-specific data scoped by `tenant_id`. Enforced via `withTenant()` helper.
- **Auth:** Keycloak handles login; PEG manages roles/permissions internally.
- **Delivery:** All SMS/email sent asynchronously via pg-boss job queue.
- **Patient viewer:** Public, token-gated page. No login required.
- **PDFs:** Proxied through backend — no direct storage URLs exposed.
