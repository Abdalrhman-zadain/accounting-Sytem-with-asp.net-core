import type { PosLineAddonSelection, PosLineModifiersPayload } from "@/features/pos/pos-addon-types";

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

/** Single-choice “dish type” groups that should print on customer receipts when selected. */
export const CUSTOMER_RECEIPT_CHOICE_GROUP_CODES = new Set([
  "COOKING_TYPE",
  "COOKING_METHOD",
  "HALF_HEAD",
  "RICE_FRIKEH",
  "S_W_K",
  "S_W_K_F",
]);

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

export function buildCustomerReceiptItemName(
  baseName: string,
  modifiers: unknown,
  language: string,
): string {
  const trimmedName = baseName.trim();
  const choices = formatCustomerReceiptChoiceAddons(modifiers, language);
  if (!choices) return trimmedName;
  return `${trimmedName} (${choices})`;
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
