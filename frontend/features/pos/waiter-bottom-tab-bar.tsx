"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuChefHat, LuUtensils } from "react-icons/lu";

import { posTouchButtonClass } from "@/features/pos-shared/pos-layout-classes";
import { isWaiterOnlyUser } from "@/lib/auth-access";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const TABS = [
  {
    href: "/pos/waiter/tables",
    labelKey: "pos.workspace.tables" as const,
    fallbackAr: "الطاولات",
    fallbackEn: "Tables",
    icon: LuUtensils,
    match: (path: string) => path.startsWith("/pos/waiter/tables"),
  },
  {
    href: "/pos/waiter/orders",
    labelKey: "pos.workspace.waiterOrders" as const,
    fallbackAr: "الطلبات",
    fallbackEn: "Orders",
    icon: LuChefHat,
    match: (path: string) => path.startsWith("/pos/waiter/orders"),
  },
] as const;

export function WaiterBottomTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { language, t } = useTranslation();
  const isAr = language === "ar";

  if (!isWaiterOnlyUser(user)) {
    return null;
  }

  if (pathname?.startsWith("/pos/waiter/order")) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[175] border-t border-[#dde5df] bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]"
      aria-label={isAr ? "تنقل النادل" : "Waiter navigation"}
    >
      <div className="mx-auto grid max-w-lg grid-cols-2 gap-1 px-2 py-1.5">
        {TABS.map((tab) => {
          const active = tab.match(pathname ?? "");
          const Icon = tab.icon;
          const label = t(tab.labelKey);
          const displayLabel =
            label === tab.labelKey ? (isAr ? tab.fallbackAr : tab.fallbackEn) : label;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-center text-xs font-bold transition",
                posTouchButtonClass,
                active
                  ? "bg-[#46644b]/10 text-[#46644b]"
                  : "text-[#68776f] hover:bg-[#f4f7f5]",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span>{displayLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
