# Market 502 And Database Recovery

This runbook fixes the `https://market.trusttechlimited.com/` Cloudflare/Nginx
502 caused by missing Market upstream services and pushes the backend schema and
seed data into the Market PostgreSQL database.

## Expected Market Configuration

The Market instance must use its own PostgreSQL database:

```bash
DATABASE_URL="postgresql://simple_account_user:simple_account_pass@localhost:15433/simple-account-pos-m-ch?schema=public"
PORT=3008
INVENTORY_ACCOUNTING_ENABLED=true
```

The reverse proxy currently expects:

```text
market frontend: http://127.0.0.1:3009
market backend:  http://127.0.0.1:3008/api
market database: localhost:15433/simple-account-pos-m-ch
```

## 1. Start Market PostgreSQL

From the backend directory:

```bash
cd /home/server/Desktop/production/simple-account/backend
sudo docker compose -f docker-compose.market.yml up -d postgres
```

Verify the database port is reachable:

```bash
pg_isready -h 127.0.0.1 -p 15433
```

Expected result:

```text
127.0.0.1:15433 - accepting connections
```

If Docker fails with permission errors, run the command as a user with Docker
access or use `sudo`. The `server` user must either be in the `docker` group or
provide the sudo password.

## 2. Apply Database Schema

Use the Market connection string explicitly so migrations do not accidentally
target the Sabina or local development database.

```bash
cd /home/server/Desktop/production/simple-account/backend
export DATABASE_URL="postgresql://simple_account_user:simple_account_pass@localhost:15433/simple-account-pos-m-ch?schema=public"
npm run prisma:generate
npx prisma migrate deploy
```

For local development branches that do not have deployed migration history, use
the normal development migration command only when you are intentionally
creating or updating a non-production database:

```bash
npm run prisma:migrate -- --name init_market_database
```

## 3. Push Seed Data

Run the base seed first, then Market/POS-specific seeds that exist in the
production backend.

```bash
cd /home/server/Desktop/production/simple-account/backend
export DATABASE_URL="postgresql://simple_account_user:simple_account_pass@localhost:15433/simple-account-pos-m-ch?schema=public"
npm run seed
npm run seed:market
npm run seed:opening-inventory
npm run seed:market-cashier
```

Optional production showcase/catalog seeds, if needed:

```bash
npm run seed:shouq
npm run seed:market-showcase
```

If any optional seed script is missing in the current branch, skip it and use the
scripts listed by:

```bash
npm run
```

## 4. Restart PM2 Services

Restart the backend after the database is available and seeded:

```bash
cd /home/server/Desktop/production/simple-account
pm2 restart market-backend --update-env
pm2 restart market-frontend --update-env
pm2 save
```

If the frontend keeps trying to bind to the wrong port, replace the stale PM2
entry:

```bash
pm2 delete market-frontend
pm2 start /home/server/Desktop/production/simple-account/ecosystem.config.js --only market-frontend
pm2 save
```

## 5. Verify

Check local upstreams:

```bash
curl -I --max-time 5 http://127.0.0.1:3009
curl -I --max-time 5 http://127.0.0.1:3008/api/docs
curl -I --max-time 5 -H "Host: market.trusttechlimited.com" http://127.0.0.1/
curl -I --max-time 5 -H "Host: market.trusttechlimited.com" http://127.0.0.1/api/docs
```

Check the public URL:

```bash
curl -I --max-time 8 https://market.trusttechlimited.com/
curl -I --max-time 8 https://market.trusttechlimited.com/api/docs
```

Expected healthy result:

- `/` returns a Next.js response, commonly `307` to `/accounts`.
- `/api/docs` returns a backend response, commonly `200`.
- No endpoint should return Nginx or Cloudflare `502`.

## Current Known Blocker

The frontend root 502 can be fixed by starting `market-frontend` on port `3009`.
The API 502 remains until PostgreSQL is running on `15433` and `market-backend`
can connect to:

```text
postgresql://simple_account_user:simple_account_pass@localhost:15433/simple-account-pos-m-ch?schema=public
```

Do not point Market to `15432/simple_account` as a workaround unless you
intentionally want to share the Sabina/local database. That breaks the intended
Market instance isolation.
