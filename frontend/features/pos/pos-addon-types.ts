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
