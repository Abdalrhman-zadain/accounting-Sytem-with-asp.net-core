"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { usePathname } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { useKdsMode } from "@/providers/kds-mode-provider";
import { cn } from "@/lib/utils";

const DevRoutePerf =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("@/components/route-perf").then((mod) => mod.RoutePerf), { ssr: false })
    : function NoopRoutePerf() {
      return null;
    };

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { kitchenMode } = useKdsMode();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isPosPage = pathname?.startsWith("/pos");
  const isKitchenRoute = pathname?.startsWith("/pos/kitchen");
  const hideSidebar = kitchenMode && isKitchenRoute;

  return (
    <>
      <DevRoutePerf />
      {!hideSidebar ? (
        <SiteHeader
          isCollapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
        />
      ) : null}
      <main
        className={cn(
          "min-h-screen",
          isAuthPage || hideSidebar
            ? "pl-0 pr-0"
            : isSidebarCollapsed
              ? "ltr:pl-20 rtl:pr-20"
              : "ltr:pl-60 rtl:pr-60",
        )}
      >
        <div
          className={cn(
            "mx-auto w-full",
            isPosPage ? "p-0 max-w-none" : "max-w-[1800px] px-3 pb-6 pt-0 md:px-4 md:pb-8 md:pt-0"
          )}
        >
          {children}
        </div>
      </main>
    </>
  );
}
