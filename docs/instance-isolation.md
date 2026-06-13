# Instance Isolation Guide (Option B)

This document details the configuration used to run the **Market POS** project as a separate, isolated instance on a server that may also be hosting other instances (like the "Sabina" project).

## Configuration Overview

To avoid port collisions and process name conflicts, the following unique settings have been applied to this repository.

### 1. PM2 Process Names
The processes in `ecosystem.config.js` have been renamed to distinguish them from other "Simple Account" instances:
*   **Frontend:** `market-frontend` (formerly `account-frontend`)
*   **Backend:** `market-backend` (formerly `account-backend`)

### 2. Network Port Assignments
These ports are dedicated to the Market instance. Ensure no other service on the server is using them.

| Service | Internal Port | External Domain |
| :--- | :--- | :--- |
| **Frontend (Next.js)** | `3010` | `https://market.trusttechlimited.com` |
| **Backend (NestJS)** | `3017` | `https://market.trusttechlimited.com/api` |

### 3. Database Configuration
The instance is connected to its own dedicated PostgreSQL container.
*   **Docker Port:** `15433` (mapped to `5432` internally)
*   **Database Name:** `simple-account-pos-m-ch`
*   **Connection String:** `postgresql://simple_account_user:simple_account_pass@localhost:15433/simple-account-pos-m-ch?schema=public`

## Nginx Routing Requirements

The Nginx reverse proxy must be updated to point to these new internal ports.

```nginx
# market.trusttechlimited.com Nginx Server Block

location / {
    proxy_pass http://localhost:3010; # Directs to Market Frontend
    ...
}

location /api/ {
    proxy_pass http://localhost:3017; # Directs to Market Backend
    ...
}
```

## Deployment Commands

When deploying or restarting this specific instance, use the explicit PM2 names:

```bash
# Restart both services
pm2 restart ecosystem.config.js

# View logs for this instance
pm2 logs market-frontend
pm2 logs market-backend
```

---
*Last Updated: June 13, 2026*
