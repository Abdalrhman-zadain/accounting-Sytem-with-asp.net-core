"use client";

import { useMemo, useRef, useState } from "react";
import { LuChevronDown, LuStore, LuX } from "react-icons/lu";

import { POS_MARKET_THEME } from "@/features/pos-market/pos-market-theme";
import { useTranslation } from "@/lib/i18n";

export type PosMarketDestinationOption = {
  id: string;
  code: string;
  name: string;
  contactInfo?: string | null;
};

type PosMarketDestinationPickerProps = {
  customers: PosMarketDestinationOption[];
  selectedCustomerId: string | null;
  onSelect: (customerId: string) => void;
  onClear: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  compact?: boolean;
};

export function PosMarketDestinationPicker({
  customers,
  selectedCustomerId,
  onSelect,
  onClear,
  disabled,
  isLoading,
  isError,
  compact = false,
}: PosMarketDestinationPickerProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [isListOpen, setIsListOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const marketCustomers = useMemo(
    () =>
      [...customers].sort((left, right) => {
        const leftMarket = left.code.startsWith("MKT-") ? 0 : 1;
        const rightMarket = right.code.startsWith("MKT-") ? 0 : 1;
        if (leftMarket !== rightMarket) return leftMarket - rightMarket;
        return left.name.localeCompare(right.name, "ar");
      }),
    [customers],
  );

  const selectedCustomer =
    marketCustomers.find((customer) => customer.id === selectedCustomerId) ?? null;

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return marketCustomers;
    return marketCustomers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) ||
        customer.code.toLowerCase().includes(term),
    );
  }, [marketCustomers, search]);

  const showList = isListOpen && !disabled && !isLoading && filteredCustomers.length > 0;

  return (
    <div
      ref={containerRef}
      className={compact ? "" : "rounded-2xl border p-3 sm:p-4"}
      style={
        compact
          ? undefined
          : {
              borderColor: POS_MARKET_THEME.colors.outline,
              backgroundColor: POS_MARKET_THEME.colors.cardSurface,
            }
      }
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node)) {
          setIsListOpen(false);
        }
      }}
    >
      <p
        className="mb-2 text-xs font-bold uppercase tracking-wide"
        style={{ color: POS_MARKET_THEME.colors.textMuted }}
      >
        {t("posMarket.destination.label")}
        <span className="ms-1 text-red-500">*</span>
      </p>

      {isLoading ? (
        <p className="text-sm" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
          {t("common.loading")}
        </p>
      ) : isError ? (
        <p className="text-sm text-red-600">{t("posMarket.destination.loadError")}</p>
      ) : selectedCustomer ? (
        <div
          className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5"
          style={{
            borderColor: POS_MARKET_THEME.colors.primary,
            backgroundColor: POS_MARKET_THEME.colors.primarySoft,
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <LuStore
              className="h-4 w-4 shrink-0"
              style={{ color: POS_MARKET_THEME.colors.primary }}
            />
            <div className="min-w-0">
              <p
                className="truncate text-sm font-semibold arabic-heading"
                style={{ color: POS_MARKET_THEME.colors.text }}
              >
                {selectedCustomer.name}
              </p>
              <p className="truncate text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
                {selectedCustomer.code}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={onClear}
            className="shrink-0 rounded-lg p-1.5 transition hover:bg-white disabled:opacity-40"
            title={t("posMarket.destination.clear")}
          >
            <LuX className="h-4 w-4" style={{ color: POS_MARKET_THEME.colors.textMuted }} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <LuStore className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            disabled={disabled || marketCustomers.length === 0}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setIsListOpen(true);
            }}
            onFocus={() => setIsListOpen(true)}
            placeholder={t("posMarket.destination.searchPlaceholder")}
            className="h-11 w-full rounded-xl border bg-white py-2 ps-9 pe-10 text-sm font-medium disabled:opacity-60 rtl:ps-3 rtl:pe-10"
            style={{
              borderColor: POS_MARKET_THEME.colors.outline,
              color: POS_MARKET_THEME.colors.text,
            }}
          />
          <LuChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          {showList ? (
            <div
              className="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border bg-white shadow-lg"
              style={{ borderColor: POS_MARKET_THEME.colors.outline }}
            >
              {filteredCustomers.slice(0, 12).map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(customer.id);
                    setSearch("");
                    setIsListOpen(false);
                  }}
                  className="flex w-full items-center gap-2 border-b px-3 py-2.5 text-start text-xs last:border-b-0 hover:bg-slate-50"
                  style={{ borderColor: POS_MARKET_THEME.colors.outline }}
                >
                  <LuStore className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="min-w-0">
                    <span
                      className="block truncate font-semibold arabic-heading"
                      style={{ color: POS_MARKET_THEME.colors.text }}
                    >
                      {customer.name}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {customer.code}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {search.trim() && filteredCustomers.length === 0 ? (
            <p className="mt-1 text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
              {t("posMarket.destination.notFound")}
            </p>
          ) : null}
          {marketCustomers.length === 0 ? (
            <p className="mt-1 text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
              {t("posMarket.destination.empty")}
            </p>
          ) : !search.trim() && isListOpen ? (
            <p className="mt-1 text-xs" style={{ color: POS_MARKET_THEME.colors.textMuted }}>
              {t("posMarket.destination.tapToChoose")}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
