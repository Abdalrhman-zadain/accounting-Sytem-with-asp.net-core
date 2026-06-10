"use client";

import { LuMenu } from "react-icons/lu";

import { AppLogo } from "@/components/app-logo";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useSettings } from "@/providers/settings-provider";

type MobileNavBarProps = {
  onOpenDrawer: () => void;
  variant?: "bar" | "floating";
};

export function MobileNavBar({ onOpenDrawer, variant = "bar" }: MobileNavBarProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useSettings();

  const menuButton = (
    <button
      type="button"
      onClick={onOpenDrawer}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50",
        variant === "floating" ? "h-11 w-11 shadow-md" : "h-10 w-10",
      )}
      aria-label="Open navigation menu"
    >
      <LuMenu className="h-5 w-5" />
    </button>
  );

  if (variant === "floating") {
    return (
      <div
        className={cn(
          "pointer-events-none fixed z-[170] ltr:left-3 rtl:right-3",
          "top-[max(0.75rem,env(safe-area-inset-top))]",
        )}
      >
        <div className="pointer-events-auto">{menuButton}</div>
      </div>
    );
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[170] border-b border-gray-200 bg-white/95 backdrop-blur-md nav-desktop:hidden",
        "pt-[env(safe-area-inset-top,0px)]",
      )}
    >
      <div className="flex h-14 items-center gap-3 px-3">
        {menuButton}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <AppLogo height={28} priority className="shrink-0" />
          <span className="truncate text-sm font-black text-gray-900">{t("app.title")}</span>
        </div>
        <button
          type="button"
          onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
          className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[10px] font-black tracking-widest text-gray-600"
          aria-label={t("language.toggle.aria")}
        >
          {language === "ar" ? "AR" : "EN"}
        </button>
      </div>
    </header>
  );
}
