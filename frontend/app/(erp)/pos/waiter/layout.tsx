"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { WaiterBottomTabBar } from "@/features/pos/waiter-bottom-tab-bar";
import { cn } from "@/lib/utils";

export default function WaiterLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showTabPadding = !pathname?.startsWith("/pos/waiter/order");

  return (
    <>
      <div
        className={cn(
          showTabPadding &&
            "pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]",
        )}
      >
        {children}
      </div>
      <WaiterBottomTabBar />
    </>
  );
}
