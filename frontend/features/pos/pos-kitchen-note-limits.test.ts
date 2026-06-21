import { describe, expect, it } from "vitest";

import {
  countKitchenNoteWords,
  kotOrderNoteSizeClass,
  wrapThermalKotNoteText,
} from "./pos-kitchen-note-limits";

describe("pos-kitchen-note-limits", () => {
  it("counts words in Arabic kitchen notes", () => {
    expect(countKitchenNoteWords("بدون بصل بدون ثوم")).toBe(4);
  });

  it("picks larger font class for short notes", () => {
    expect(kotOrderNoteSizeClass("بدون بصل")).toContain("--lg");
  });

  it("picks medium font class for medium notes", () => {
    const mediumNote =
      "بدون بصل بدون ثوم صلصة حارة جداً بدون مخلل بدون طماطم تقديم سريع للطاولة اثنتا عشرة";
    expect(kotOrderNoteSizeClass(mediumNote)).toContain("--md");
  });

  it("picks smaller font class for very long notes", () => {
    const longNote =
      "بدون بصل بدون ثوم صلصة حارة جداً بدون مخلل بدون طماطم تقديم سريع للطاولة اثنتا عشرة بدون ليمون بدون خس بدون مخلل إضافي";
    expect(kotOrderNoteSizeClass(longNote)).toContain("--sm");
  });

  it("wraps long notes into multiple thermal lines", () => {
    const wrapped = wrapThermalKotNoteText(
      "بدون بصل بدون ثوم صلصة حارة جداً بدون مخلل",
      22,
    );
    expect(wrapped).toContain("<br/>");
    expect(wrapped.split("<br/>").every((line) => line.length <= 22)).toBe(true);
  });
});
