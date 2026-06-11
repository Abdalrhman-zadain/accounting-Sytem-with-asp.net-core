"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LuSearch } from "react-icons/lu";

import type { AccountOption } from "@/types/api";
import { cn, formatCurrency } from "@/lib/utils";
import type { TranslationFn } from "../reporting-types";

function getLocalizedAccountName(option: AccountOption, language: string) {
  if (language === "ar") {
    return option.nameAr?.trim() || option.name;
  }

  return option.name?.trim() || option.nameAr?.trim() || "";
}

function formatAccountLabel(option: AccountOption, language: string) {
  return `${option.code} · ${getLocalizedAccountName(option, language)}`;
}

type GeneralLedgerAccountSearchProps = {
  accounts: AccountOption[];
  value: string;
  language: string;
  t: TranslationFn;
  onSelect: (accountId: string) => void;
};

export function GeneralLedgerAccountSearch({ accounts, value, language, t, onSelect }: GeneralLedgerAccountSearchProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = useMemo(() => accounts.find((option) => option.id === value) ?? null, [accounts, value]);

  const filteredOptions = useMemo(() => {
    const input = query.trim().toLowerCase();
    if (!input) {
      return accounts.slice(0, 50);
    }

    return accounts.filter((option) =>
      [option.code, option.name, option.nameAr ?? "", option.currencyCode].some((field) => field.toLowerCase().includes(input)),
    );
  }, [accounts, query]);

  useEffect(() => {
    setQuery(selectedOption ? formatAccountLabel(selectedOption, language) : "");
  }, [language, selectedOption]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <LuSearch className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 ltr:left-3 rtl:right-3" />
        <input
          value={query}
          placeholder={t("reporting.generalLedger.searchPlaceholder")}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }

            if (event.key === "Enter" && filteredOptions.length > 0) {
              event.preventDefault();
              const nextOption = filteredOptions[0];
              onSelect(nextOption.id);
              setQuery(formatAccountLabel(nextOption, language));
              setIsOpen(false);
            }
          }}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm font-medium text-gray-900 outline-none transition placeholder:font-normal placeholder:text-gray-500 focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-500/40 ltr:pl-10 ltr:pr-4 rtl:pl-4 rtl:pr-10"
          aria-label={t("reporting.filter.generalLedgerAccount")}
        />
      </div>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-72 overflow-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500">{t("reporting.generalLedger.searchEmpty")}</div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option.id === value;

              return (
                <button
                  key={option.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelect(option.id);
                    setQuery(formatAccountLabel(option, language));
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start justify-between gap-4 rounded-xl px-3 py-2.5 text-start transition hover:bg-gray-50",
                    isSelected && "bg-teal-50",
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-bold text-teal-600">{option.code}</div>
                    <div className="truncate text-sm font-semibold text-gray-900">{getLocalizedAccountName(option, language)}</div>
                  </div>
                  <div className="shrink-0 text-end">
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">{option.currencyCode}</div>
                    <div className="text-xs text-gray-500">{formatCurrency(option.currentBalance)}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
