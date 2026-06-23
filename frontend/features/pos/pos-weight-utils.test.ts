import { describe, expect, it } from "vitest";
import {
  formatPosLineQuantityDisplay,
  formatPosWeightDisplay,
  getTraditionalAsnaqWeightLabel,
} from "@/features/pos/pos-weight-utils";

describe("getTraditionalAsnaqWeightLabel", () => {
  it("maps preset KG quantities to traditional Arabic labels", () => {
    expect(getTraditionalAsnaqWeightLabel(0.125, "ar")).toBe("عدد واحد");
    expect(getTraditionalAsnaqWeightLabel(0.25, "ar")).toBe("وقية");
    expect(getTraditionalAsnaqWeightLabel(0.5, "ar")).toBe("نص ك");
    expect(getTraditionalAsnaqWeightLabel(0.75, "ar")).toBe("تلات أواج");
    expect(getTraditionalAsnaqWeightLabel(1, "ar")).toBe("كيلو");
  });

  it("returns null for non-preset quantities", () => {
    expect(getTraditionalAsnaqWeightLabel(0.3, "ar")).toBeNull();
  });
});

describe("formatPosWeightDisplay", () => {
  it("uses traditional labels for KG lines instead of numeric weight", () => {
    expect(
      formatPosWeightDisplay(0.25, "KG", { language: "ar", precision: 3 }),
    ).toBe("وقية");
    expect(formatPosWeightDisplay(0.25, "KG", { language: "ar" })).not.toContain(
      "KG",
    );
  });

  it("falls back to numeric weight for unknown quantities", () => {
    expect(formatPosWeightDisplay(0.3, "KG", { language: "ar" })).toBe("0.3 KG");
  });
});

describe("formatPosLineQuantityDisplay", () => {
  it("uses traditional labels without unit code for preset weights", () => {
    expect(formatPosLineQuantityDisplay(0.5, "ar")).toBe("نص ك");
    expect(formatPosLineQuantityDisplay(0.5, "ar", "KG")).toBe("نص ك");
  });

  it("keeps integer counts for regular items", () => {
    expect(formatPosLineQuantityDisplay(2, "ar")).toBe("2");
  });
});
