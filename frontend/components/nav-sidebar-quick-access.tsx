"use client";

import Link from "next/link";
import { LuSearch as Search, LuStar as Star } from "react-icons/lu";

import { useOptionalNavQuickAccess } from "@/components/nav-quick-access-provider";
import { useTranslation } from "@/lib/i18n";
import { findNavDestination } from "@/lib/nav/erp-nav-utils";
import { cn } from "@/lib/utils";

function QuickNavItem({
  href,
  isActive,
  effectiveCollapsed,
  onNavigate,
}: {
  href: string;
  isActive: boolean;
  effectiveCollapsed: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const quickAccess = useOptionalNavQuickAccess();
  const destination = quickAccess ? findNavDestination(quickAccess.destinations, href) : undefined;

  if (!destination || !quickAccess) return null;

  const Icon = destination.icon;
  const favorite = quickAccess.isFavorite(href);

  return (
    <div className="group relative flex items-center">
      <Link
        href={href}
        onClick={onNavigate}
        title={effectiveCollapsed ? t(destination.labelKey) : undefined}
        className={cn(
          "flex h-10 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors duration-200",
          effectiveCollapsed && "justify-center px-0",
          isActive
            ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
            : "border border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-emerald-600" : "text-slate-400")} />
        <span className={cn("truncate text-start", effectiveCollapsed && "sr-only")}>
          {t(destination.labelKey)}
        </span>
      </Link>
      {!effectiveCollapsed ? (
        <button
          type="button"
          onClick={() => quickAccess.toggleFavorite(href)}
          className={cn(
            "absolute end-1 rounded-lg p-1.5 opacity-0 transition-all group-hover:opacity-100",
            favorite ? "text-amber-500 opacity-100" : "text-slate-300 hover:text-slate-500",
          )}
          aria-label={favorite ? t("nav.quickAccess.removeFavorite") : t("nav.quickAccess.addFavorite")}
        >
          <Star className={cn("h-3.5 w-3.5", favorite && "fill-current")} />
        </button>
      ) : null}
    </div>
  );
}

export function NavSidebarQuickAccess({
  effectiveCollapsed,
  isActiveHref,
  onNavigate,
}: {
  effectiveCollapsed: boolean;
  isActiveHref: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const quickAccess = useOptionalNavQuickAccess();

  if (!quickAccess) return null;

  const favoriteDestinations = quickAccess.favorites
    .map((href) => findNavDestination(quickAccess.destinations, href))
    .filter((destination): destination is NonNullable<typeof destination> => Boolean(destination));

  return (
    <div className="space-y-2 px-3 pt-3">
      <button
        type="button"
        onClick={quickAccess.openCommandPalette}
        className={cn(
          "flex h-10 w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 transition-colors duration-200 hover:border-emerald-200 hover:bg-emerald-50/60 hover:text-emerald-700",
          effectiveCollapsed && "justify-center px-0",
        )}
        title={effectiveCollapsed ? t("nav.quickAccess.title") : undefined}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className={cn("flex-1 truncate text-start", effectiveCollapsed && "sr-only")}>
          {t("nav.quickAccess.button")}
        </span>
        {!effectiveCollapsed ? (
          <kbd className="hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 sm:inline">
            {t("nav.quickAccess.shortcut")}
          </kbd>
        ) : null}
      </button>

      {!effectiveCollapsed && favoriteDestinations.length > 0 ? (
        <div className="pt-1">
          <div className="mb-1 flex items-center gap-2 px-1 text-[11px] font-bold text-slate-500">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            {t("nav.quickAccess.favorites")}
          </div>
          <div className="space-y-0.5">
            {favoriteDestinations.map((destination) => (
              <QuickNavItem
                key={`favorite-${destination.href}`}
                href={destination.href}
                isActive={isActiveHref(destination.href)}
                effectiveCollapsed={effectiveCollapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function NavFavoriteToggle({
  href,
  effectiveCollapsed,
}: {
  href: string;
  effectiveCollapsed: boolean;
}) {
  const { t } = useTranslation();
  const quickAccess = useOptionalNavQuickAccess();

  if (!quickAccess || effectiveCollapsed) return null;

  const favorite = quickAccess.isFavorite(href);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        quickAccess.toggleFavorite(href);
      }}
      className={cn(
        "shrink-0 rounded-lg p-1.5 transition-colors",
        favorite
          ? "text-amber-500 hover:bg-amber-50"
          : "text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-500",
      )}
      aria-label={favorite ? t("nav.quickAccess.removeFavorite") : t("nav.quickAccess.addFavorite")}
    >
      <Star className={cn("h-3.5 w-3.5", favorite && "fill-current")} />
    </button>
  );
}
