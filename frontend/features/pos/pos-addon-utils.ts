import type {
  PosLineAddonSelection,
  PosLineModifiersPayload,
} from "@/features/pos/pos-addon-types";
import { formatPosLineQuantityDisplay } from "@/features/pos/pos-weight-utils";

export function getAddonsFromModifiers(modifiers: unknown): PosLineAddonSelection[] {
  if (!modifiers) return [];

  let parsed = modifiers;
  if (typeof modifiers === "string") {
    try {
      parsed = JSON.parse(modifiers);
    } catch {
      return [];
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.map((item: any) => {
      if (typeof item === "string") {
        return {
          groupId: "",
          groupName: "",
          optionId: "",
          name: item,
          priceAdjustment: 0,
        };
      }
      return {
        groupId: item?.groupId || "",
        groupName: item?.groupName || "",
        groupCode: item?.groupCode || "",
        isRequired: item?.isRequired === true,
        optionId: item?.optionId || "",
        name: item?.name || "",
        priceAdjustment: Number(item?.priceAdjustment ?? 0),
      };
    });
  }

  if (parsed && typeof parsed === "object") {
    const payload = parsed as any;
    if (Array.isArray(payload.addons)) {
      return payload.addons;
    }
  }

  return [];
}

/** Groups merged as words into the receipt line name (photo-style, no parentheses). */
export const CUSTOMER_RECEIPT_INLINE_NAME_GROUP_CODES = new Set([
  "COOKING_TYPE",
  "COOKING_METHOD",
  "HALF_HEAD",
  "S_W_K",
  "S_W_K_F",
]);

/** @deprecated Legacy choice groups; kept for callers that still reference the old set. */
export const CUSTOMER_RECEIPT_CHOICE_GROUP_CODES = new Set([
  "COOKING_TYPE",
  "COOKING_METHOD",
  "HALF_HEAD",
  "RICE_FRIKEH",
  "S_W_K",
  "S_W_K_F",
]);

export function isCustomerReceiptInlineNameAddon(addon: PosLineAddonSelection): boolean {
  if (!addon.groupCode || !CUSTOMER_RECEIPT_INLINE_NAME_GROUP_CODES.has(addon.groupCode)) {
    return false;
  }
  if (addon.groupCode === "HALF_HEAD") {
    const name = addon.name?.trim() ?? "";
    return name.includes("نص") || name.toLowerCase().includes("half");
  }
  return true;
}

export function getCustomerReceiptInlineNameAddons(
  modifiers: unknown,
): PosLineAddonSelection[] {
  return getAddonsFromModifiers(modifiers).filter(isCustomerReceiptInlineNameAddon);
}

export function isCustomerReceiptChoiceAddon(addon: PosLineAddonSelection): boolean {
  if (addon.groupCode && CUSTOMER_RECEIPT_CHOICE_GROUP_CODES.has(addon.groupCode)) {
    return true;
  }
  return addon.isRequired === true;
}

export function getCustomerReceiptChoiceAddons(modifiers: unknown): PosLineAddonSelection[] {
  return getAddonsFromModifiers(modifiers).filter(isCustomerReceiptChoiceAddon);
}

export function formatCustomerReceiptChoiceAddons(
  modifiers: unknown,
  language: string,
): string | null {
  const addons = getCustomerReceiptChoiceAddons(modifiers);
  if (!addons.length) return null;
  const parts = addons.map((addon) => addon.name?.trim() || "—").filter(Boolean);
  return parts.length ? parts.join(language === "ar" ? " · " : ", ") : null;
}

function receiptNameAlreadyContainsToken(baseName: string, token: string): boolean {
  const normalizedBase = baseName.trim();
  const normalizedToken = token.trim();
  if (!normalizedToken) return true;
  return normalizedBase.includes(normalizedToken);
}

const RECEIPT_SUFFIX_ADDON_ORDER: Record<string, number> = {
  COOKING_TYPE: 1,
  COOKING_METHOD: 1,
  RICE_FRIKEH: 2,
  S_W_K: 3,
  S_W_K_F: 3,
};

function sortReceiptSuffixAddons(addons: PosLineAddonSelection[]): PosLineAddonSelection[] {
  return [...addons].sort((left, right) => {
    const leftOrder = RECEIPT_SUFFIX_ADDON_ORDER[left.groupCode ?? ""] ?? 2;
    const rightOrder = RECEIPT_SUFFIX_ADDON_ORDER[right.groupCode ?? ""] ?? 2;
    return leftOrder - rightOrder;
  });
}

/** When half-head is prefixed, drop the leading "head" word already implied by the base item name. */
function stripRedundantHeadFromBaseName(baseName: string, halfHeadLabel: string): string {
  const trimmed = baseName.trim();
  if (!trimmed) return trimmed;

  if (halfHeadLabel.includes("نص") && trimmed.startsWith("رأس")) {
    const rest = trimmed.slice("رأس".length).trimStart();
    return rest || trimmed;
  }

  if (halfHeadLabel.toLowerCase().includes("half") && /\bhead\b/i.test(trimmed)) {
    const rest = trimmed.replace(/^\s*head\s+/i, "").replace(/\s+head\s*$/i, "").trim();
    return rest || trimmed;
  }

  return trimmed;
}

/** Head dishes like "رأس خروف" print as "رأس شوي" / "رأس سلق" on receipts. */
function compactHeadDishBaseName(baseName: string): string {
  const trimmed = baseName.trim();
  if (/^رأس\s+\S+$/u.test(trimmed)) {
    return "رأس";
  }
  if (/^\S+\s+head$/i.test(trimmed)) {
    return "head";
  }
  return trimmed;
}

/** Head dishes like "رأس خروف" print as "نص رأس سلق" — the animal suffix is omitted. */
function shouldOmitBaseNameForHalfHead(baseName: string, halfHeadLabel: string): boolean {
  const trimmed = baseName.trim();
  if (!trimmed) return false;
  const isHalfHead =
    halfHeadLabel.includes("نص") || halfHeadLabel.toLowerCase().includes("half");
  if (!isHalfHead) return false;
  return /^رأس\s+\S+$/u.test(trimmed);
}

/** Photo-style receipt/cart name: weight/half-head prefix + base + cooking, no parentheses. */
export function buildCustomerReceiptItemName(
  baseName: string,
  modifiers: unknown,
  language: string,
  unitCode?: string | null,
  weightPerPortionOverride?: number | null,
): string {
  const trimmedName = baseName.trim();
  const inlineAddons = getCustomerReceiptInlineNameAddons(modifiers);
  const halfHeadAddon = inlineAddons.find((addon) => addon.groupCode === "HALF_HEAD");
  const suffixAddons = inlineAddons.filter((addon) => addon.groupCode !== "HALF_HEAD");
  const parts: string[] = [];

  const weightPerPortion =
    weightPerPortionOverride ?? getWeightPerPortionFromModifiers(modifiers);
  let weightLabel: string | null = null;
  if (weightPerPortion != null) {
    const label = formatPosLineQuantityDisplay(
      weightPerPortion,
      language,
      unitCode ?? undefined,
    );
    if (label && !receiptNameAlreadyContainsToken(trimmedName, label)) {
      weightLabel = label;
    }
  }

  if (weightLabel) {
    parts.push(weightLabel);
  }

  if (halfHeadAddon) {
    const halfLabel = halfHeadAddon.name?.trim();
    if (halfLabel) {
      parts.push(halfLabel);
      if (!shouldOmitBaseNameForHalfHead(trimmedName, halfLabel)) {
        const adjustedBase = stripRedundantHeadFromBaseName(trimmedName, halfLabel);
        if (adjustedBase) {
          parts.push(adjustedBase);
        }
      }
    } else {
      parts.push(trimmedName);
    }
  } else {
    const baseForReceipt =
      suffixAddons.length > 0
        ? compactHeadDishBaseName(trimmedName)
        : trimmedName;
    parts.push(baseForReceipt);
  }

  for (const addon of sortReceiptSuffixAddons(suffixAddons)) {
    const label = addon.name?.trim();
    if (!label || receiptNameAlreadyContainsToken(parts.join(" "), label)) {
      continue;
    }
    parts.push(label);
  }

  return parts.join(" ");
}

export function formatReceiptLineQuantity(
  line: {
    quantity: number;
    unitCode?: string | null;
    modifiers?: unknown;
  },
  language = "ar",
): string {
  const weightPerPortion = getWeightPerPortionFromModifiers(line.modifiers);
  if (weightPerPortion != null) {
    return String(getPortionCountFromModifiers(line.modifiers));
  }
  return formatPosLineQuantityDisplay(line.quantity, language, line.unitCode ?? undefined, {
    precision: 3,
  });
}

export function buildModifiersPayload(
  addons: PosLineAddonSelection[],
): PosLineModifiersPayload | null {
  if (!addons.length) return null;
  return { addons };
}

export function getPortionCountFromModifiers(modifiers: unknown): number {
  if (!modifiers || typeof modifiers !== "object") return 1;
  const count = Number((modifiers as PosLineModifiersPayload).portionCount ?? 1);
  return Number.isFinite(count) && count > 0 ? count : 1;
}

export function getWeightPerPortionFromModifiers(modifiers: unknown): number | null {
  if (!modifiers || typeof modifiers !== "object") return null;
  const weight = Number((modifiers as PosLineModifiersPayload).weightPerPortion);
  return Number.isFinite(weight) && weight > 0 ? weight : null;
}

export function withPortionMetadataInModifiers(
  modifiers: PosLineModifiersPayload | null | undefined,
  portionCount: number,
  weightPerPortion?: number | null,
): PosLineModifiersPayload | null {
  const addons =
    modifiers?.addons?.length
      ? modifiers.addons
      : getAddonsFromModifiers(modifiers);
  const normalizedPortions = Math.max(1, Math.trunc(portionCount));
  const hasAddons = addons.length > 0;
  const hasWeight =
    weightPerPortion != null && Number.isFinite(weightPerPortion) && weightPerPortion > 0;
  if (!hasAddons && normalizedPortions <= 1 && !hasWeight) {
    return modifiers ?? null;
  }
  return {
    ...(hasAddons ? { addons } : {}),
    portionCount: normalizedPortions,
    ...(hasWeight
      ? { weightPerPortion: Number(weightPerPortion.toFixed(3)) }
      : {}),
  };
}

export function getCartLineMergeKey(line: {
  itemId: string;
  modifiers?: unknown;
  lineNote?: string | null;
  sellByWeight?: boolean;
  quantity?: number;
  quantityPrecision?: number;
}): string {
  const weightPart =
    line.sellByWeight && typeof line.quantity === "number"
      ? `:${Number(line.quantity).toFixed(line.quantityPrecision ?? 3)}`
      : "";
  return `${line.itemId}:${addonSignature(getAddonsFromModifiers(line.modifiers))}:${line.lineNote ?? ""}${weightPart}`;
}

export function getEffectiveKitchenQuantity(line: {
  quantity: number;
  sellByWeight?: boolean;
  portionCount?: number;
  modifiers?: unknown;
}): number {
  if (!line.sellByWeight) {
    return line.quantity;
  }
  return line.portionCount ?? getPortionCountFromModifiers(line.modifiers);
}

export function getEffectiveSaleQuantity(line: {
  quantity: number;
  sellByWeight?: boolean;
  portionCount?: number;
  quantityPrecision?: number;
  modifiers?: unknown;
}): number {
  if (!line.sellByWeight) {
    return line.quantity;
  }
  const portions = line.portionCount ?? getPortionCountFromModifiers(line.modifiers);
  const precision = line.quantityPrecision ?? 3;
  return Number((line.quantity * portions).toFixed(precision));
}

export function restoreWeightLineQuantities(
  storedQuantity: number,
  modifiers: unknown,
  precision = 3,
): { quantity: number; portionCount: number } {
  const portionCount = getPortionCountFromModifiers(modifiers);
  const weightPerPortion = getWeightPerPortionFromModifiers(modifiers);
  if (weightPerPortion != null) {
    return {
      quantity: Number(weightPerPortion.toFixed(precision)),
      portionCount,
    };
  }
  if (portionCount > 1) {
    return {
      quantity: Number((storedQuantity / portionCount).toFixed(precision)),
      portionCount,
    };
  }
  return {
    quantity: Number(storedQuantity.toFixed(precision)),
    portionCount: 1,
  };
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
    .map((addon) => addon.name?.trim() || "—")
    .filter(Boolean)
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
