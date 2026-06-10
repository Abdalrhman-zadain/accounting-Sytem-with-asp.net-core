"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { MobileNavBar } from "@/components/mobile-nav-bar";
import { SiteHeader } from "@/components/site-header";
import { useNavDesktopLayout } from "@/lib/hooks/use-viewport-breakpoints";
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
  const isNavDesktop = useNavDesktopLayout();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isPosPage = pathname?.startsWith("/pos") || pathname?.startsWith("/pos-market");
  const isKitchenRoute = pathname?.startsWith("/pos/kitchen");
  const hideSidebar = kitchenMode && isKitchenRoute;
  const isMobileNav = !isNavDesktop;

  useEffect(() => {
    document.body.style.overflow = "";
    setIsDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileNav || !isDrawerOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileNav, isDrawerOpen]);

  const showMobileNavBar = isMobileNav && !isAuthPage && !hideSidebar;
  const mobileNavVariant = isPosPage ? "floating" : "bar";

  return (
    <>
      <DevRoutePerf />
      {!hideSidebar ? (
        <SiteHeader
          isCollapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
          isMobileNav={isMobileNav}
          isDrawerOpen={isDrawerOpen}
          onCloseDrawer={() => setIsDrawerOpen(false)}
        />
      ) : null}
      {showMobileNavBar ? (
        <MobileNavBar
          variant={mobileNavVariant}
          onOpenDrawer={() => setIsDrawerOpen(true)}
        />
      ) : null}
      <main
        className={cn(
          "min-h-screen",
          isAuthPage || hideSidebar
            ? "pl-0 pr-0"
            : isMobileNav
              ? "pl-0 pr-0"
              : isSidebarCollapsed
                ? "ltr:pl-20 rtl:pr-20"
                : "ltr:pl-60 rtl:pr-60",
          isPosPage && "pb-[env(safe-area-inset-bottom,0px)]",
          showMobileNavBar && mobileNavVariant === "bar" && "pt-[calc(3.5rem+env(safe-area-inset-top,0px))]",
        )}
      >
        <div
          className={cn(
            "mx-auto w-full",
            isPosPage
              ? "max-w-none p-0"
              : "max-w-[1800px] px-3 pb-6 pt-0 md:px-4 md:pb-8 md:pt-0",
          )}
        >
          {children}
        </div>
      </main>
    </>
  );
}
