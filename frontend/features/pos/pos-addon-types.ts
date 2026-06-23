export type PosAddonSelectionType = "SINGLE" | "MULTIPLE";

export type PosLineAddonSelection = {
  groupId: string;
  groupName: string;
  groupCode?: string;
  isRequired?: boolean;
  optionId: string;
  name: string;
  priceAdjustment: number;
};

export type PosLineModifiersPayload = {
  addons?: PosLineAddonSelection[];
  /** Sell-by-weight: identical portions of the same weight + add-on config (default 1). */
  portionCount?: number;
  /** Sell-by-weight: weight per portion in base unit (e.g. kg); persisted for cart round-trip. */
  weightPerPortion?: number;
};

export type PosAddonOption = {
  id: string;
  name: string;
  nameAr?: string | null;
  priceAdjustment: number;
  sortOrder?: number;
  isActive?: boolean;
  groupId?: string;
};

export type PosAddonGroup = {
  id: string;
  code: string;
  name: string;
  nameAr?: string | null;
  selectionType: PosAddonSelectionType;
  isRequired: boolean;
  minSelections: number;
  maxSelections?: number | null;
  sortOrder?: number;
  isActive?: boolean;
  options: PosAddonOption[];
  itemIds?: string[];
};

export type PosItemAddonConfig = {
  itemId: string;
  groups: Array<
    Pick<
      PosAddonGroup,
      | "id"
      | "code"
      | "name"
      | "nameAr"
      | "selectionType"
      | "isRequired"
      | "minSelections"
      | "maxSelections"
      | "options"
    >
  >;
};
