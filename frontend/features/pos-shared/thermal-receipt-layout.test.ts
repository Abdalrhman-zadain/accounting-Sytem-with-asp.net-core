import { describe, expect, it } from "vitest";
import {
  fmtThermalReceiptAmtPadded,
  fmtThermalReceiptMoney,
  thermalReceiptItemDiscountRow,
  thermalReceiptItemAddonRow,
  thermalReceiptItemRow4Col,
  thermalReceiptPaymentBoxHtml,
  thermalReceiptTotalRow,
} from "@/features/pos-shared/thermal-receipt-layout";

describe("thermal-receipt-layout amounts", () => {
  it("pads amounts for fixed-width thermal columns", () => {
    expect(fmtThermalReceiptAmtPadded(2.5)).toBe("   2.50");
    expect(fmtThermalReceiptAmtPadded(125)).toBe(" 125.00");
    expect(fmtThermalReceiptAmtPadded(-2.5)).toBe("  -2.50");
  });

  it("formats clean grouped money with optional currency suffix", () => {
    expect(fmtThermalReceiptMoney(2.5)).toBe("2.50");
    expect(fmtThermalReceiptMoney(1234.56)).toBe("1,234.56");
    expect(fmtThermalReceiptMoney(-2.5)).toBe("-2.50");
    expect(fmtThermalReceiptMoney(2.5, { currency: true })).toBe("2.50 د.أ");
  });

  it("marks item, total, and payment amounts with thermal-amt", () => {
    const itemRow = thermalReceiptItemRow4Col("وجبه مجانية", 2.5, "1", 0);
    const totalRow = thermalReceiptTotalRow("الصافي", 2.5, {
      emphasis: true,
      currency: true,
    });
    const paymentBox = thermalReceiptPaymentBoxHtml([
      { label: "نقد", value: 2.5 },
      { label: "مدفوع", value: 2.5, emphasis: true, currency: true },
    ]);

    expect(itemRow).toContain('class="col-total thermal-amt">0.00');
    expect(itemRow).toContain('class="col-price thermal-amt">2.50');
    expect(totalRow).toContain('class="summary-amt thermal-amt">2.50 د.أ');
    expect(paymentBox).toContain('class="summary-line emphasis"');
    expect(paymentBox).toContain('class="summary-amt thermal-amt">2.50 د.أ');
  });

  it("renders a line discount row", () => {
    const row = thermalReceiptItemDiscountRow(2.5);
    expect(row).toContain('class="item-disc-row"');
    expect(row).toContain("خصم");
    expect(row).toContain("-2.50");
  });

  it("renders a bold addon row", () => {
    const row = thermalReceiptItemAddonRow("ثومية (+0.50)");
    expect(row).toContain('class="item-addon-row"');
    expect(row).toContain('class="col-name item-addon"');
    expect(row).toContain("ثومية (+0.50)");
  });
});
