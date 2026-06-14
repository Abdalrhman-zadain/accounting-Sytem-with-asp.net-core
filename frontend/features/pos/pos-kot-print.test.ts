import assert from "assert";
import { buildKitchenOrderTicketHtml } from "./pos-kot-print";
import type { PosSale } from "@/types/api";

const mockSale = {
  id: "sale-123",
  reference: "1001",
  invoiceDate: new Date().toISOString(),
  status: "DRAFT",
  invoiceType: "POS",
  currencyCode: "JOD",
  description: "الرجاء تسليم الطلب بسرعة", // Order note / description
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
  tableId: "table-1",
  waiterId: "waiter-1",
  waiterConfirmedAt: new Date().toISOString(),
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
  table: { id: "table-1", tableNumber: "5" },
  waiter: { id: "waiter-1", name: "أحمد", email: "ahmed@example.com" },
  deliveryCompany: null,
  driver: null,
  lines: [
    {
      id: "line-1",
      lineNumber: 1,
      itemId: "item-1",
      itemName: "شاورما دجاج عائلي",
      description: "بدون ثوم", // Line note
      quantity: "2",
      unitPrice: "5.00",
      discountAmount: "0.00",
      taxAmount: "0.80",
      lineSubtotalAmount: "10.00",
      lineAmount: "10.80",
      revenueAccountId: "rev-1",
      taxId: "tax-1",
      kitchenSentAt: new Date().toISOString(),
      kitchenItemStatus: "NEW",
      modifiers: {
        addons: [
          {
            groupId: "g-1",
            groupName: "صوصات إضافية", // Addon group name
            optionId: "o-1",
            name: "مايونيز بالثوم", // Addon name
            priceAdjustment: 0.5,
          },
          {
            groupId: "g-2",
            groupName: "جبنة", // Addon group name
            optionId: "o-2",
            name: "جبنة شيدر مضاعفة", // Addon name
            priceAdjustment: 1.0,
          }
        ]
      },
      item: null,
      warehouse: null,
    }
  ]
};

console.log("Running KOT printing tests...");

// Test 1: Arabic locale KOT
const htmlAr = buildKitchenOrderTicketHtml(mockSale as unknown as PosSale, "ar");

// Verify Arabic details
assert.ok(htmlAr.includes("تذكرة مطبخ"), "KOT Title should be in Arabic");
assert.ok(htmlAr.includes("طاولة 5"), "Table number should be formatted correctly in Arabic");
assert.ok(htmlAr.includes("أحمد"), "Waiter name should be displayed");
assert.ok(htmlAr.includes("شاورما دجاج عائلي"), "Item name should be displayed");

// Verify addon groups (مجموعات الاضافات)
assert.ok(htmlAr.includes("صوصات إضافية: مايونيز بالثوم"), "Addon group 'صوصات إضافية' and option name should be displayed");
assert.ok(htmlAr.includes("جبنة: جبنة شيدر مضاعفة"), "Addon group 'جبنة' and option name should be displayed");

// Verify notes (ملاحظات)
assert.ok(htmlAr.includes("ملاحظة: بدون ثوم"), "Line note should be displayed");
assert.ok(htmlAr.includes("الرجاء تسليم الطلب بسرعة"), "Order description/note should be displayed");

// Test 2: English locale KOT
const htmlEn = buildKitchenOrderTicketHtml(mockSale as unknown as PosSale, "en");

assert.ok(htmlEn.includes("Kitchen Ticket"), "KOT Title should be in English");
assert.ok(htmlEn.includes("Table 5"), "Table number should be formatted correctly in English");
assert.ok(htmlEn.includes("Note: بدون ثوم"), "Line note label should be in English");

console.log("All KOT printing tests passed successfully!");
