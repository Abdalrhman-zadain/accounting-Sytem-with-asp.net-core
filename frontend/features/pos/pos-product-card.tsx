"use client";

import {
  LuPackage,
  LuStar,
  LuCpu,
  LuCar,
  LuCake,
  LuCupSoda,
  LuLayers,
  LuTag,
} from "react-icons/lu";

import { isWeightSaleItem } from "@/features/pos/pos-weight-utils";
import { useTranslation } from "@/lib/i18n";
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

// Helper to determine product category visual style
function getCategoryVisuals(item: InventoryItem, language: string) {
  const cat = (
    item.itemCategory?.name ||
    item.itemGroup?.name ||
    item.category ||
    (item.trackInventory ? "Inventory" : "Services")
  ).toLowerCase();

  const name = item.name.toLowerCase();

  if (cat.includes("drink") || cat.includes("beverage") || cat.includes("مشروب") || name.includes("cola") || name.includes("juice")) {
    return {
      bg: "bg-[#e0f2fe]/90 text-[#0369a1] border-[#bae6fd]",
      icon: LuCupSoda,
      label: language === "ar" ? "مشروب" : "Drink",
    };
  }
  if (cat.includes("food") || cat.includes("meal") || cat.includes("طعام") || cat.includes("cake") || cat.includes("كيك") || name.includes("cake") || name.includes("sweet")) {
    return {
      bg: "bg-[#fef3c7]/90 text-[#b45309] border-[#fde68a]",
      icon: LuCake,
      label: language === "ar" ? "طعام" : "Food",
    };
  }
  if (cat.includes("computer") || cat.includes("tech") || cat.includes("laptop") || cat.includes("شاشة") || cat.includes("electronics") || cat.includes("كمبيوتر") || name.includes("computer") || name.includes("ram") || name.includes("pc")) {
    return {
      bg: "bg-[#e0e7ff]/90 text-[#4338ca] border-[#c7d2fe]",
      icon: LuCpu,
      label: language === "ar" ? "إلكترونيات" : "Tech",
    };
  }
  if (cat.includes("car") || cat.includes("auto") || cat.includes("vehicle") || cat.includes("سيارة") || name.includes("car") || name.includes("toyota") || name.includes("tire")) {
    return {
      bg: "bg-[#fee2e2]/90 text-[#b91c1c] border-[#fecaca]",
      icon: LuCar,
      label: language === "ar" ? "سيارات" : "Automotive",
    };
  }
  if (!item.trackInventory || cat.includes("service") || cat.includes("خدمة")) {
    return {
      bg: "bg-[#dcfce7]/90 text-[#15803d] border-[#bbf7d0]",
      icon: LuLayers,
      label: language === "ar" ? "خدمة" : "Service",
    };
  }
  
  const defaultLabel = item.itemCategory?.name || item.category || "Item / صنف";
  return {
    bg: "bg-[#f1f5f9]/90 text-[#475569] border-[#e2e8f0]",
    icon: LuPackage,
    label: getLocalizedText(defaultLabel, language),
  };
}

function getLocalizedText(text: string, language: string) {
  if (!text) return text;
  const parts = text.split(" / ");
  if (parts.length > 1) {
    return language === "ar" ? parts[1].trim() : parts[0].trim();
  }
  return text;
}

export function PosProductCard({
  item,
  currencyCode,
  onAdd,
  isFavorite,
  onToggleFavorite,
  allowNegativeStock,
  disabled,
}: {
  item: InventoryItem;
  currencyCode: string;
  onAdd: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  allowNegativeStock?: boolean;
  disabled?: boolean;
}) {
  const { language } = useTranslation();
  const price = parseAmount(item.defaultSalesPrice);
  const qty = parseAmount(item.onHandQuantity);
  const reorderLevel = parseAmount(item.reorderLevel);
  const lowStock =
    item.trackInventory && qty > 0 && reorderLevel > 0 && qty <= reorderLevel;
  const blockedNoStock = item.trackInventory && qty <= 0 && !allowNegativeStock;
  const isDisabled = disabled || blockedNoStock;

  const visuals = getCategoryVisuals(item, language);
  const CategoryIcon = visuals.icon;
  const sellByWeight = isWeightSaleItem(item);
  const unitCode = item.unitOfMeasure?.trim() || "KG";

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      onClick={isDisabled ? undefined : onAdd}
      onKeyDown={(event) => {
        if (isDisabled) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onAdd();
        }
      }}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-[16px] bg-white p-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 select-none sm:p-3",
        isDisabled
          ? "opacity-60 cursor-not-allowed"
          : "cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.08)] active:scale-[0.98]"
      )}
    >
      {/* Product Image Area */}
      <div className="relative mb-2.5 aspect-[4/3] w-full overflow-hidden rounded-[12px] bg-[#f8faf9] sm:mb-3">
        {item.itemImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.itemImageUrl}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 mix-blend-multiply"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <LuPackage className="h-8 w-8 text-slate-200 transition-transform duration-300 group-hover:scale-105" />
          </div>
        )}
      </div>

      {/* Product Name */}
      <p className="line-clamp-2 min-h-[2.5rem] px-1 text-[13px] font-semibold leading-5 text-slate-800 transition-colors duration-200 group-hover:text-slate-900 arabic-heading sm:text-[14px]">
        {getLocalizedText(item.name, language)}
      </p>

      {/* Footer: Category Pill and Price */}
      <div className="mt-auto flex items-end justify-between gap-2 px-1 pt-2">
        {/* Pastel Category Badge */}
        <span
          className={cn(
            "max-w-full truncate rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide",
            // Fallback classes if visuals.bg doesn't contain bg colors
            visuals.bg.replace("border", "border-none").replace("text-", "text-opacity-80 text-")
          )}
        >
          {visuals.label}
        </span>

        {/* Price */}
        <span className="shrink-0 text-[13px] font-bold text-slate-900 sm:text-[14px]" dir="ltr">
          {sellByWeight
            ? `${formatCurrency(price, currencyCode)} / ${unitCode}`
            : formatCurrency(price, currencyCode)}
        </span>
      </div>
    </div>
  );
}
