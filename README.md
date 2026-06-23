# Simple Account

Backend-first ERP foundation focused on accounting workflows.

## Structure

```text
.
├── backend/        # NestJS API, Prisma schema, tests, and Phase 1/domain modules
├── frontend/       # Next.js app router, feature slices, and shared UI
├── docs/           # Architecture and product notes
├── docker-compose.yml
├── AGENTS.md
└── README.md
```

## Backend Structure

```text
backend/
├── prisma/         # Database schema and migrations
├── src/
│   ├── common/     # Shared infrastructure such as Prisma
│   ├── generated/  # Prisma generated client
│   ├── modules/    # Platform + Phase 1 accounting modules
│   ├── app.module.ts
│   └── main.ts
├── test/           # Test helpers and integration tests
└── README.md
```

## Frontend Structure

```text
frontend/
├── app/            # Route groups and route entrypoints
├── features/       # Feature-owned screens and flows
├── components/ui/  # Reusable UI primitives
├── lib/            # API, config, and shared utilities
├── providers/      # Global providers
└── types/          # Shared API types
```

## Docs

- `docs/erp-structure.md`
- `docs/full-stack.md`
- `docs/design.md`

## Run Locally

### First Time Setup

From the project root:

```powershell
cd C:\Users\Dell\OneDrive\Desktop\work_project\simple-account
docker compose up -d postgres
cd backend
copy .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
cd ..\frontend
npm install
```

### Every Time You Run The Project

Open one terminal for the database:

```powershell
cd C:\Users\Dell\OneDrive\Desktop\work_project\simple-account
docker compose up -d postgres
```

Open a second terminal for the backend:

```powershell
cd C:\Users\Dell\OneDrive\Desktop\work_project\simple-account\backend
npm run prisma:generate
npm run start:dev
```

If you need to sync schema changes locally and `npm run prisma:migrate` fails with `P3006` (shadow database replay), run:

```powershell
cd C:\Users\Dell\OneDrive\Desktop\work_project\simple-account\backend
npx prisma db push --skip-generate
```

The backend runs at:

```text
http://localhost:3007/api
```

Swagger docs are available at:

```text
http://localhost:3007/api/docs
```

Open a third terminal for the frontend:

```powershell
cd C:\Users\Dell\OneDrive\Desktop\work_project\simple-account\frontend
npm run dev
```

The frontend runs at:

```text
http://localhost:3000
```

### Database Only

From the backend folder, you can also start PostgreSQL with:

```powershell
cd backend
npm run db:up
```

### Database Backup

Create a PostgreSQL backup file using the backend helper script:

```bash
npm run backup:db --prefix backend
```

Optionally pass a custom output path relative to the repository root:

```bash
npm run backup:db --prefix backend -- backups/my-manual-backup.dump
```

### Backend Setup Commands

Use these after dependency or schema changes:

```powershell
cd backend
copy .env.example .env
npm install
npm run prisma:generate
# Use migrate for normal migration workflow.
# If migrate fails locally with P3006, use db push as a local fallback.
npm run prisma:migrate
# npx prisma db push --skip-generate
npm run start:dev
```

If Next.js reports a stale `.next` cache or `readlink` error, stop the frontend server and run:

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

### Prisma Studio

Start the database first, then run Prisma Studio from the backend folder:

```powershell
cd backend
npm run prisma:studio
```

Prisma Studio usually opens at:

````text
http://localhost:5555

## Seeding the database

From the `backend` folder, choose a seed command. The two demo reset commands truncate all public tables; the opening inventory import does not.

| Command | When to use | What you get | Typical runtime |
|---------|-------------|--------------|-----------------|
| `npm run seed` or `npx prisma db seed` | Daily dev, CI, quick reset | Full chart of accounts, masters, users, empty journal history, POS demo | ~30–60s |
| `npm run seed:volume` | Reporting screenshots, module walkthroughs, “big company” demos | Same foundation **plus** fiscal years 2024–2026, ~15k+ posted journals, enterprise masters, reporting audit activity, quarterly operational samples, POS demo | ~2–8 min |
| `npm run seed:opening-inventory` | Import the attached opening stock workbook into an existing DB | Upserts item masters, creates/reuses the two warehouses, and posts deterministic opening inventory receipts dated `2026-05-31` without truncating unrelated tables. Reruns refresh those same opening receipts by reference when no later stock activity exists for the affected warehouse items. | ~10–30s |

Login after the basic seed: **admin** / **admin123**, **cashier** / **cashier123**, **kitchen** / **kitchen123**, and **waiter** / **waiter123**.

Prerequisites:

- `DATABASE_URL` must point to a running PostgreSQL instance (start with `npm run db:up` from `backend/`).

```bash
cd backend
npm run db:up          # if Postgres is not running
npm install            # first time
npm run prisma:generate

# Basic demo (also what `npx prisma db seed` runs)
npm run seed

# Enterprise volume demo (opt-in; not wired to prisma db seed)
npm run seed:volume

# Non-destructive opening inventory import
npm run seed:opening-inventory
```

From the **repository root**, the same commands work via `npm run seed`, `npm run seed:volume`, and `npm run seed:opening-inventory` (they forward to `backend/`). If you see `Missing script: "seed:volume"`, you are not in `backend/` or the repo root — `cd` into one of those first.

Optional volume tuning via environment variables (see `backend/prisma/seed-volume/config.ts`): `SEED_VOLUME_YEARS`, `SEED_MONTHLY_JOURNALS`, `SEED_CUSTOMERS`, `SEED_SUPPLIERS`, `SEED_AUDIT_EVENTS`, etc.

Notes:

- `npx prisma db seed` always runs the **basic** seed only (`prisma/seed.ts`).
- `npm run seed:opening-inventory` reads `backend/data/opening-inventory-2026-05-31.json` by default. The original workbook is kept beside it as source input at `backend/data/opening-inventory-2026-05-31.xlsx`.
- If seeding fails, verify `DATABASE_URL` and that Postgres is reachable.

## Run Tests

### Backend Test Cases

Run the backend Jest test suite from the backend folder:

```powershell
cd C:\Users\Dell\OneDrive\Desktop\work_project\simple-account\backend
npm test
````

To keep the backend tests running while you edit code:

```powershell
cd C:\Users\Dell\OneDrive\Desktop\work_project\simple-account\backend
npm run test:watch
```

### Frontend Checks

## Deployment & Maintenance

### Production Branch

Deploy **`pos-market`** only. It contains Restaurant POS, Market POS, and the current admin/user-management work. The `main` branch is not the production source of truth until it is fast-forwarded to match `pos-market`.

```bash
git checkout pos-market
git pull origin pos-market
```

### Production Setup (PM2)

The project is deployed using **PM2** and **Nginx**.

- **Backend:** Runs on port `3017` (to avoid conflicts with other local projects).
- **Frontend:** Runs on port `3010`.
- **Domain:** `https://market.trusttechlimited.com`

#### Managing with PM2

Use the following commands from the root directory:

```bash
# Start/Restart everything
pm2 restart ecosystem.config.js

# View live logs
pm2 logs market-backend
pm2 logs market-frontend

# Save current process list for reboot persistence
pm2 save
```

#### Production Configuration Changes

- **Relative API Paths:** The frontend is configured in `frontend/lib/config/api.ts` to use relative `/api` paths when accessed via the production domain. This ensures **HTTPS** compatibility and prevents "Mixed Content" blocks.
- **Backend CORS:** The backend CORS is configured to reflect the request origin to allow secure cross-origin communication between the frontend and backend under the reverse proxy.

### Nginx Configuration

The Nginx configuration (typically in `/etc/nginx/sites-available/trusttech-apps`) routes domain traffic as follows:

- `https://market.trusttechlimited.com/` -> Frontend (Port 3010)
- `https://market.trusttechlimited.com/api/` -> Backend (Port 3017)

---

## Checks Passed

```text
backend: npm run build
backend: npm run test -- sales-receivables.service.spec.ts
frontend: npm run typecheck
```

The frontend does not currently have a test runner script. Use TypeScript checking to validate frontend code:

```powershell
cd C:\Users\Dell\OneDrive\Desktop\work_project\simple-account\frontend
npm run typecheck
```

You can also run a production build check:

```powershell
cd C:\Users\Dell\OneDrive\Desktop\work_project\simple-account\frontend
npm run build
```

## Troubleshooting

- If backend development startup fails with `EADDRINUSE`, check whether port `3002` is already in use before running `npm run start:dev`.
- The frontend production build currently succeeds, but it can still take noticeably longer on larger pages because Next.js compiles and validates the app during build.
- In frontend development mode, page navigation can feel slower than production because Next.js compiles routes on demand.
