import type { IconType } from "react-icons";
import { LuShoppingBasket, LuStore, LuTruck } from "react-icons/lu";
import { extractDailyOrderNumber } from "@/features/pos/pos-receipt-print";
import type { PosOrderType, PosSaleHeldContext } from "@/types/api";

export type PosHeldSaleDisplay = {
  title: string;
  createdAt: string;
  orderType: PosOrderType;
  tableNumber?: string | null;
  waiterName?: string | null;
  customerName?: string | null;
  driverName?: string | null;
  deliveryCompanyName?: string | null;
  deliveryAddress?: string;
  orderNotes?: string;
  cartLines: Array<{ itemId: string; name: string }>;
  totalAmount: number;
  heldContext?: PosSaleHeldContext | null;
};

const STRIP_TEXT_MAX = 48;
const ADDRESS_SNIPPET_MAX = 36;

function isArabic(language: string) {
  return language === "ar";
}

function truncateText(value: string, max: number) {
  const trimmed = value.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1)}…`;
}

export function resolveHeldSaleOrderNumber(reference: string): string | null {
  return extractDailyOrderNumber(reference);
}

export function resolveHeldSaleTableNumber(sale: PosHeldSaleDisplay): string | null {
  return sale.heldContext?.tableNumber?.trim() || sale.tableNumber?.trim() || null;
}

export function resolveHeldSaleOrderType(sale: PosHeldSaleDisplay): PosOrderType {
  return sale.heldContext?.orderType ?? sale.orderType;
}

export function getHeldSaleOrderTypeStyles(orderType: PosOrderType) {
  if (orderType === "DINE_IN") {
    return {
      card: "border-[#f7cc9e] bg-[#fffaf4]",
      panel: "border-[#fed7aa] bg-[#fff7ed] text-[#7c2d12]",
      badge: "bg-[#ffedd5] text-[#9a3412] border-[#fdba74]",
      strip: "bg-[#ffedd5] text-[#9a3412] border-[#fdba74]",
      icon: LuStore as IconType,
    };
  }
  if (orderType === "DELIVERY") {
    return {
      card: "border-[#bfdbfe] bg-[#f8fbff]",
      panel: "border-[#bfdbfe] bg-[#eff6ff] text-[#1e3a8a]",
      badge: "bg-[#dbeafe] text-[#1d4ed8] border-[#93c5fd]",
      strip: "bg-[#dbeafe] text-[#1d4ed8] border-[#93c5fd]",
      icon: LuTruck as IconType,
    };
  }
  return {
    card: "border-[#bbf7d0] bg-[#f7fdf9]",
    panel: "border-[#bbf7d0] bg-[#f0fdf4] text-[#14532d]",
    badge: "bg-[#dcfce7] text-[#166534] border-[#86efac]",
    strip: "bg-[#dcfce7] text-[#166534] border-[#86efac]",
    icon: LuShoppingBasket as IconType,
  };
}

export function buildHeldSaleHeadline(sale: PosHeldSaleDisplay, language: string): string {
  const ar = isArabic(language);
  const orderType = resolveHeldSaleOrderType(sale);
  const orderNumber = resolveHeldSaleOrderNumber(sale.title);
  const orderSuffix = orderNumber ? (ar ? `طلب #${orderNumber}` : `Order #${orderNumber}`) : null;

  if (orderType === "DINE_IN") {
    const tableNumber = resolveHeldSaleTableNumber(sale);
    if (tableNumber) {
      return ar ? `طاولة ${tableNumber} · صالة` : `Table ${tableNumber} · Dine-in`;
    }
    return ar ? "صالة" : "Dine-in";
  }

  if (orderType === "TAKEAWAY") {
    const parts = [ar ? "سفري" : "Takeaway"];
    if (orderSuffix) {
      parts.push(orderSuffix);
    }
    if (sale.customerName?.trim()) {
      parts.push(sale.customerName.trim());
    }
    return parts.join(" · ");
  }

  const deliveryLabel = ar ? "توصيل" : "Delivery";
  const detail =
    sale.driverName?.trim() ||
    sale.customerName?.trim() ||
    truncateText(sale.deliveryAddress ?? "", ADDRESS_SNIPPET_MAX) ||
    null;
  return detail ? `${deliveryLabel} · ${detail}` : deliveryLabel;
}

export function buildHeldSaleIdentityStrip(sale: PosHeldSaleDisplay, language: string): string {
  const ar = isArabic(language);
  const orderType = resolveHeldSaleOrderType(sale);
  const parts: string[] = [];

  if (orderType === "DINE_IN") {
    parts.push(ar ? "صالة" : "Dine-in");
    const tableNumber = resolveHeldSaleTableNumber(sale);
    if (tableNumber) {
      parts.push(ar ? `طاولة ${tableNumber}` : `Table ${tableNumber}`);
    }
    if (sale.waiterName?.trim()) {
      parts.push(ar ? `نادل: ${sale.waiterName.trim()}` : `Waiter: ${sale.waiterName.trim()}`);
    }
  } else if (orderType === "DELIVERY") {
    parts.push(ar ? "توصيل" : "Delivery");
    if (sale.deliveryCompanyName?.trim()) {
      parts.push(sale.deliveryCompanyName.trim());
    } else if (sale.driverName?.trim()) {
      parts.push(sale.driverName.trim());
    }
    if (sale.deliveryAddress?.trim()) {
      parts.push(truncateText(sale.deliveryAddress, STRIP_TEXT_MAX));
    }
  } else {
    parts.push(ar ? "سفري" : "Takeaway");
    if (sale.customerName?.trim()) {
      parts.push(sale.customerName.trim());
    }
    if (sale.orderNotes?.trim()) {
      parts.push(truncateText(sale.orderNotes, STRIP_TEXT_MAX));
    }
  }

  return parts.join(" · ");
}

export function formatHeldSaleRelativeTime(
  iso: string,
  language: string,
  now: Date = new Date(),
): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) {
    return "—";
  }

  const diffMs = value.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);
  const locale = isArabic(language) ? "ar" : "en";
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absSec < 60) {
    return rtf.format(diffSec, "second");
  }
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, "minute");
  }
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) {
    return rtf.format(diffHour, "hour");
  }
  const diffDay = Math.round(diffHour / 24);
  return rtf.format(diffDay, "day");
}

export function buildHeldSaleMetaSummary(
  sale: PosHeldSaleDisplay,
  language: string,
  formattedTotal: string,
  relativeTime: string,
): string {
  const ar = isArabic(language);
  const orderNumber = resolveHeldSaleOrderNumber(sale.title);
  const count = sale.cartLines.length;
  const itemsLabel = ar
    ? `${count} ${count === 1 ? "صنف" : "أصناف"}`
    : `${count} ${count === 1 ? "item" : "items"}`;
  const orderPart = orderNumber ? (ar ? `طلب #${orderNumber}` : `Order #${orderNumber}`) : null;

  return [orderPart, itemsLabel, formattedTotal, relativeTime].filter(Boolean).join(" · ");
}
