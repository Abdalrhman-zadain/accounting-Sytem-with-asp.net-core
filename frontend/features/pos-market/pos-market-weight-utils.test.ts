import { describe, expect, it } from "vitest";

import {
  buildWeightPresets,
  getWeightPresetLabel,
} from "@/features/pos-market/pos-market-weight-utils";

describe("pos-market-weight-utils", () => {
  it("builds default kg presets within min and max stock", () => {
    const presets = buildWeightPresets({
      precision: 3,
      minWeight: 0.25,
      maxWeight: 2,
    });

    expect(presets.map((preset) => preset.value)).toEqual([0.25, 0.5, 0.75, 1]);
  });

  it("filters presets below minimum weight or above on-hand stock", () => {
    const presets = buildWeightPresets({
      precision: 3,
      minWeight: 0.5,
      maxWeight: 0.75,
    });

    expect(presets.map((preset) => preset.value)).toEqual([0.5, 0.75]);
  });

  it("labels common kg presets in Arabic", () => {
    expect(getWeightPresetLabel(0.25, "KG", 3, "ar")).toBe("ربع كيلو");
    expect(getWeightPresetLabel(0.5, "KG", 3, "ar")).toBe("نص كيلو");
    expect(getWeightPresetLabel(1, "KG", 3, "ar")).toBe("كيلو");
  });
});
