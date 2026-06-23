import { describe, expect, it } from "vitest";
import {
  buildKitchenOrderTicketHtml,
  buildKitchenNewOrderTicketHtml,
  buildKitchenDeltaTicketHtml,
  buildKitchenVoidTicketHtml,
} from "./pos-kot-print";
import type { PosSale } from "@/types/api";

const mockSaleBase = {
  id: "sale-123",
  reference: "POS-20260620-0042",
  invoiceDate: new Date().toISOString(),
  status: "DRAFT",
  invoiceType: "POS",
  currencyCode: "JOD",
  description: "الرجاء تسليم الطلب بسرعة",
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
  table: { id: "table-1", tableNumber: "5", status: "OCCUPIED" },
  waiter: { id: "waiter-1", name: "أحمد", email: "ahmed@example.com" },
  deliveryCompany: null,
  driver: null,
  lines: [
    {
      id: "line-1",
      lineNumber: 1,
      itemId: "item-1",
      itemName: "شاورما دجاج عائلي",
      description: "بدون ثوم",
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
            groupName: "صوصات إضافية",
            optionId: "o-1",
            name: "مايونيز بالثوم",
            priceAdjustment: 0.5,
          },
          {
            groupId: "g-2",
            groupName: "جبنة",
            optionId: "o-2",
            name: "جبنة شيدر مضاعفة",
            priceAdjustment: 1.0,
          },
        ],
      },
      item: null,
      warehouse: null,
    },
  ],
} satisfies Partial<PosSale>;

function mockSale(overrides: Partial<PosSale> = {}): PosSale {
  return { ...mockSaleBase, ...overrides } as PosSale;
}

describe("buildKitchenOrderTicketHtml", () => {
  it("renders traditional quantity labels for sell-by-weight lines", () => {
    const html = buildKitchenOrderTicketHtml(
      mockSale({
        lines: [
          {
            ...mockSaleBase.lines[0],
            id: "line-weight",
            itemName: "فوارغ",
            description: null,
            quantity: "0.5",
            modifiers: {
              addons: [
                {
                  groupId: "g-1",
                  groupName: "تحضير",
                  optionId: "o-1",
                  name: "سلق",
                  priceAdjustment: 0,
                },
              ],
            },
            item: {
              id: "item-faw",
              code: "MENU-005",
              name: "فوارغ",
              type: "FINISHED_GOOD",
              trackInventory: true,
              unitOfMeasure: "KG",
              allowFractionalQuantity: true,
            },
          },
        ],
      }),
      "ar",
    );

    expect(html).toContain("نص ك×");
    expect(html).toContain("فوارغ");
    expect(html).toContain("سلق");
    expect(html).not.toContain("0.5×");
  });

  it("renders Arabic dine-in banner, waiter, and larger item lines", () => {
    const html = buildKitchenOrderTicketHtml(mockSale(), "ar");

    expect(html).toContain("تذكرة مطبخ");
    expect(html).toContain("رقم الطلب: 42");
    expect(html).toContain("order-number-banner");
    expect(html).not.toContain("KOT #POS-20260620-0042");
    expect(html).toContain("صالة — طاولة 5");
    expect(html).toContain("order-type-banner");
    expect(html).toContain("أحمد");
    expect(html).not.toContain("<span>الطاولة</span>");
    expect(html).toContain("شاورما دجاج عائلي");
    expect(html).toContain('class="item-qty"');
    expect(html).toContain('class="item-name"');
    expect(html).toContain("مايونيز بالثوم");
    expect(html).toContain("جبنة شيدر مضاعفة");
    expect(html).toContain('class="item-addons-inline"');
    expect(html).toContain('class="item-addon-inline"');
    expect(html).not.toContain("إضافات");
    expect(html).not.toContain("item-addons-block");
    expect(html).not.toContain("مايونيز بالثوم (+0.50)");
    expect(html).toContain("بدون ثوم");
    expect(html).toContain("ملاحظة مهمة للمطبخ");
    expect(html).toContain('class="order-note-panel"');
    expect(html).toContain("order-note-text--lg");
    expect(html).toContain("الرجاء تسليم الطلب");
    expect(html).toContain("font-size: 14pt");
  });

  it("renders English dine-in KOT", () => {
    const html = buildKitchenOrderTicketHtml(mockSale(), "en");

    expect(html).toContain("Kitchen Ticket");
    expect(html).toContain("Order #42");
    expect(html).toContain("Dine-in — Table 5");
    expect(html).toContain("Waiter");
  });

  it("renders takeaway without empty table/waiter rows and shows order note in meta", () => {
    const html = buildKitchenOrderTicketHtml(
      mockSale({
        orderType: "TAKEAWAY",
        originalOrderType: "TAKEAWAY",
        table: null,
        tableId: null,
        waiter: null,
        waiterId: null,
        description: "على السريع",
      }),
      "ar",
    );

    expect(html).toContain("سفري");
    expect(html).toContain("ملاحظة الطلب");
    expect(html).toContain("على السريع");
    expect(html).not.toContain("الطاولة");
    expect(html).not.toContain("الويتر");
    expect(html).not.toContain("<span>—</span>");
  });

  it("renders delivery address, company, driver, and delivery notes", () => {
    const html = buildKitchenOrderTicketHtml(
      mockSale({
        orderType: "DELIVERY",
        originalOrderType: "DELIVERY",
        table: null,
        tableId: null,
        waiter: null,
        waiterId: null,
        deliveryAddress: "شارع الملكة رانيا، عمّان",
        deliveryNotes: "اتصل عند الوصول",
        deliveryCompany: {
          id: "dc1",
          name: "Talabat",
          arabicName: "طلبات",
          receivableAccountId: "acc-1",
          commissionRate: "0.00",
          isActive: true,
          createdAt: "",
          updatedAt: "",
        },
        driver: { id: "d1", name: "خالد", phone: null, isActive: true, createdAt: "", updatedAt: "" },
      }),
      "ar",
    );

    expect(html).toContain("توصيل");
    expect(html).toContain("عنوان التوصيل");
    expect(html).toContain("شارع الملكة رانيا");
    expect(html).toContain("شركة التوصيل");
    expect(html).toContain("طلبات");
    expect(html).toContain("السائق");
    expect(html).toContain("خالد");
    expect(html).toContain("ملاحظات التوصيل");
    expect(html).toContain("اتصل عند الوصول");
  });

  it("includes order-type banner on new, delta and void tickets", () => {
    const sale = mockSale();
    const deltaLine = {
      lineId: "line-1",
      itemId: "item-1",
      name: "بطاطا كبيرة",
      qty: 1,
      modifiers: null,
    };

    const newOrderHtml = buildKitchenNewOrderTicketHtml(sale, [deltaLine], "ar");
    const updateHtml = buildKitchenDeltaTicketHtml(sale, [deltaLine], "ar");
    const voidHtml = buildKitchenVoidTicketHtml(sale, [deltaLine], "ar");

    expect(newOrderHtml).toContain("*** طلب جديد ***");
    expect(newOrderHtml).toContain("رقم الطلب: 42");
    expect(newOrderHtml).toContain("new-order-title");
    expect(newOrderHtml).toContain("1×");
    expect(newOrderHtml).not.toContain("+1×");
    expect(newOrderHtml).not.toContain("KOT #POS-20260620-0042");
    expect(newOrderHtml).toContain("صالة — طاولة 5");
    expect(newOrderHtml).toContain("ملاحظة مهمة للمطبخ");
    expect(updateHtml).toContain("صالة — طاولة 5");
    expect(voidHtml).toContain("صالة — طاولة 5");
    expect(updateHtml).toContain("ملاحظة مهمة للمطبخ");
    expect(updateHtml).toContain("الرجاء تسليم الطلب");
    expect(voidHtml).toContain("ملاحظة مهمة للمطبخ");
    expect(updateHtml).toContain("تحديث — طلب #42");
    expect(updateHtml).toContain("+1×");
    expect(voidHtml).toContain("*** إلغاء من الطلب #42 ***");
  });

  it("wraps and shrinks long order notes for thermal width", () => {
    const longNote =
      "بدون بصل بدون ثوم صلصة حارة جداً بدون مخلل بدون طماطم تقديم سريع للطاولة اثنتا عشرة بدون ليمون بدون خس بدون مخلل إضافي";
    const html = buildKitchenNewOrderTicketHtml(
      mockSale({ description: longNote }),
      [{ lineId: "line-1", itemId: "item-1", name: "بطاطا كبيرة", qty: 1, modifiers: null }],
      "ar",
    );

    expect(html).toContain("order-note-text--sm");
    expect(html).toContain("<br/>");
    expect(html).toContain("بدون بصل");
  });
});
