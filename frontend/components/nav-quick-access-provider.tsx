"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  LuClock3 as Clock3,
  LuSearch as Search,
  LuStar as Star,
  LuX as X,
} from "react-icons/lu";

import { useAuth } from "@/providers/auth-provider";
import { useTranslation } from "@/lib/i18n";
import { useNavFavorites } from "@/lib/hooks/use-nav-favorites";
import { cn } from "@/lib/utils";
import {
  findNavDestination,
  flattenNavDestinations,
  getDestinationBreadcrumb,
  getVisibleNavGroups,
  searchNavDestinations,
  type NavDestination,
} from "@/lib/nav/erp-nav-utils";

type NavQuickAccessContextValue = {
  openCommandPalette: () => void;
  destinations: NavDestination[];
  favorites: string[];
  toggleFavorite: (href: string) => void;
  isFavorite: (href: string) => boolean;
};

const NavQuickAccessContext = createContext<NavQuickAccessContextValue | null>(null);

export function useNavQuickAccess() {
  const context = useContext(NavQuickAccessContext);
  if (!context) {
    throw new Error("useNavQuickAccess must be used within NavQuickAccessProvider");
  }
  return context;
}

export function useOptionalNavQuickAccess() {
  return useContext(NavQuickAccessContext);
}

function NavCommandPalette({
  isOpen,
  onClose,
  destinations,
  favorites,
  toggleFavorite,
  isFavorite,
}: {
  isOpen: boolean;
  onClose: () => void;
  destinations: NavDestination[];
  favorites: string[];
  toggleFavorite: (href: string) => void;
  isFavorite: (href: string) => boolean;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const favoriteDestinations = useMemo(
    () =>
      favorites
        .map((href) => findNavDestination(destinations, href))
        .filter(Boolean) as NavDestination[],
    [destinations, favorites],
  );

  const filteredDestinations = useMemo(
    () => searchNavDestinations(destinations, query),
    [destinations, query],
  );

  type PaletteItem = { destination: NavDestination; section: "favorites" | "all" };

  const displayItems = useMemo((): PaletteItem[] => {
    if (query.trim()) {
      return [];
    }

    const seen = new Set<string>();
    const items: PaletteItem[] = [];

    for (const destination of favoriteDestinations) {
      if (seen.has(destination.href)) continue;
      seen.add(destination.href);
      items.push({ destination, section: "favorites" });
    }

    for (const destination of destinations) {
      if (seen.has(destination.href)) continue;
      seen.add(destination.href);
      items.push({ destination, section: "all" });
    }

    return items;
  }, [query, favoriteDestinations, destinations]);

  const flatItems = useMemo((): PaletteItem[] => {
    if (query.trim()) {
      return filteredDestinations.map((destination) => ({
        destination,
        section: "all" as const,
      }));
    }
    return displayItems;
  }, [query, filteredDestinations, displayItems]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => Math.min(current + 1, flatItems.length - 1));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, flatItems.length, onClose]);

  useEffect(() => {
    const activeElement = listRef.current?.querySelector<HTMLElement>(`[data-nav-index="${activeIndex}"]`);
    activeElement?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const navigateTo = (href: string) => {
    onClose();
    router.push(href);
  };

  if (!isOpen) return null;

  const sectionLabel = (section: "favorites" | "all") => {
    if (section === "favorites") return t("nav.quickAccess.favorites");
    return t("nav.quickAccess.allPages");
  };

  let lastSection: "favorites" | "all" | null = null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 p-4 pt-[10vh] backdrop-blur-[2px]">
      <button
        type="button"
        className="absolute inset-0"
        aria-label={t("common.cancel")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.quickAccess.title")}
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && flatItems[activeIndex]) {
                event.preventDefault();
                navigateTo(flatItems[activeIndex].destination.href);
              }
            }}
            placeholder={t("nav.quickAccess.placeholder")}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 sm:inline">
            Esc
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("common.cancel")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={listRef} className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
          {flatItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              {t("nav.quickAccess.empty")}
            </div>
          ) : (
            flatItems.map((item, index) => {
              const showSectionHeader = !query.trim() && item.section !== lastSection;
              lastSection = item.section;
              const { destination } = item;
              const Icon = destination.icon;
              const favorite = isFavorite(destination.href);

              return (
                <div key={`${destination.href}-${index}`}>
                  {showSectionHeader ? (
                    <div className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {sectionLabel(item.section)}
                    </div>
                  ) : null}
                  <div
                    data-nav-index={index}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150",
                      index === activeIndex ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => navigateTo(destination.href)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-start"
                    >
                      <Icon className={cn("h-5 w-5 shrink-0", index === activeIndex ? "text-emerald-600" : "text-slate-400")} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {t(destination.labelKey)}
                        </span>
                        {destination.parentLabelKey ? (
                          <span className="block truncate text-xs text-slate-500">
                            {getDestinationBreadcrumb(destination, t)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite(destination.href);
                      }}
                      className={cn(
                        "shrink-0 rounded-lg p-1.5 transition-colors",
                        favorite
                          ? "text-amber-500 hover:bg-amber-50"
                          : "text-slate-300 hover:bg-slate-100 hover:text-slate-500",
                      )}
                      aria-label={favorite ? t("nav.quickAccess.removeFavorite") : t("nav.quickAccess.addFavorite")}
                    >
                      <Star className={cn("h-4 w-4", favorite && "fill-current")} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            {t("nav.quickAccess.hint")}
          </span>
          <span className="hidden sm:inline">{t("nav.quickAccess.shortcut")}</span>
        </div>
      </div>
    </div>
  );
}

export function NavQuickAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { favorites, toggleFavorite, isFavorite } = useNavFavorites();

  const destinations = useMemo(
    () => flattenNavDestinations(getVisibleNavGroups(user)),
    [user],
  );

  const openCommandPalette = useCallback(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      openCommandPalette,
      destinations,
      favorites,
      toggleFavorite,
      isFavorite,
    }),
    [openCommandPalette, destinations, favorites, toggleFavorite, isFavorite],
  );

  return (
    <NavQuickAccessContext.Provider value={value}>
      {children}
      <NavCommandPalette
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        destinations={destinations}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        isFavorite={isFavorite}
      />
    </NavQuickAccessContext.Provider>
  );
}
