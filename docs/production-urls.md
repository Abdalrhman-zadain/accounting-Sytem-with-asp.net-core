# Production Environment & Subdomains

This document explains the production URL architecture for the Simple Account system and how multiple subdomains are utilized.

## Primary Production URLs

This repository's `ecosystem.config.js` targets the **Sabina** instance:

1.  **Primary Access:** [https://sabina.trusttechlimited.com](https://sabina.trusttechlimited.com)
2.  **PM2 names:** `account-frontend`, `account-backend`
3.  **Internal ports:** frontend `3000`, backend `3007`
4.  **Database:** PostgreSQL on host port `15432`, database `simple_account`

A separate isolated **Market** instance (`market-frontend` / `market-backend`, ports `3010` / `3017`) may run on the same server when needed; see `docs/instance-isolation.md`.

## Source Branch For Production

**Deploy from `pos-market` only.**

- `pos-market` is the unified production branch: Restaurant POS, Market POS, print agent, rep stock, and admin user management all live here.
- `main` may lag behind until it is fast-forwarded to match `pos-market` after a stable production deploy.
- Feature work should branch from `pos-market`, merge back into `pos-market`, and production servers should run `git checkout pos-market && git pull origin pos-market` before build/restart.

Production deploy sequence on the server:

```bash
git checkout pos-market
git pull origin pos-market
cd backend && npm install && npx prisma migrate deploy && npx prisma generate && npm test
cd ../frontend && npm install && npm run build
pm2 restart ecosystem.config.js
```

## Technical Architecture (Reverse Proxy)

Nginx on the production server terminates HTTPS for `sabina.trusttechlimited.com` and proxies to the Sabina PM2 processes:

*   `/` → `http://127.0.0.1:3000` (`account-frontend`)
*   `/api/` → `http://127.0.0.1:3007` (`account-backend`)

**Dynamic API resolution:** `frontend/lib/config/api.ts` detects the current hostname at runtime and routes browser API calls to same-origin `/api`, so the app works on `sabina.trusttechlimited.com` without hardcoding the public API host in client code.

## Operational Strategy

The use of multiple subdomains serves several practical purposes:

1.  **Role-Based Access Clarity:** Providing a "market" specific URL helps retail staff and sales reps identify their primary workspace, even though they are part of the larger ERP ecosystem.
2.  **Modular Flexibility:** Should the Market POS module ever need to be moved to a dedicated server for performance reasons (scaling), the transition will be transparent to users since the URL already exists.
3.  **Redundancy & Bookmarking:** Ensuring that both documented entry points remain active prevents confusion and supports legacy bookmarks from different phases of the project rollout.

---
*Last Updated: June 22, 2026*
