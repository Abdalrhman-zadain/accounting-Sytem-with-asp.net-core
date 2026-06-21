/**
 * Generates session roll HTML previews for local visual inspection.
 * Run: npm test -- --run scripts/preview-session-roll.test.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "vitest";
import { buildSessionRollReportDocumentHtml } from "@/features/pos/pos-session-roll-print";
import type { PosSession, PosSessionReport } from "@/types/api";
import { writeReceiptPreviewIndex } from "./receipt-preview-index";

const PREVIEW_DIR = join(process.cwd(), ".receipt-preview");

function buildSession(): PosSession {
  return {
    id: "session-1",
    sessionNumber: "SHIFT-2026-0618",
    branchName: "عمان - الصويفية",
    terminalName: "POS-1",
    openedAt: "2026-06-18T10:00:00.000Z",
    closedAt: "2026-06-18T22:15:00.000Z",
    status: "CLOSED",
    accountingStatus: "PENDING_REVIEW",
    openingCash: "150.00",
    expectedCash: "1842.50",
    actualCash: "1840.00",
    difference: "-2.50",
    totalSales: "3256.80",
    taxAmount: "416.22",
    discountAmount: "45.00",
    cashSales: "2100.00",
    cardSales: "956.80",
    deliveryCompanySales: "200.00",
    invoiceCount: 87,
    cashierUser: { id: "u1", name: "أحمد الكاشير", email: "cashier@example.com" },
    warehouse: { id: "w1", name: "مستودع المطعم" },
  } as PosSession;
}

function buildReport(): PosSessionReport {
  return {
    sessionId: "session-1",
    sessionNumber: "SHIFT-2026-0618",
    totalSales: "3256.80",
    tax: "416.22",
    discounts: "45.00",
    cashSales: "2100.00",
    cardSales: "956.80",
    cliqSales: "125.00",
    walletSales: "75.00",
    deliveryCompanySales: "200.00",
    cashRefunds: "35.00",
    openingCash: "150.00",
    expectedCash: "1842.50",
    actualCash: "1840.00",
    difference: "-2.50",
    invoiceCount: 87,
    sales: [
      {
        id: "sale-1",
        reference: "POS-1042",
        invoiceDate: "2026-06-18T14:30:00.000Z",
        totalAmount: "18.50",
        taxAmount: "2.40",
        customer: { id: "c1", name: "عميل عام" },
        lines: [
          {
            id: "line-1",
            itemName: "شاورما دجاج عائلي",
            description: "بدون ثوم",
            quantity: "2",
            lineAmount: "18.50",
            modifiers: {
              addons: [
                { groupId: "g1", optionId: "o1", name: "مايونيز بالثوم", priceAdjustment: 0.5 },
                { groupId: "g2", optionId: "o2", name: "جبنة شيدر مضاعفة", priceAdjustment: 1 },
              ],
            },
          },
        ],
        payments: [{ paymentMethod: "CASH", amount: "20.00" }],
      },
      {
        id: "sale-2",
        reference: "POS-1043",
        invoiceDate: "2026-06-18T15:45:00.000Z",
        totalAmount: "42.00",
        taxAmount: "5.50",
        customer: { id: "c2", name: "شركة ABC" },
        lines: [
          {
            id: "line-2",
            itemName: "مشاوي مشكل",
            description: "مشاوي مشكل",
            quantity: "1",
            lineAmount: "42.00",
          },
        ],
        payments: [
          { paymentMethod: "CASH", amount: "20.00" },
          { paymentMethod: "CARD", amount: "22.00" },
        ],
      },
    ],
    returns: [
      {
        id: "ret-1",
        reference: "RET-0007",
        totalAmount: "12.50",
      },
    ],
  } as PosSessionReport;
}

function writePreview(filename: string, printType: "SESSION_ROLL_REPORT" | "INVOICE_LIST_ROLL" | "ALL_RECEIPTS_ROLL") {
  const html = buildSessionRollReportDocumentHtml({
    session: buildSession(),
    report: buildReport(),
    printedBy: "محاسب النظام",
    printType,
  });
  writeFileSync(join(PREVIEW_DIR, filename), html, "utf8");
}

describe("session roll preview generator", () => {
  it("writes HTML previews to frontend/.receipt-preview/", () => {
    mkdirSync(PREVIEW_DIR, { recursive: true });
    writePreview("session-roll-closing.html", "SESSION_ROLL_REPORT");
    writePreview("session-roll-invoice-list.html", "INVOICE_LIST_ROLL");
    writePreview("session-roll-all-receipts.html", "ALL_RECEIPTS_ROLL");
    writeReceiptPreviewIndex(PREVIEW_DIR);
    console.log(`Session roll previews written to: ${PREVIEW_DIR}`);
  });
});
