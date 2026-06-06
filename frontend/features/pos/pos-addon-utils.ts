import type { PosLineAddonSelection, PosLineModifiersPayload } from "@/features/pos/pos-addon-types";

export function getAddonsFromModifiers(modifiers: unknown): PosLineAddonSelection[] {
  if (!modifiers || typeof modifiers !== "object") return [];
  const payload = modifiers as PosLineModifiersPayload;
  return Array.isArray(payload.addons) ? payload.addons : [];
}

export function buildModifiersPayload(
  addons: PosLineAddonSelection[],
): PosLineModifiersPayload | null {
  if (!addons.length) return null;
  return { addons };
}

export function addonSignature(addons: PosLineAddonSelection[]) {
  return JSON.stringify(
    addons
      .map((addon) => addon.optionId)
      .sort((a, b) => a.localeCompare(b)),
  );
}

export function sumAddonPrices(addons: PosLineAddonSelection[]) {
  return addons.reduce((sum, addon) => sum + addon.priceAdjustment, 0);
}

export function formatAddonsForDisplay(
  modifiers: unknown,
  language: string,
): string | null {
  const addons = getAddonsFromModifiers(modifiers);
  if (!addons.length && Array.isArray(modifiers)) {
    const parts = modifiers
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object" && "name" in entry) {
          return String((entry as { name?: string }).name ?? "");
        }
        return "";
      })
      .filter(Boolean);
    return parts.length ? parts.join(language === "ar" ? " · " : ", ") : null;
  }
  if (!addons.length) return null;
  return addons
    .map((addon) => {
      const label =
        language === "ar" && addon.name ? addon.name : addon.name;
      const price =
        addon.priceAdjustment > 0
          ? ` (+${addon.priceAdjustment.toFixed(2)})`
          : "";
      return `${label}${price}`;
    })
    .join(language === "ar" ? " · " : ", ");
}

export function localizeAddonLabel(
  name: string,
  nameAr: string | null | undefined,
  language: string,
) {
  if (language === "ar" && nameAr?.trim()) return nameAr.trim();
  return name;
}
