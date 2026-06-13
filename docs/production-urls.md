# Production Environment & Subdomains

This document explains the production URL architecture for the Simple Account system and how multiple subdomains are utilized.

## Primary Production URLs

The system is accessible via two primary subdomains, both pointing to the same production environment:

1.  **ERP & Restaurant POS:** [https://sabina.trusttechlimited.com](https://sabina.trusttechlimited.com)
2.  **Market POS & Operations:** [https://market.trusttechlimited.com](https://market.trusttechlimited.com)

## Technical Architecture (Reverse Proxy)

Although there are multiple subdomains, they both serve the same application instance. This is achieved through an **Nginx Reverse Proxy** configuration on the production server.

### How it Works

*   **Nginx Configuration:** The server is configured to listen for both `sabina.trusttechlimited.com` and `market.trusttechlimited.com`. Regardless of which subdomain is requested, Nginx proxies the traffic to the same internal ports:
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
