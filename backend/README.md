# Backend

NestJS backend for the accounting foundation.

## Source Layout

```text
src/
├── common/         # Shared infrastructure
├── generated/      # Prisma generated client
├── modules/
│   ├── accounting-core/
│   └── auth/
├── app.module.ts
└── main.ts
```

## Commands

```bash
npm install
cp .env.example .env
npm run db:up
npm run prisma:generate
npm run prisma:deploy
npm test
npm run start:dev
```

`npm run start:dev` uses polling mode for file watching so local development can still run on Linux environments that have a low inotify watcher limit. This is more resilient but can use slightly more CPU than native file watching.

## Environment

Create `backend/.env` by copying `backend/.env.example`, or use:

```bash
DATABASE_URL="postgresql://simple_account_user:simple_account_pass@localhost:15432/simple_account?schema=public"
PORT=3007
JWT_SECRET="your_highly_secret_key_change_in_production"
JWT_EXPIRATION="24h"
```

Use `SKIP_DB_CONNECT=true` when running tests or bootstrapping without a live database connection.

If you prefer native file watching on Linux, raise the inotify watcher limit and then you can switch the script back locally:

```bash
sudo sysctl fs.inotify.max_user_watches=524288
echo "fs.inotify.max_user_watches=524288" | sudo tee /etc/sysctl.d/99-simple-account.conf
sudo sysctl --system
```

## Local PostgreSQL

From the repo root:

```bash
docker compose up -d postgres
```

## Troubleshooting Database Startup

If backend startup fails with:

```text
PrismaClientInitializationError: Database `simple_account` does not exist
```

use this recovery flow from `backend/`:

```bash
npm run db:up
npm run prisma:generate
npm run prisma:deploy
npm run start:dev
```

Use `npm run prisma:migrate -- --name <migration_name>` only when you are intentionally creating a new migration during development. For a fresh local database that should apply the repo's existing migration history as-is, prefer `npm run prisma:deploy`.

If Docker starts but the database still does not exist, your local Postgres volume may have been created earlier with stale state. In that case, reset the local database volume and recreate it:

```bash
npm run db:down
docker volume rm simple-account-sabina_sabina_postgres_data
npm run db:up
npm run prisma:deploy
```

Warning:

- removing `simple-account-sabina_sabina_postgres_data` deletes all local PostgreSQL data in that Docker volume
- only use the volume-reset flow when you are okay recreating the local database
