import { describe, expect, it } from "vitest";

import type { AuthUser } from "@/types/api";
import { canAccessRoute, getUserPosProducts } from "@/lib/auth-access";

function marketRepUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "user-1",
    username: "market_rep",
    email: "market_rep@example.com",
    role: "USER",
    posRoles: ["MARKET_REP"],
    permissions: [
      "POS_VIEW_POS_SCREEN",
      "POS_PRINT_RECEIPT",
      "POS_MARKET_VIEW_RECEIVABLES",
    ],
    allowedRoutes: [
      "/pos-market/register",
      "/pos-market/amend-sales",
      "/pos-market/receivables",
      "/pos-market/my-stock",
      "/pos-market/printers",
    ],
    defaultRoute: "/pos-market/receivables",
    salesRepId: "rep-1",
    ...overrides,
  };
}

describe("auth-access restaurant vs market isolation", () => {
  it("treats market reps as market-only POS users", () => {
    const user = marketRepUser();
    expect(getUserPosProducts(user)).toEqual(["market"]);
  });

  it("blocks restaurant POS routes for market-only users even with shared POS permissions", () => {
    const user = marketRepUser();

    expect(canAccessRoute(user, "/pos/printers")).toBe(false);
    expect(canAccessRoute(user, "/pos/register")).toBe(false);
    expect(canAccessRoute(user, "/pos/sessions")).toBe(false);
  });

  it("still allows market POS routes for market reps", () => {
    const user = marketRepUser();

    expect(canAccessRoute(user, "/pos-market/receivables")).toBe(true);
    expect(canAccessRoute(user, "/pos-market/register")).toBe(true);
    expect(canAccessRoute(user, "/pos-market/my-stock")).toBe(true);
    expect(canAccessRoute(user, "/pos-market/printers")).toBe(true);
  });

  it("blocks amend-sales without POS_MARKET_AMEND_SALE permission", () => {
    const user = marketRepUser({
      permissions: ["POS_VIEW_POS_SCREEN", "POS_PRINT_RECEIPT", "POS_MARKET_VIEW_RECEIVABLES"],
      allowedRoutes: [
        "/pos-market/register",
        "/pos-market/receivables",
        "/pos-market/my-stock",
        "/pos-market/printers",
      ],
    });

    expect(canAccessRoute(user, "/pos-market/amend-sales")).toBe(false);
  });

  it("allows amend-sales when POS_MARKET_AMEND_SALE is granted", () => {
    const user = marketRepUser({
      permissions: [
        "POS_VIEW_POS_SCREEN",
        "POS_PRINT_RECEIPT",
        "POS_MARKET_VIEW_RECEIVABLES",
        "POS_MARKET_AMEND_SALE",
      ],
      allowedRoutes: [
        "/pos-market/register",
        "/pos-market/amend-sales",
        "/pos-market/receivables",
        "/pos-market/my-stock",
        "/pos-market/printers",
      ],
    });

    expect(canAccessRoute(user, "/pos-market/amend-sales")).toBe(true);
  });

  it("allows restaurant POS when the user also has restaurant access", () => {
    const user = marketRepUser({
      posRoles: ["MARKET_REP", "CASHIER"],
      allowedRoutes: [
        "/pos/register",
        "/pos-market/receivables",
      ],
    });

    expect(getUserPosProducts(user)).toEqual(["restaurant", "market"]);
    expect(canAccessRoute(user, "/pos/printers")).toBe(true);
  });
});
