"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { getLocalizedAccountName } from "@/features/accounting/chart-of-accounts/chart-of-accounts.naming";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AccountOption } from "@/types/api";

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function getArabicAccountLabel(account: Pick<AccountOption, "name" | "nameAr">) {
  return account.nameAr?.trim() || account.name?.trim() || "";
}

function formatAccountDisplayLabel(
  account: AccountOption,
  displayMode: "arabicOnly" | "localized",
  language: string,
) {
  if (displayMode === "arabicOnly") {
    return getArabicAccountLabel(account);
  }

  return `${account.code} · ${getLocalizedAccountName(account, language)}`;
}

export function AccountAutocomplete({
  accounts,
  value,
  onChange,
  displayMode = "localized",
  placeholder,
  clearLabel,
  inputClassName,
}: {
  accounts: AccountOption[];
  value: string;
  onChange: (nextAccountId: string) => void;
  displayMode?: "arabicOnly" | "localized";
  placeholder?: string;
  clearLabel?: string;
  inputClassName?: string;
}) {
  const { t, language } = useTranslation();
  const isArabicOnly = displayMode === "arabicOnly";
  const textDirection = isArabicOnly ? "rtl" : language === "ar" ? "rtl" : "ltr";
  const textAlign = isArabicOnly || language === "ar" ? "text-right" : "text-left";

  const selected = accounts.find((account) => account.id === value) ?? null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuRect, setMenuRect] = useState<{ left: number; top: number; width: number } | null>(
    null,
  );

  const filtered = useMemo(() => {
    const q = normalizeSearchText(query);
    if (!q) return accounts.slice(0, 50);

    const starts: AccountOption[] = [];
    const contains: AccountOption[] = [];

    for (const account of accounts) {
      const hay = normalizeSearchText(`${account.code} ${account.name} ${account.nameAr ?? ""}`);
      if (hay.startsWith(q)) starts.push(account);
      else if (hay.includes(q)) contains.push(account);
      if (starts.length + contains.length >= 50) break;
    }

    return [...starts, ...contains];
  }, [accounts, query]);

  const displayValue = open
    ? query
    : selected
      ? formatAccountDisplayLabel(selected, displayMode, language)
      : "";

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);

    const updateRect = () => {
      const el = inputRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMenuRect({ left: rect.left, top: rect.bottom + 6, width: rect.width });
    };

    updateRect();

    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      const menu = menuRef.current;
      if (!root) return;
      if (event.target instanceof Node && root.contains(event.target)) return;
      if (event.target instanceof Node && menu?.contains(event.target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const resolvedPlaceholder =
    placeholder ??
    (isArabicOnly
      ? t("posMarket.settings.searchAccount")
      : t("journal.accountSelect.searchPlaceholder"));
  const resolvedClearLabel = clearLabel ?? t("journal.accountSelect.placeholder");

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        dir={textDirection}
        value={displayValue}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            setOpen(true);
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) => Math.min(index + 1, filtered.length));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          }
          if (event.key === "Enter") {
            if (!open) return;
            event.preventDefault();
            if (activeIndex === 0) {
              onChange("");
            } else {
              const pick = filtered[activeIndex - 1];
              if (pick) onChange(pick.id);
            }
            setQuery("");
            setOpen(false);
          }
        }}
        placeholder={resolvedPlaceholder}
        className={cn(
          "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40",
          textAlign,
          isArabicOnly && "arabic-auto",
          inputClassName,
        )}
      />

      {open && menuRect
        ? createPortal(
            <div
              ref={menuRef}
              dir={textDirection}
              className="fixed z-[1000] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
              style={{ left: menuRect.left, top: menuRect.top, width: menuRect.width }}
            >
              <div className="max-h-64 overflow-auto">
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange("");
                    setQuery("");
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-xs text-gray-500 hover:bg-gray-50",
                    textAlign,
                    activeIndex === 0 && "bg-teal-500/10",
                  )}
                >
                  {resolvedClearLabel}
                </button>
                {filtered.map((account, index) => {
                  const isActive = activeIndex === index + 1;
                  const label =
                    displayMode === "arabicOnly"
                      ? getArabicAccountLabel(account)
                      : getLocalizedAccountName(account, language);

                  return (
                    <button
                      key={account.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index + 1)}
                      onClick={() => {
                        onChange(account.id);
                        setQuery("");
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-xs hover:bg-gray-50",
                        textAlign,
                        isActive && "bg-teal-500/10",
                        isArabicOnly && "arabic-auto",
                      )}
                    >
                      {displayMode === "localized" ? (
                        <>
                          <span
                            className={cn(
                              "font-mono text-gray-500",
                              language === "ar" ? "ml-2" : "mr-2",
                            )}
                          >
                            {account.code}
                          </span>
                          <span className="text-gray-900">{label}</span>
                        </>
                      ) : (
                        <span className="text-gray-900">{label}</span>
                      )}
                    </button>
                  );
                })}
                {filtered.length === 0 ? (
                  <div className={cn("px-3 py-3 text-xs text-gray-500", textAlign)}>
                    {t("journal.accountSelect.noMatches")}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
