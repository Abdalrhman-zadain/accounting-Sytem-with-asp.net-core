/**
 * Generates KOT + customer receipt previews by order type.
 * Run: npm test -- --run scripts/preview-kot-receipt.test.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "vitest";
import {
  buildKitchenDeltaTicketHtml,
  buildKitchenOrderTicketHtml,
  buildKitchenVoidTicketHtml,
} from "@/features/pos/pos-kot-print";
import {
  buildPosReceiptHtml,
  normalizeReceiptForArabicPrint,
  type PosReceiptData,
} from "@/features/pos/pos-receipt-print";
import type { KitchenDeltaLine } from "@/features/pos/pos-kitchen-print-delta";
import type { PosSale } from "@/types/api";

const PREVIEW_DIR = join(process.cwd(), ".receipt-preview");

function baseSale(overrides: Partial<PosSale> = {}): PosSale {
  return {
    id: "sale-1",
    reference: "POS-1042",
    invoiceDate: "2026-06-18T17:00:00.000Z",
    status: "DRAFT",
    invoiceType: "POS",
    currencyCode: "JOD",
    description: "بدون بصل",
    subtotalAmount: "10.00",
    discountAmount: "0.00",
    taxAmount: "1.60",
    totalAmount: "11.60",
    allocatedAmount: "0.00",
    outstandingAmount: "11.60",
    posOperationalStatus: "HELD",
    posAccountingStatus: "UNPOSTED",
    posCompletedAt: null,
    posVoidedAt: null,
    posVoidReason: null,
    posReviewedAt: null,
    posReviewedByUserId: null,
    posReviewNotes: null,
    posChangeAmount: null,
    orderType: "DINE_IN",
    originalOrderType: "DINE_IN",
    tableId: "t1",
    waiterId: "w1",
    waiterConfirmedAt: null,
    serviceChargeAmount: "0.00",
    deliveryFeeAmount: "0.00",
    deliveryStatus: null,
    deliveryAddress: null,
    deliveryNotes: null,
    deliveryCompanyId: null,
    deliveryCollectionMethod: null,
    deliverySettlementStatus: null,
    deliverySettledAmount: "0.00",
    driverId: null,
    isCorrected: false,
    correctedAt: null,
    correctionReason: null,
    postedAt: null,
    journalEntry: null,
    session: null,
    customer: null,
    table: { id: "t1", tableNumber: "12" },
    waiter: { id: "w1", name: "أحمد", email: "ahmed@example.com" },
    deliveryCompany: null,
    driver: null,
    lines: [
      {
        id: "line-1",
        lineNumber: 1,
        itemId: "item-1",
        itemName: "شاورما دجاج",
        description: "حار جداً",
        quantity: "2",
        unitPrice: "5.00",
        discountAmount: "0.00",
        taxAmount: "0.80",
        lineSubtotalAmount: "10.00",
        lineAmount: "10.80",
        revenueAccountId: "rev-1",
        taxId: "tax-1",
        kitchenSentAt: "2026-06-18T17:00:00.000Z",
        kitchenItemStatus: "NEW",
        modifiers: {
          addons: [
            {
              groupId: "g1",
              groupName: "صوصات",
              optionId: "o1",
              name: "ثومية",
              priceAdjustment: 0.5,
            },
          ],
        },
        item: null,
        warehouse: null,
      },
    ],
    ...overrides,
  } as PosSale;
}

function customerReceipt(overrides: Partial<PosReceiptData> = {}): PosReceiptData {
  return {
    receiptNumber: "RECEIPT-20260618-1042",
    soldAt: "2026-06-18T17:05:00.000Z",
    companyName: "",
    branchName: "عمان",
    cashierName: "كاشير",
    warehouseName: "Main",
    orderType: "DINE_IN",
    tableNumber: "12",
    waiterName: "أحمد",
    payments: [{ paymentMethod: "CASH", amount: 11.6 }],
    total: 11.6,
    paid: 11.6,
    tendered: 11.6,
    change: 0,
    subtotal: 10,
    discount: 0,
    tax: 1.6,
    taxRatePercent: 16,
    paymentSummary: "",
    lines: [
      {
        name: "شاورما دجاج",
        quantity: 2,
        unitPrice: 5,
        discountAmount: 0,
        taxAmount: 0.8,
        lineTotal: 10.8,
        modifiers: {
          addons: [
            {
              groupId: "g1",
              groupName: "صوصات",
              optionId: "o1",
              name: "ثومية",
              priceAdjustment: 0.5,
            },
          ],
        },
      },
    ],
    ...overrides,
  };
}

describe("kot and receipt preview generator", () => {
  it("writes order-type comparison previews", () => {
    mkdirSync(PREVIEW_DIR, { recursive: true });

    const dineIn = baseSale({ orderType: "DINE_IN", originalOrderType: "DINE_IN" });
    const takeaway = baseSale({
      orderType: "TAKEAWAY",
      originalOrderType: "TAKEAWAY",
      table: null,
      tableId: null,
      waiter: null,
      waiterId: null,
      description: "على السريع",
    });
    const delivery = baseSale({
      orderType: "DELIVERY",
      originalOrderType: "DELIVERY",
      table: null,
      tableId: null,
      deliveryAddress: "شارع الملكة رانيا، عمّان",
      deliveryNotes: "اتصل عند الوصول",
      deliveryCompany: { id: "dc1", name: "Talabat", arabicName: "طلبات" },
      driver: { id: "d1", name: "خالد", email: "k@example.com" },
      deliveryFeeAmount: "1.50",
    });

    writeFileSync(
      join(PREVIEW_DIR, "kot-dine-in.html"),
      buildKitchenOrderTicketHtml(dineIn, "ar"),
    );
    writeFileSync(
      join(PREVIEW_DIR, "kot-takeaway.html"),
      buildKitchenOrderTicketHtml(takeaway, "ar"),
    );
    writeFileSync(
      join(PREVIEW_DIR, "kot-delivery.html"),
      buildKitchenOrderTicketHtml(delivery, "ar"),
    );

    const deltaLine: KitchenDeltaLine = {
      salesInvoiceLineId: "line-1",
      name: "بطاطا كبيرة",
      qty: 1,
      modifiers: null,
      lineNote: null,
    };
    writeFileSync(
      join(PREVIEW_DIR, "kot-update.html"),
      buildKitchenDeltaTicketHtml(dineIn, [deltaLine], "ar"),
    );
    writeFileSync(
      join(PREVIEW_DIR, "kot-void.html"),
      buildKitchenVoidTicketHtml(dineIn, [deltaLine], "ar"),
    );

    writeFileSync(
      join(PREVIEW_DIR, "customer-dine-in.html"),
      buildPosReceiptHtml(normalizeReceiptForArabicPrint(customerReceipt())),
    );
    writeFileSync(
      join(PREVIEW_DIR, "customer-takeaway.html"),
      buildPosReceiptHtml(
        normalizeReceiptForArabicPrint(
          customerReceipt({
            orderType: "TAKEAWAY",
            tableNumber: null,
            waiterName: null,
          }),
        ),
      ),
    );
    writeFileSync(
      join(PREVIEW_DIR, "customer-delivery.html"),
      buildPosReceiptHtml(
        normalizeReceiptForArabicPrint(
          customerReceipt({
            orderType: "DELIVERY",
            tableNumber: null,
            waiterName: null,
            deliveryAddress: "شارع الملكة رانيا، عمّان",
            deliveryNotes: "اتصل عند الوصول",
            deliveryCompanyName: "طلبات",
            driverName: "خالد",
            deliveryFeeAmount: 1.5,
            total: 13.1,
            paid: 13.1,
            tendered: 13.1,
            payments: [{ paymentMethod: "CASH", amount: 13.1 }],
          }),
        ),
      ),
    );

    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>KOT vs Customer Receipt Previews</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; background: #f0f0f0; }
    h1 { margin-bottom: 8px; }
    h2 { margin: 32px 0 12px; border-bottom: 2px solid #333; padding-bottom: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .card { background: #fff; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; }
    .card h3 { margin: 0; padding: 10px 14px; background: #eee; font-size: 14px; }
    iframe { width: 100%; height: 640px; border: 0; }
    a { display: block; padding: 8px 14px; font-size: 13px; }
  </style>
</head>
<body>
  <h1>Kitchen (KOT) vs Customer Receipt — by order type</h1>
  <h2>Dine-in (طاولة)</h2>
  <div class="grid">
    <div class="card"><h3>Kitchen ticket</h3><iframe src="kot-dine-in.html"></iframe><a href="kot-dine-in.html" target="_blank">Open KOT</a></div>
    <div class="card"><h3>Customer receipt</h3><iframe src="customer-dine-in.html"></iframe><a href="customer-dine-in.html" target="_blank">Open receipt</a></div>
  </div>
  <h2>Takeaway (سفري)</h2>
  <div class="grid">
    <div class="card"><h3>Kitchen ticket</h3><iframe src="kot-takeaway.html"></iframe><a href="kot-takeaway.html" target="_blank">Open KOT</a></div>
    <div class="card"><h3>Customer receipt</h3><iframe src="customer-takeaway.html"></iframe><a href="customer-takeaway.html" target="_blank">Open receipt</a></div>
  </div>
  <h2>Delivery (توصيل)</h2>
  <div class="grid">
    <div class="card"><h3>Kitchen ticket</h3><iframe src="kot-delivery.html"></iframe><a href="kot-delivery.html" target="_blank">Open KOT</a></div>
    <div class="card"><h3>Customer receipt</h3><iframe src="customer-delivery.html"></iframe><a href="customer-delivery.html" target="_blank">Open receipt</a></div>
  </div>
  <h2>Kitchen delta tickets</h2>
  <div class="grid">
    <div class="card"><h3>تحديث مطبخ (ADD)</h3><iframe src="kot-update.html"></iframe></div>
    <div class="card"><h3>إلغاء (VOID)</h3><iframe src="kot-void.html"></iframe></div>
  </div>
</body>
</html>`;

    writeFileSync(join(PREVIEW_DIR, "kot-index.html"), indexHtml);
    console.log(`Previews written to: ${PREVIEW_DIR}`);
  });
});
