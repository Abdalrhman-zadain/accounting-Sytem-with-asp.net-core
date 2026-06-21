"use client";

import { Card } from "@/components/ui";
import {
  buildHeldSaleHeadline,
  buildHeldSaleIdentityStrip,
  buildHeldSaleMetaSummary,
  formatHeldSaleRelativeTime,
  getHeldSaleOrderTypeStyles,
  resolveHeldSaleOrderType,
  resolveHeldSaleTableNumber,
  type PosHeldSaleDisplay,
} from "@/features/pos/pos-held-sale-display";
import type { DeliveryCollectionMethod } from "@/types/api";
import { cn, getLocalizedText } from "@/lib/utils";

export type PosHeldSaleCardLine = {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type PosHeldSaleCardSale = Omit<PosHeldSaleDisplay, "cartLines"> & {
  id: string;
  status: "DRAFT" | "HELD";
  orderNotes: string;
  tableId?: string | null;
  deliveryCollectionMethod?: DeliveryCollectionMethod | null;
  driverPhone?: string | null;
  deliveryFeeAmount: number;
  serviceChargeAmount: number;
  cartLines: PosHeldSaleCardLine[];
};

function formatHeldSaleCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatHeldSaleDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function HeldSaleKindBadges({
  sale,
  t,
}: {
  sale: PosHeldSaleCardSale;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const ctx = sale.heldContext;
  const source = ctx?.source ?? (sale.status === "DRAFT" ? "DRAFT" : "HELD");
  const sourceStyles: Record<string, string> = {
    DRAFT: "bg-[#eef3ef] text-[#46644b] border-[#d7e5da]",
    HELD: "bg-[#fff4e8] text-[#9a6b2f] border-[#f0dcc0]",
    RESERVATION_PREORDER: "bg-[#f3ecff] text-[#6b4f9a] border-[#e2d4f7]",
    TABLE_ORDER: "bg-[#e8f2ff] text-[#3d628a] border-[#cfe0f5]",
  };
  const sourceLabels: Record<string, string> = {
    DRAFT: t("pos.held.kind.DRAFT"),
    HELD: t("pos.held.kind.HELD"),
    RESERVATION_PREORDER: t("pos.held.kind.RESERVATION"),
    TABLE_ORDER: t("pos.held.kind.TABLE_ORDER"),
  };

  const badges: Array<{ key: string; label: string; className: string }> = [
    {
      key: "source",
      label: sourceLabels[source] ?? sourceLabels.DRAFT,
      className: sourceStyles[source] ?? sourceStyles.DRAFT,
    },
  ];

  const orderType = resolveHeldSaleOrderType(sale);
  badges.push({
    key: "orderType",
    label: t(`pos.orderType.${orderType}`),
    className: "bg-[#f6f7f8] text-[#5f6d66] border-[#dfe8e1]",
  });

  const tableNumber = resolveHeldSaleTableNumber(sale);
  if (tableNumber) {
    badges.push({
      key: "table",
      label: t("pos.held.tableLabel", { number: tableNumber }),
      className: "bg-[#f6f7f8] text-[#5f6d66] border-[#dfe8e1]",
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            key={badge.key}
            className={cn(
              "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        ))}
      </div>
      {ctx?.reservedFrom && ctx.reservedTo ? (
        <div className="text-xs text-[#728579]">
          {t("pos.held.reservationWindow", {
            from: formatHeldSaleDateTime(ctx.reservedFrom),
            to: formatHeldSaleDateTime(ctx.reservedTo),
          })}
        </div>
      ) : null}
    </div>
  );
}

export function HeldSaleOrderTypeInfo({
  sale,
  language,
  currencyCode,
}: {
  sale: PosHeldSaleCardSale;
  language: string;
  currencyCode: string;
}) {
  const isAr = language === "ar";
  const styles = getHeldSaleOrderTypeStyles(resolveHeldSaleOrderType(sale));
  const Icon = styles.icon;
  const rows: Array<{ label: string; value: string | null | undefined }> = [];

  if (sale.orderType === "DINE_IN") {
    rows.push(
      {
        label: isAr ? "الطاولة" : "Table",
        value: resolveHeldSaleTableNumber(sale) ?? sale.tableId ?? null,
      },
      {
        label: isAr ? "النادل" : "Waiter",
        value: sale.waiterName,
      },
      {
        label: isAr ? "رسوم الخدمة" : "Service",
        value:
          sale.serviceChargeAmount > 0
            ? formatHeldSaleCurrency(sale.serviceChargeAmount, currencyCode)
            : null,
      },
    );
  } else if (sale.orderType === "DELIVERY") {
    rows.push(
      {
        label: isAr ? "التحصيل" : "Collection",
        value:
          sale.deliveryCollectionMethod === "COMPANY"
            ? isAr
              ? "شركة التوصيل"
              : "Delivery company"
            : sale.deliveryCollectionMethod
              ? isAr
                ? "المطعم"
                : "Restaurant"
              : null,
      },
      {
        label: isAr ? "الشركة" : "Company",
        value: sale.deliveryCompanyName,
      },
      {
        label: isAr ? "السائق" : "Driver",
        value: sale.driverName,
      },
      {
        label: isAr ? "هاتف السائق" : "Driver phone",
        value: sale.driverPhone,
      },
      {
        label: isAr ? "العنوان" : "Address",
        value: sale.deliveryAddress,
      },
      {
        label: isAr ? "رسوم التوصيل" : "Delivery fee",
        value:
          sale.deliveryFeeAmount > 0
            ? formatHeldSaleCurrency(sale.deliveryFeeAmount, currencyCode)
            : null,
      },
    );
  } else {
    rows.push(
      {
        label: isAr ? "العميل" : "Customer",
        value: sale.customerName,
      },
      {
        label: isAr ? "ملاحظات الطلب" : "Order notes",
        value: sale.orderNotes,
      },
      {
        label: isAr ? "القناة" : "Channel",
        value: isAr ? "سفري" : "Takeaway",
      },
    );
  }

  const visibleRows = rows.filter((row) => row.value);

  return (
    <div className={cn("mt-4 rounded-[18px] border px-4 py-3", styles.panel)}>
      <div className="mb-2 flex items-center gap-2 text-xs font-black">
        <Icon className="h-4 w-4" />
        <span>{isAr ? "تفاصيل نوع الطلب" : "Order type details"}</span>
      </div>
      {visibleRows.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {visibleRows.map((row) => (
            <div key={row.label} className="min-w-0">
              <div className="text-[10px] font-black uppercase opacity-70">
                {row.label}
              </div>
              <div className="truncate text-xs font-bold">{row.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs font-bold opacity-80">
          {isAr ? "لا توجد تفاصيل إضافية" : "No extra details"}
        </div>
      )}
    </div>
  );
}

export function PosHeldSaleCard({
  sale,
  language,
  currencyCode,
  resumeLabel,
  t,
  onResume,
  onVoid,
  isVoiding = false,
}: {
  sale: PosHeldSaleCardSale;
  language: string;
  currencyCode: string;
  resumeLabel: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onResume: () => void;
  onVoid: () => void;
  isVoiding?: boolean;
}) {
  const orderType = resolveHeldSaleOrderType(sale);
  const orderTypeStyles = getHeldSaleOrderTypeStyles(orderType);
  const Icon = orderTypeStyles.icon;
  const headline = buildHeldSaleHeadline(sale, language);
  const identityStrip = buildHeldSaleIdentityStrip(sale, language);
  const relativeTime = formatHeldSaleRelativeTime(sale.createdAt, language);
  const formattedTotal = formatHeldSaleCurrency(sale.totalAmount, currencyCode);
  const metaSummary = buildHeldSaleMetaSummary(
    sale,
    language,
    formattedTotal,
    relativeTime,
  );

  return (
    <Card className={cn("overflow-hidden rounded-[28px] p-0", orderTypeStyles.card)}>
      <div
        className={cn(
          "flex items-center gap-2 border-b px-4 py-2.5 text-xs font-black",
          orderTypeStyles.strip,
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 truncate">{identityStrip}</span>
      </div>

      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-lg font-black text-[#233329] arabic-auto">{headline}</div>
            <div className="mt-2 text-sm font-semibold text-[#42564a] arabic-auto">
              {metaSummary}
            </div>
            <div className="mt-1 text-xs text-[#728579]">
              {t("pos.held.reference", { reference: sale.title })}
            </div>
            <div className="mt-3">
              <HeldSaleKindBadges sale={sale} t={t} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-black",
                orderTypeStyles.badge,
              )}
            >
              {t(`pos.orderType.${orderType}`)}
            </span>
            <span className="rounded-full bg-[#eef3ef] px-3 py-1 text-xs font-bold text-[#46644b]">
              {t("pos.held.linesCount", { count: sale.cartLines.length })}
            </span>
          </div>
        </div>

        <HeldSaleOrderTypeInfo
          sale={sale}
          language={language}
          currencyCode={currencyCode}
        />

        <div className="mt-4 space-y-2 text-sm text-[#5f6d66]">
          {sale.cartLines.slice(0, 4).map((line) => (
            <div
              key={`${sale.id}-${line.itemId}`}
              className="flex items-center justify-between gap-3"
            >
              <span>{getLocalizedText(line.name, language)}</span>
              <span>
                {line.quantity} x {formatHeldSaleCurrency(line.unitPrice, currencyCode)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onResume}
            className="rounded-full bg-[#46644b] px-4 py-2 text-xs font-bold text-white"
          >
            {resumeLabel}
          </button>
          <button
            type="button"
            onClick={onVoid}
            disabled={isVoiding}
            className="rounded-full border border-[#ead7d5] px-4 py-2 text-xs font-bold text-[#8f5a55] disabled:opacity-40"
          >
            {t("pos.sales.voidAction")}
          </button>
        </div>
      </div>
    </Card>
  );
}
