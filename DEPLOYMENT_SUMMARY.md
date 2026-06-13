# Deployment Summary - June 13, 2026

The project has been reconfigured as an **isolated instance** (Market POS) to run alongside other systems on the same server without conflict. Below is the updated summary of the configuration and deployment process.

## 1. Instance Isolation (New Configuration)
* **Primary Domain:** `https://market.trusttechlimited.com`
* **PM2 Process Names:** `market-frontend`, `market-backend`
* **Assigned Ports:**
    *   **Frontend:** `3010`
    *   **Backend:** `3017`
* **Database Port:** `15433` (Dockerized PostgreSQL)

## 2. Code Synchronization (Git)
* **Command:** `git stash` followed by `git pull`
* **Status:** Synchronized with the `pos-market` branch. Includes the latest instance isolation settings and documentation.

## 3. Database & Backend Preparation
* **Command:** `npm install` (in `backend/`)
* **Command:** `npm run prisma:generate`
* **Command:** `npx prisma migrate deploy`
* **Reason:** Updated dependencies and ensured the Prisma client matches the isolated database schema.

## 4. Frontend Production Build
* **Command:** `npm install` (in `frontend/`)
* **Command:** `npm run build`
* **Reason:** Generated optimized Next.js production assets configured for the `market` subdomain.

## 5. Production Deployment (PM2)
* **Command:** `pm2 restart ecosystem.config.js`
* **Result:** Successfully launched `market-frontend` on port `3010` and `market-backend` on port `3017`.

## 6. Final Validation
* **Monitoring:** Verified `pm2 logs` to confirm both services started correctly.
* **Network:** Confirmed Nginx is routing `market.trusttechlimited.com` to the new internal ports.

---

# Detailed Deployment Process Explanation

### 1. Code Synchronization (Git Phase)
We pull the latest code from the `pos-market` branch. This branch contains the `ecosystem.config.js` file specifically tuned for this instance's ports and process names.

### 2. Environment Alignment (Prisma & Dependencies)
*   **Database Migrations:** We use `prisma migrate deploy` to update the database container (running on port `15433`). This ensures this instance's data remains separate from other projects.

### 3. Production Optimization (Build Phase)
*   **Build:** Next.js compiles the frontend. It embeds the `NEXT_PUBLIC_API_BASE_URL` (set to `https://market.trusttechlimited.com/api`) into the static assets.

### 4. Process Management (PM2 Phase)
*   **Unique Names:** We use `market-frontend` and `market-backend` so that running `pm2 list` clearly shows which project is which, preventing accidental restarts of other systems.
*   **Isolated Ports:** By using ports `3010` and `3017`, we avoid the "Address already in use" error that would occur if we tried to use the default ports (3000/3007).

### 5. Network Routing (Nginx Phase)
Nginx acts as the "Traffic Cop" at the server's edge:
*   It listens for hits on `https://market.trusttechlimited.com`.
*   It routes requests starting with `/api` to the **Market Backend (Port 3017)**.
*   It routes everything else to the **Market Frontend (Port 3010)**.

**Summary:** This configuration ensures the Market POS project is a self-contained, high-performance instance that can safely coexist with other applications on the same hardware.
