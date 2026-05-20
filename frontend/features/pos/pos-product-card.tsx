"use client";

import { LuPackage, LuStar } from "react-icons/lu";

import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/types/api";

function parseAmount(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number, currency = "JOD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function PosProductCard({
  item,
  currencyCode,
  onAdd,
  isFavorite,
  onToggleFavorite,
  allowNegativeStock,
}: {
  item: InventoryItem;
  currencyCode: string;
  onAdd: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  allowNegativeStock?: boolean;
}) {
  const price = parseAmount(item.defaultSalesPrice);
  const qty = parseAmount(item.onHandQuantity);
  const reorderLevel = parseAmount(item.reorderLevel);
  const lowStock =
    item.trackInventory && qty > 0 && reorderLevel > 0 && qty <= reorderLevel;
  const blockedNoStock = item.trackInventory && qty <= 0 && !allowNegativeStock;

  return (
    <div className="flex min-h-[244px] flex-col overflow-hidden rounded-[7px] border border-[#e8ecea] bg-white shadow-[0_1px_2px_rgba(31,49,39,0.04)] transition hover:border-[#d9e1dd] hover:shadow-[0_6px_18px_-14px_rgba(31,49,39,0.5)]">
      <div className="relative flex h-[122px] w-full items-center justify-center overflow-hidden bg-[#f2f4f3]">
        {item.itemImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.itemImageUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <LuPackage className="h-7 w-7 text-[#cbd4cf]" />
          </div>
        )}
        {onToggleFavorite ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={cn(
              "absolute right-1.5 top-1.5 rounded-full border bg-white/90 p-1.5 shadow-sm transition hover:bg-white",
              isFavorite ? "border-amber-400 text-amber-500" : "border-[#dfe8e1] text-[#9fb0a4]",
            )}
            title="Favorite / مفضلة"
          >
            <LuStar className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
          </button>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col px-2.5 py-2">
        <p className="truncate text-[12px] font-bold leading-5 text-[#223328] arabic-heading">{item.name}</p>
        <p className="mt-0.5 truncate text-[10px] font-medium text-[#8a9690]">
          {item.code}
          {item.barcode ? ` · ${item.barcode}` : ""}
        </p>
        <p className="mt-2 text-[12px] font-bold text-[#223328]">{formatCurrency(price, currencyCode)}</p>
        <p
          className={cn(
            "text-[10px] font-semibold",
            blockedNoStock ? "text-[#b85c52]" : lowStock ? "text-[#b08040]" : "text-[#5a8a62]",
          )}
        >
          {item.trackInventory
            ? lowStock
              ? `Low stock / مخزون منخفض: ${formatCount(qty)}`
              : `Stock / المخزون: ${formatCount(qty)}`
            : "Service / خدمة"}
        </p>
        <button
          type="button"
          onClick={onAdd}
          disabled={blockedNoStock}
          className="mt-auto min-h-[28px] w-full rounded-[4px] bg-[#5f8a67] py-1.5 text-[10px] font-black text-white transition hover:bg-[#527958] disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Add / إضافة
        </button>
      </div>
    </div>
  );
}
