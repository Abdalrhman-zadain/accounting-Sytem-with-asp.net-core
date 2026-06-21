/**
 * Generates HTML receipt previews for local visual inspection.
 * Run: npm test -- --run scripts/preview-pos-receipt.test.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "vitest";
import {
  buildPosReceiptHtml,
  normalizeReceiptForArabicPrint,
  type PosReceiptData,
} from "@/features/pos/pos-receipt-print";

const PREVIEW_DIR = join(process.cwd(), ".receipt-preview");

function writePreview(filename: string, receipt: PosReceiptData) {
  const html = buildPosReceiptHtml(normalizeReceiptForArabicPrint(receipt));
  writeFileSync(join(PREVIEW_DIR, filename), html, "utf8");
}

describe("pos receipt preview generator", () => {
  it("writes HTML previews to frontend/.receipt-preview/", () => {
    mkdirSync(PREVIEW_DIR, { recursive: true });

    writePreview("kashouka-dine-in.html", {
      receiptNumber: "RECEIPT-20260204-0017",
      soldAt: "2026-02-04T10:58:06",
      companyName: "كرنشي",
      branchName: "رئيسي",
      cashierName: "كاشير صباحي",
      warehouseName: "Main",
      orderType: "DINE_IN",
      tableNumber: "1",
      orderNotes: "بدون بصل",
      paymentSummary: "",
      payments: [{ paymentMethod: "CASH", amount: 14 }],
      total: 14,
      paid: 14,
      tendered: 14,
      change: 0,
      subtotal: 14,
      discount: 0,
      tax: 0,
      lines: [
        {
          name: "راس شوي",
          quantity: 2,
          unitPrice: 7,
          discountAmount: 0,
          taxAmount: 0,
          lineTotal: 14,
        },
      ],
    });

    writePreview("standard-sale.html", {
      receiptNumber: "RECEIPT-20260618-0030",
      soldAt: "2026-06-18T15:03:00.000Z",
      companyName: "كرنشي",
      branchName: "عمان",
      taxNumber: "16952073",
      cashierName: "كاشير",
      warehouseName: "Main",
      orderType: "TAKEAWAY",
      taxRatePercent: 16,
      paymentSummary: "",
      payments: [{ paymentMethod: "CASH", amount: 2.5 }],
      total: 2.5,
      paid: 2.5,
      tendered: 2.5,
      change: 0,
      subtotal: 2.16,
      discount: 0,
      tax: 0.34,
      lines: [
        {
          name: "فتة مقادم لشخص واحد",
          quantity: 1,
          unitPrice: 2.5,
          discountAmount: 0,
          taxAmount: 0.34,
          lineTotal: 2.5,
          unitCode: "PCS",
        },
      ],
    });

    writePreview("free-meal.html", {
      receiptNumber: "RECEIPT-20260618-0042",
      soldAt: "2026-06-18T16:20:00.000Z",
      companyName: "Simple Account",
      branchName: "عمان",
      cashierName: "كاشير",
      warehouseName: "Main",
      orderType: "TAKEAWAY",
      paymentSummary: "",
      payments: [],
      total: 0,
      paid: 0,
      tendered: 0,
      change: 0,
      subtotal: 0,
      discount: 2.5,
      tax: 0,
      lines: [
        {
          name: "وجبه مجانية لشخص واحد",
          quantity: 1,
          unitPrice: 2.5,
          discountAmount: 2.5,
          taxAmount: 0,
          lineTotal: 0,
          unitCode: "PCS",
        },
      ],
    });

    writePreview("large-amounts-mixed-payment.html", {
      receiptNumber: "RECEIPT-20260618-0099",
      soldAt: "2026-06-18T17:00:00.000Z",
      companyName: "Simple Account",
      branchName: "عمان",
      cashierName: "كاشير",
      warehouseName: "Main",
      orderType: "DINE_IN",
      tableNumber: "12",
      waiterName: "أحمد",
      taxRatePercent: 16,
      paymentSummary: "",
      payments: [
        { paymentMethod: "CASH", amount: 125.5 },
        { paymentMethod: "CARD", amount: 1234.56 },
      ],
      total: 1360.06,
      paid: 1360.06,
      tendered: 1400,
      change: 39.94,
      subtotal: 1200,
      discount: 0,
      tax: 160.06,
      lines: [
        {
          name: "وجبة عائلية كبيرة",
          quantity: 2,
          unitPrice: 45.5,
          discountAmount: 0,
          taxAmount: 14.56,
          lineTotal: 91,
          unitCode: "PCS",
        },
        {
          name: "مشاوي مشكل",
          quantity: 1,
          unitPrice: 125.5,
          discountAmount: 0,
          taxAmount: 20.08,
          lineTotal: 125.5,
        },
      ],
    });

    console.log(`Receipt previews written to: ${PREVIEW_DIR}`);
  });
});
