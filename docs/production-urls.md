# Production Environment & Subdomains

This document explains the production URL architecture for the Simple Account system and how multiple subdomains are utilized.

## Primary Production URLs

The system is accessible via its primary production domain:

1.  **Primary Access:** [https://market.trusttechlimited.com](https://market.trusttechlimited.com)
2.  **Legacy/Secondary Access:** [https://sabina.trusttechlimited.com](https://sabina.trusttechlimited.com)

## Technical Architecture (Reverse Proxy)

Although there are multiple subdomains, they both serve the same application instance. This is achieved through an **Nginx Reverse Proxy** configuration on the production server.

### How it Works

*   **Nginx Configuration:** The server is configured to listen for both `market.trusttechlimited.com` and `sabina.trusttechlimited.com`. Regardless of which subdomain is requested, Nginx proxies the traffic to the same internal ports:
    *   **Frontend:** Port `3000` (Next.js)
    *   **Backend:** Port `3007` (NestJS API)
*   **Unified Application:** Since both URLs point to the same running code, the user experience, database, and features are identical. A user navigating to `/journal-entries` on either subdomain is accessing the same accounting module.
*   **Dynamic API Resolution:** The frontend code (`frontend/lib/config/api.ts`) detects the current hostname at runtime. It automatically routes API requests to the relative `/api` path, ensuring that database communication works seamlessly across all subdomains without hardcoded URLs.

## Operational Strategy

The use of multiple subdomains serves several practical purposes:

1.  **Role-Based Access Clarity:** Providing a "market" specific URL helps retail staff and sales reps identify their primary workspace, even though they are part of the larger ERP ecosystem.
2.  **Modular Flexibility:** Should the Market POS module ever need to be moved to a dedicated server for performance reasons (scaling), the transition will be transparent to users since the URL already exists.
3.  **Redundancy & Bookmarking:** Ensuring that both documented entry points remain active prevents confusion and supports legacy bookmarks from different phases of the project rollout.

---
*Last Updated: June 13, 2026*

Yes, it will absolutely cause a conflict.

  If you have two different ecosystem.config.js files on the same server trying to run at the same time, you will run into two major problems:

  1. Port Collision (The "Address in Use" Error)
  A server port (like 3000 or 3007) is like a single phone line—only one application can talk on it at a time. 
   * If your "Sabina" project is already running on port 3000, your "Market" project will crash when it tries to start because port 3000 is already occupied. 
   * You will see an error like Error: listen EADDRINUSE: address already in use :::3000.

  2. PM2 Naming Conflict
  Both files use the exact same names for the processes:
   * name: 'account-frontend'
   * name: 'account-backend'

  PM2 uses these names to manage the apps. If you try to run both, PM2 might get confused, or the second command might accidentally stop/overwrite the first one.

  ---

  How to fix this?

  It depends on what you want to achieve:

  Option A: You want both URLs to point to the SAME data
  If market and sabina are just two different ways to get to the same project, you only need one PM2 process. 
   1. Keep only the market version of the file running.
   2. Configure your Nginx (the web server) to point both market.trusttechlimited.com and sabina.trusttechlimited.com to port 3000. 

  Option B: You want two COMPLETELY SEPARATE projects
  If they should have different databases and different files, you must change the ports for one of them. For example, change the "Market" project to:
   * Frontend Port: 3010
   * Backend Port: 3017
   * Database URL: Ensure it points to a different port or database name as well.

  Recommendation: If these are meant to be the same system, stop the old "Sabina" PM2 process before starting the "Market" one to avoid the port conflict.


