"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  LuArrowLeftRight as ArrowLeftRight,
  LuArrowLeft,
  LuArrowRight,
  LuBoxes as Boxes,
  LuChartNoAxesColumn as ChartNoAxesColumn,
  LuChevronLeft,
  LuChevronRight,
  LuFileText as FileText,
  LuFolderTree as FolderTree,
  LuPackage as Package,
  LuPackage2 as Package2,
  LuPencil,
  LuRuler as Ruler,
  LuSave as Save,
  LuSearch,
  LuSettings2 as Settings2,
  LuTags as Tags,
  LuWarehouse as Warehouse,
} from "react-icons/lu";

import {
  cancelInventoryAdjustment,
  cancelInventoryGoodsIssue,
  cancelInventoryGoodsReceipt,
  cancelInventoryTransfer,
  createInventoryAdjustment,
  createInventoryGoodsIssue,
  createInventoryGoodsReceipt,
  createInventoryItem,
  createInventoryItemCategory,
  createInventoryItemGroup,
  createInventoryTransfer,
  createInventoryUnitOfMeasure,
  createInventoryWarehouse,
  deactivateInventoryItem,
  deactivateInventoryItemCategory,
  deactivateInventoryItemGroup,
  deactivateInventoryUnitOfMeasure,
  deactivateInventoryWarehouse,
  generateInventoryBarcode,
  getActiveTaxes,
  getAccountOptions,
  getInventoryAdjustments,
  getInventoryGoodsIssues,
  getInventoryGoodsReceipts,
  getInventoryItemCategories,
  getInventoryItemGroups,
  getInventoryItems,
  getInventoryStockLedger,
  getInventoryPolicy,
  getInventoryTransfers,
  getInventoryUnitsOfMeasure,
  getInventoryWarehouses,
  postInventoryAdjustment,
  postInventoryGoodsIssue,
  postInventoryGoodsReceipt,
  postInventoryTransfer,
  reverseInventoryAdjustment,
  reverseInventoryGoodsIssue,
  reverseInventoryGoodsReceipt,
  reverseInventoryTransfer,
  updateInventoryAdjustment,
  updateInventoryGoodsIssue,
  updateInventoryGoodsReceipt,
  updateInventoryItem,
  updateInventoryItemCategory,
  updateInventoryItemGroup,
  updateInventoryTransfer,
  updateInventoryUnitOfMeasure,
  updateInventoryWarehouse,
  updateInventoryPolicy,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatItemServiceLabel } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type {
  AccountOption,
  InventoryAdjustment,
  InventoryAdjustmentLinePayload,
  InventoryAdjustmentStatus,
  InventoryGoodsIssue,
  InventoryGoodsIssueLinePayload,
  InventoryGoodsReceipt,
  InventoryGoodsReceiptLinePayload,
  InventoryItem,
  InventoryItemCategory,
  InventoryItemGroup,
  InventoryItemUnitConversion,
  InventoryIssueStatus,
  InventoryCostingMethod,
  InventoryItemType,
  InventoryReceiptStatus,
  InventoryTransfer,
  InventoryTransferLinePayload,
  InventoryTransferStatus,
  InventoryStockMovement,
  InventoryStockMovementType,
  InventoryUnitOfMeasure,
  InventoryWarehouse,
} from "@/types/api";
import { Button, Card, PageShell, SidePanel, StatusPill } from "@/components/ui";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import { ItemImportModal } from "./item-import-modal";
import {
  ItemEditorModal,
  ItemEditorState,
  ItemUnitConversionEditorState,
  createEmptyItemEditor,
  createUnitConversionEditor,
} from "./item-editor-modal";
import { ReceiptEditorModal } from "./receipt-editor-modal";
import { IssueEditorModal } from "./issue-editor-modal";
import { TransferEditorModal } from "./transfer-editor-modal";
import { AdjustmentEditorModal } from "./adjustment-editor-modal";

const ITEM_TYPE_OPTIONS: InventoryItemType[] = ["RAW_MATERIAL", "FINISHED_GOOD", "SERVICE", "MANUFACTURED_ITEM"];
const RECEIPT_STATUS_OPTIONS: InventoryReceiptStatus[] = ["DRAFT", "POSTED", "CANCELLED", "REVERSED"];
const ISSUE_STATUS_OPTIONS: InventoryIssueStatus[] = ["DRAFT", "POSTED", "CANCELLED", "REVERSED"];
const TRANSFER_STATUS_OPTIONS: InventoryTransferStatus[] = ["DRAFT", "POSTED", "CANCELLED", "REVERSED"];
const ADJUSTMENT_STATUS_OPTIONS: InventoryAdjustmentStatus[] = ["DRAFT", "POSTED", "CANCELLED", "REVERSED"];
const STOCK_MOVEMENT_TYPE_OPTIONS: InventoryStockMovementType[] = [
  "GOODS_RECEIPT",
  "PURCHASE_RECEIPT",
  "GOODS_ISSUE",
  "SALES_ISSUE",
  "SALES_RETURN",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "REP_CAR_LOAD",
  "REP_CAR_LOAD_REVERSAL",
];
const INVENTORY_ITEMS_PAGE_SIZE = 9;
const INVENTORY_RECEIPTS_PAGE_SIZE = 20;
const INVENTORY_ISSUES_PAGE_SIZE = 20;
const INVENTORY_TRANSFERS_PAGE_SIZE = 20;
const INVENTORY_ADJUSTMENTS_PAGE_SIZE = 20;
const INVENTORY_STOCK_LEDGER_PAGE_SIZE = 20;

type InventoryWorkspace =
  | "policy"
  | "itemGroups"
  | "itemCategories"
  | "unitsOfMeasure"
  | "items"
  | "warehouses"
  | "receipts"
  | "issues"
  | "transfers"
  | "adjustments"
  | "stockLedger";

const INVENTORY_WORKSPACE_TABS: Array<{
  id: InventoryWorkspace;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "items", labelKey: "inventory.workspace.items", icon: Package },
  { id: "itemGroups", labelKey: "inventory.workspace.itemGroups", icon: Boxes },
  { id: "itemCategories", labelKey: "inventory.workspace.itemCategories", icon: Tags },
  { id: "unitsOfMeasure", labelKey: "inventory.workspace.unitsOfMeasure", icon: Ruler },
  { id: "warehouses", labelKey: "inventory.workspace.warehouses", icon: Warehouse },
  { id: "receipts", labelKey: "inventory.workspace.receipts", icon: FileText },
  { id: "issues", labelKey: "inventory.workspace.issues", icon: Package2 },
  { id: "transfers", labelKey: "inventory.workspace.transfers", icon: ArrowLeftRight },
  { id: "adjustments", labelKey: "inventory.workspace.adjustments", icon: FolderTree },
  { id: "stockLedger", labelKey: "inventory.workspace.stockLedger", icon: ChartNoAxesColumn },
  { id: "policy", labelKey: "inventory.workspace.policy", icon: Settings2 },
];

type ItemGroupEditorState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  parentGroupId: string;
  inventoryAccountId: string;
  cogsAccountId: string;
  salesAccountId: string;
  adjustmentAccountId: string;
};

type ItemCategoryEditorState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  itemGroupId: string;
};

type UnitEditorState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  unitType: string;
  decimalPrecision: string;
};

type WarehouseEditorState = {
  id?: string;
  code: string;
  name: string;
  address: string;
  responsiblePerson: string;
  isTransit: boolean;
  isDefaultTransit: boolean;
};

type ReceiptLineEditorState = {
  itemId: string;
  quantity: string;
  unitCost: string;
  unitOfMeasure: string;
  description: string;
};

type ReceiptEditorState = {
  id?: string;
  reference: string;
  receiptDate: string;
  warehouseId: string;
  sourcePurchaseOrderRef: string;
  sourcePurchaseInvoiceRef: string;
  description: string;
  lines: ReceiptLineEditorState[];
};

type IssueLineEditorState = {
  itemId: string;
  quantity: string;
  unitOfMeasure: string;
  description: string;
};

type IssueEditorState = {
  id?: string;
  reference: string;
  issueDate: string;
  warehouseId: string;
  sourceSalesOrderRef: string;
  sourceSalesInvoiceRef: string;
  sourceProductionRequestRef: string;
  sourceInternalRequestRef: string;
  description: string;
  lines: IssueLineEditorState[];
};

type TransferLineEditorState = {
  itemId: string;
  quantity: string;
  unitOfMeasure: string;
  description: string;
};

type TransferEditorState = {
  id?: string;
  reference: string;
  transferDate: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  description: string;
  lines: TransferLineEditorState[];
};

type AdjustmentLineEditorState = {
  itemId: string;
  systemQuantity: string;
  countedQuantity: string;
  unitOfMeasure: string;
  description: string;
};

type AdjustmentEditorState = {
  id?: string;
  reference: string;
  adjustmentDate: string;
  warehouseId: string;
  reason: string;
  description: string;
  lines: AdjustmentLineEditorState[];
};

function createEmptyItemGroupEditor(): ItemGroupEditorState {
  return {
    code: "",
    name: "",
    description: "",
    parentGroupId: "",
    inventoryAccountId: "",
    cogsAccountId: "",
    salesAccountId: "",
    adjustmentAccountId: "",
  };
}

function createEmptyItemCategoryEditor(): ItemCategoryEditorState {
  return {
    code: "",
    name: "",
    description: "",
    itemGroupId: "",
  };
}

function createEmptyUnitEditor(): UnitEditorState {
  return {
    code: "",
    name: "",
    description: "",
    unitType: "",
    decimalPrecision: "0",
  };
}

function createEmptyWarehouseEditor(): WarehouseEditorState {
  return {
    code: "",
    name: "",
    address: "",
    responsiblePerson: "",
    isTransit: false,
    isDefaultTransit: false,
  };
}

function createEmptyReceiptLine(): ReceiptLineEditorState {
  return {
    itemId: "",
    quantity: "1",
    unitCost: "0",
    unitOfMeasure: "EA",
    description: "",
  };
}

function createEmptyReceiptEditor(): ReceiptEditorState {
  return {
    reference: "",
    receiptDate: new Date().toISOString().slice(0, 10),
    warehouseId: "",
    sourcePurchaseOrderRef: "",
    sourcePurchaseInvoiceRef: "",
    description: "",
    lines: [createEmptyReceiptLine()],
  };
}

function createEmptyIssueLine(): IssueLineEditorState {
  return {
    itemId: "",
    quantity: "1",
    unitOfMeasure: "EA",
    description: "",
  };
}

function createEmptyIssueEditor(): IssueEditorState {
  return {
    reference: "",
    issueDate: new Date().toISOString().slice(0, 10),
    warehouseId: "",
    sourceSalesOrderRef: "",
    sourceSalesInvoiceRef: "",
    sourceProductionRequestRef: "",
    sourceInternalRequestRef: "",
    description: "",
    lines: [createEmptyIssueLine()],
  };
}

function createEmptyTransferLine(): TransferLineEditorState {
  return {
    itemId: "",
    quantity: "1",
    unitOfMeasure: "EA",
    description: "",
  };
}

function createEmptyTransferEditor(): TransferEditorState {
  return {
    reference: "",
    transferDate: new Date().toISOString().slice(0, 10),
    sourceWarehouseId: "",
    destinationWarehouseId: "",
    description: "",
    lines: [createEmptyTransferLine()],
  };
}

function createEmptyAdjustmentLine(): AdjustmentLineEditorState {
  return {
    itemId: "",
    systemQuantity: "0",
    countedQuantity: "0",
    unitOfMeasure: "EA",
    description: "",
  };
}

function createEmptyAdjustmentEditor(): AdjustmentEditorState {
  return {
    reference: "",
    adjustmentDate: new Date().toISOString().slice(0, 10),
    warehouseId: "",
    reason: "",
    description: "",
    lines: [createEmptyAdjustmentLine()],
  };
}

export function InventoryPage() {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [workspace, setWorkspace] = useState<InventoryWorkspace>("items");

  const [itemSearch, setItemSearch] = useState("");
  const [itemStatusFilter, setItemStatusFilter] = useState<"" | "true" | "false">("");
  const [itemTypeFilter, setItemTypeFilter] = useState<InventoryItemType | "">("");
  const [itemGroupFilter, setItemGroupFilter] = useState("");
  const [itemCategoryFilter, setItemCategoryFilter] = useState("");
  const [itemPage, setItemPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isItemEditorOpen, setIsItemEditorOpen] = useState(false);
  const [isItemImportOpen, setIsItemImportOpen] = useState(false);
  const [itemEditor, setItemEditor] = useState<ItemEditorState>(createEmptyItemEditor);
  const itemSaveModeRef = useRef<"save" | "saveAndClose">("saveAndClose");
  const [showItemCodePreview, setShowItemCodePreview] = useState(false);

  const [itemGroupSearch, setItemGroupSearch] = useState("");
  const [itemGroupStatusFilter, setItemGroupStatusFilter] = useState<"" | "true" | "false">("");
  const [selectedItemGroupId, setSelectedItemGroupId] = useState<string | null>(null);
  const [isItemGroupEditorOpen, setIsItemGroupEditorOpen] = useState(false);
  const [itemGroupEditor, setItemGroupEditor] = useState<ItemGroupEditorState>(createEmptyItemGroupEditor);

  const [itemCategorySearch, setItemCategorySearch] = useState("");
  const [itemCategoryStatusFilter, setItemCategoryStatusFilter] = useState<"" | "true" | "false">("");
  const [itemCategoryGroupFilter, setItemCategoryGroupFilter] = useState("");
  const [selectedItemCategoryId, setSelectedItemCategoryId] = useState<string | null>(null);
  const [isItemCategoryEditorOpen, setIsItemCategoryEditorOpen] = useState(false);
  const [itemCategoryEditor, setItemCategoryEditor] = useState<ItemCategoryEditorState>(createEmptyItemCategoryEditor);

  const [unitSearch, setUnitSearch] = useState("");
  const [unitStatusFilter, setUnitStatusFilter] = useState<"" | "true" | "false">("");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [isUnitEditorOpen, setIsUnitEditorOpen] = useState(false);
  const [unitEditor, setUnitEditor] = useState<UnitEditorState>(createEmptyUnitEditor);

  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [warehouseStatusFilter, setWarehouseStatusFilter] = useState<"" | "true" | "false">("");
  const [warehouseTransitFilter, setWarehouseTransitFilter] = useState<"" | "true" | "false">("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [isWarehouseEditorOpen, setIsWarehouseEditorOpen] = useState(false);
  const [warehouseEditor, setWarehouseEditor] = useState<WarehouseEditorState>(createEmptyWarehouseEditor);

  const [receiptSearch, setReceiptSearch] = useState("");
  const [receiptStatusFilter, setReceiptStatusFilter] = useState<InventoryReceiptStatus | "">("");
  const [receiptWarehouseFilter, setReceiptWarehouseFilter] = useState("");
  const [receiptPage, setReceiptPage] = useState(1);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [isReceiptEditorOpen, setIsReceiptEditorOpen] = useState(false);
  const [receiptEditor, setReceiptEditor] = useState<ReceiptEditorState>(createEmptyReceiptEditor);
  const [issueSearch, setIssueSearch] = useState("");
  const [issueStatusFilter, setIssueStatusFilter] = useState<InventoryIssueStatus | "">("");
  const [issueWarehouseFilter, setIssueWarehouseFilter] = useState("");
  const [issuePage, setIssuePage] = useState(1);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isIssueEditorOpen, setIsIssueEditorOpen] = useState(false);
  const [issueEditor, setIssueEditor] = useState<IssueEditorState>(createEmptyIssueEditor);
  const [transferSearch, setTransferSearch] = useState("");
  const [transferStatusFilter, setTransferStatusFilter] = useState<InventoryTransferStatus | "">("");
  const [transferSourceWarehouseFilter, setTransferSourceWarehouseFilter] = useState("");
  const [transferDestinationWarehouseFilter, setTransferDestinationWarehouseFilter] = useState("");
  const [transferPage, setTransferPage] = useState(1);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [isTransferEditorOpen, setIsTransferEditorOpen] = useState(false);
  const [transferEditor, setTransferEditor] = useState<TransferEditorState>(createEmptyTransferEditor);
  const [adjustmentSearch, setAdjustmentSearch] = useState("");
  const [adjustmentStatusFilter, setAdjustmentStatusFilter] = useState<InventoryAdjustmentStatus | "">("");
  const [adjustmentWarehouseFilter, setAdjustmentWarehouseFilter] = useState("");
  const [adjustmentReasonFilter, setAdjustmentReasonFilter] = useState("");
  const [adjustmentPage, setAdjustmentPage] = useState(1);
  const [selectedAdjustmentId, setSelectedAdjustmentId] = useState<string | null>(null);
  const [isAdjustmentEditorOpen, setIsAdjustmentEditorOpen] = useState(false);
  const [adjustmentEditor, setAdjustmentEditor] = useState<AdjustmentEditorState>(createEmptyAdjustmentEditor);
  const [stockLedgerSearch, setStockLedgerSearch] = useState("");
  const [stockLedgerItemFilter, setStockLedgerItemFilter] = useState("");
  const [stockLedgerWarehouseFilter, setStockLedgerWarehouseFilter] = useState("");
  const [stockLedgerMovementTypeFilter, setStockLedgerMovementTypeFilter] = useState<InventoryStockMovementType | "">("");
  const [stockLedgerPage, setStockLedgerPage] = useState(1);
  const [costingMethodDraft, setCostingMethodDraft] = useState<InventoryCostingMethod>("WEIGHTED_AVERAGE");

  const inventoryItemsQuery = useQuery({
    queryKey: queryKeys.inventoryItems(token, {
      search: itemSearch,
      isActive: itemStatusFilter,
      type: itemTypeFilter,
      itemGroupId: itemGroupFilter || undefined,
      itemCategoryId: itemCategoryFilter || undefined,
      page: itemPage,
      limit: INVENTORY_ITEMS_PAGE_SIZE,
    }),
    queryFn: () =>
      getInventoryItems(
        {
          search: itemSearch,
          isActive: itemStatusFilter,
          type: itemTypeFilter,
          itemGroupId: itemGroupFilter || undefined,
          itemCategoryId: itemCategoryFilter || undefined,
          page: itemPage,
          limit: INVENTORY_ITEMS_PAGE_SIZE,
        },
        token,
      ),
  });

  const itemGroupsQuery = useQuery({
    queryKey: queryKeys.inventoryItemGroups(token, {
      search: itemGroupSearch,
      isActive: itemGroupStatusFilter,
    }),
    queryFn: () =>
      getInventoryItemGroups(
        { search: itemGroupSearch, isActive: itemGroupStatusFilter },
        token,
      ),
  });

  const activeItemGroupsQuery = useQuery({
    queryKey: queryKeys.inventoryItemGroups(token, { isActive: "true" }),
    queryFn: () => getInventoryItemGroups({ isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const itemCategoriesQuery = useQuery({
    queryKey: queryKeys.inventoryItemCategories(token, {
      search: itemCategorySearch,
      isActive: itemCategoryStatusFilter,
      itemGroupId: itemCategoryGroupFilter || undefined,
    }),
    queryFn: () =>
      getInventoryItemCategories(
        {
          search: itemCategorySearch,
          isActive: itemCategoryStatusFilter,
          itemGroupId: itemCategoryGroupFilter || undefined,
        },
        token,
      ),
  });

  const activeItemCategoriesQuery = useQuery({
    queryKey: queryKeys.inventoryItemCategories(token, { isActive: "true" }),
    queryFn: () => getInventoryItemCategories({ isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const unitsQuery = useQuery({
    queryKey: queryKeys.inventoryUnitsOfMeasure(token, {
      search: unitSearch,
      isActive: unitStatusFilter,
    }),
    queryFn: () =>
      getInventoryUnitsOfMeasure(
        { search: unitSearch, isActive: unitStatusFilter },
        token,
      ),
  });

  const activeUnitsQuery = useQuery({
    queryKey: queryKeys.inventoryUnitsOfMeasure(token, { isActive: "true" }),
    queryFn: () => getInventoryUnitsOfMeasure({ isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const inventoryWarehousesQuery = useQuery({
    queryKey: queryKeys.inventoryWarehouses(token, {
      search: warehouseSearch,
      isActive: warehouseStatusFilter,
      isTransit: warehouseTransitFilter,
    }),
    queryFn: () =>
      getInventoryWarehouses(
        { search: warehouseSearch, isActive: warehouseStatusFilter, isTransit: warehouseTransitFilter },
        token,
      ),
  });

  const goodsReceiptsQuery = useQuery({
    queryKey: queryKeys.inventoryGoodsReceipts(token, {
      search: receiptSearch,
      status: receiptStatusFilter,
      warehouseId: receiptWarehouseFilter || undefined,
      page: receiptPage,
      limit: INVENTORY_RECEIPTS_PAGE_SIZE,
    }),
    queryFn: () =>
      getInventoryGoodsReceipts(
        {
          search: receiptSearch,
          status: receiptStatusFilter,
          warehouseId: receiptWarehouseFilter || undefined,
          page: receiptPage,
          limit: INVENTORY_RECEIPTS_PAGE_SIZE,
        },
        token,
      ),
  });

  const goodsIssuesQuery = useQuery({
    queryKey: queryKeys.inventoryGoodsIssues(token, {
      search: issueSearch,
      status: issueStatusFilter,
      warehouseId: issueWarehouseFilter || undefined,
      page: issuePage,
      limit: INVENTORY_ISSUES_PAGE_SIZE,
    }),
    queryFn: () =>
      getInventoryGoodsIssues(
        {
          search: issueSearch,
          status: issueStatusFilter,
          warehouseId: issueWarehouseFilter || undefined,
          page: issuePage,
          limit: INVENTORY_ISSUES_PAGE_SIZE,
        },
        token,
      ),
  });

  const inventoryTransfersQuery = useQuery({
    queryKey: queryKeys.inventoryTransfers(token, {
      search: transferSearch,
      status: transferStatusFilter,
      sourceWarehouseId: transferSourceWarehouseFilter || undefined,
      destinationWarehouseId: transferDestinationWarehouseFilter || undefined,
      page: transferPage,
      limit: INVENTORY_TRANSFERS_PAGE_SIZE,
    }),
    queryFn: () =>
      getInventoryTransfers(
        {
          search: transferSearch,
          status: transferStatusFilter,
          sourceWarehouseId: transferSourceWarehouseFilter || undefined,
          destinationWarehouseId: transferDestinationWarehouseFilter || undefined,
          page: transferPage,
          limit: INVENTORY_TRANSFERS_PAGE_SIZE,
        },
        token,
      ),
  });

  const inventoryAdjustmentsQuery = useQuery({
    queryKey: queryKeys.inventoryAdjustments(token, {
      search: adjustmentSearch,
      status: adjustmentStatusFilter,
      warehouseId: adjustmentWarehouseFilter || undefined,
      reason: adjustmentReasonFilter || undefined,
      page: adjustmentPage,
      limit: INVENTORY_ADJUSTMENTS_PAGE_SIZE,
    }),
    queryFn: () =>
      getInventoryAdjustments(
        {
          search: adjustmentSearch,
          status: adjustmentStatusFilter,
          warehouseId: adjustmentWarehouseFilter || undefined,
          reason: adjustmentReasonFilter || undefined,
          page: adjustmentPage,
          limit: INVENTORY_ADJUSTMENTS_PAGE_SIZE,
        },
        token,
      ),
  });

  const inventoryStockLedgerQuery = useQuery({
    queryKey: queryKeys.inventoryStockLedger(token, {
      search: stockLedgerSearch,
      itemId: stockLedgerItemFilter || undefined,
      warehouseId: stockLedgerWarehouseFilter || undefined,
      movementType: stockLedgerMovementTypeFilter || undefined,
      page: stockLedgerPage,
      limit: INVENTORY_STOCK_LEDGER_PAGE_SIZE,
    }),
    queryFn: () =>
      getInventoryStockLedger(
        {
          search: stockLedgerSearch,
          itemId: stockLedgerItemFilter || undefined,
          warehouseId: stockLedgerWarehouseFilter || undefined,
          movementType: stockLedgerMovementTypeFilter || undefined,
          page: stockLedgerPage,
          limit: INVENTORY_STOCK_LEDGER_PAGE_SIZE,
        },
        token,
      ),
  });

  const inventoryPolicyQuery = useQuery({
    queryKey: queryKeys.inventoryPolicy(token),
    queryFn: () => getInventoryPolicy(token),
  });

  const inventoryAccountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", type: "ASSET", view: "selector" }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", type: "ASSET" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const cogsAccountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", type: "EXPENSE", view: "selector" }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", type: "EXPENSE" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const salesAccountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", type: "REVENUE", view: "selector" }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true", type: "REVENUE" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const adjustmentAccountsQuery = useQuery({
    queryKey: queryKeys.accounts(token, { isPosting: "true", isActive: "true", view: "selector" }),
    queryFn: () => getAccountOptions({ isPosting: "true", isActive: "true" }, token),
    staleTime: 5 * 60 * 1000,
  });

  const activeTaxesQuery = useQuery({
    queryKey: ["taxes", "active", token],
    queryFn: () => getActiveTaxes(token),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (inventoryPolicyQuery.data?.costingMethod) {
      setCostingMethodDraft(inventoryPolicyQuery.data.costingMethod);
    }
  }, [inventoryPolicyQuery.data?.costingMethod]);

  useEffect(() => {
    setItemPage(1);
  }, [itemSearch, itemStatusFilter, itemTypeFilter, itemGroupFilter, itemCategoryFilter]);

  useEffect(() => {
    if (!itemGroupFilter && itemCategoryFilter) return;
    const category = itemCategoriesQuery.data?.find((row) => row.id === itemCategoryFilter);
    if (category && itemGroupFilter && category.itemGroupId !== itemGroupFilter) {
      setItemCategoryFilter("");
    }
  }, [itemCategoryFilter, itemCategoriesQuery.data, itemGroupFilter]);

  useEffect(() => {
    setItemCategoryEditor((current) =>
      itemCategoryGroupFilter && !current.id ? { ...current, itemGroupId: itemCategoryGroupFilter } : current,
    );
  }, [itemCategoryGroupFilter]);

  useEffect(() => {
    setReceiptPage(1);
  }, [receiptSearch, receiptStatusFilter, receiptWarehouseFilter]);

  useEffect(() => {
    setIssuePage(1);
  }, [issueSearch, issueStatusFilter, issueWarehouseFilter]);

  useEffect(() => {
    setTransferPage(1);
  }, [transferSearch, transferStatusFilter, transferSourceWarehouseFilter, transferDestinationWarehouseFilter]);

  useEffect(() => {
    setAdjustmentPage(1);
  }, [adjustmentSearch, adjustmentStatusFilter, adjustmentWarehouseFilter, adjustmentReasonFilter]);

  useEffect(() => {
    setStockLedgerPage(1);
  }, [stockLedgerSearch, stockLedgerItemFilter, stockLedgerWarehouseFilter, stockLedgerMovementTypeFilter]);

  const updateInventoryPolicyMutation = useMutation({
    mutationFn: () => updateInventoryPolicy({ costingMethod: costingMethodDraft }, token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-policy"] });
    },
  });

  const createItemGroupMutation = useMutation({
    mutationFn: () => createInventoryItemGroup(mapItemGroupEditorToPayload(itemGroupEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-item-groups"] });
      setSelectedItemGroupId(created.id);
      closeItemGroupEditor();
    },
  });

  const updateItemGroupMutation = useMutation({
    mutationFn: () => updateInventoryItemGroup(itemGroupEditor.id!, mapItemGroupEditorToPayload(itemGroupEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-item-groups"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedItemGroupId(updated.id);
      closeItemGroupEditor();
    },
  });

  const deactivateItemGroupMutation = useMutation({
    mutationFn: (id: string) => deactivateInventoryItemGroup(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-item-groups"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedItemGroupId(updated.id);
    },
  });

  const createItemCategoryMutation = useMutation({
    mutationFn: () => createInventoryItemCategory(mapItemCategoryEditorToPayload(itemCategoryEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-item-categories"] });
      setSelectedItemCategoryId(created.id);
      closeItemCategoryEditor();
    },
  });

  const updateItemCategoryMutation = useMutation({
    mutationFn: () => updateInventoryItemCategory(itemCategoryEditor.id!, mapItemCategoryEditorToPayload(itemCategoryEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-item-categories"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedItemCategoryId(updated.id);
      closeItemCategoryEditor();
    },
  });

  const deactivateItemCategoryMutation = useMutation({
    mutationFn: (id: string) => deactivateInventoryItemCategory(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-item-categories"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedItemCategoryId(updated.id);
    },
  });

  const createUnitMutation = useMutation({
    mutationFn: () => createInventoryUnitOfMeasure(mapUnitEditorToPayload(unitEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-units-of-measure"] });
      setSelectedUnitId(created.id);
      closeUnitEditor();
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: () => updateInventoryUnitOfMeasure(unitEditor.id!, mapUnitEditorToPayload(unitEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-units-of-measure"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedUnitId(updated.id);
      closeUnitEditor();
    },
  });

  const deactivateUnitMutation = useMutation({
    mutationFn: (id: string) => deactivateInventoryUnitOfMeasure(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-units-of-measure"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedUnitId(updated.id);
    },
  });

  const createItemMutation = useMutation({
    mutationFn: () => createInventoryItem(mapItemEditorToPayload(itemEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedItemId(created.id);
      setItemEditor(mapItemToEditor(created));
      setShowItemCodePreview(Boolean(created.barcode || created.qrCodeValue));
      if (itemSaveModeRef.current === "saveAndClose") {
        closeItemEditor();
      }
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: () => updateInventoryItem(itemEditor.id!, mapItemEditorToPayload(itemEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedItemId(updated.id);
      setItemEditor(mapItemToEditor(updated));
      setShowItemCodePreview(Boolean(updated.barcode || updated.qrCodeValue));
      if (itemSaveModeRef.current === "saveAndClose") {
        closeItemEditor();
      }
    },
  });

  const generateBarcodeMutation = useMutation({
    mutationFn: () => generateInventoryBarcode(token),
    onSuccess: ({ barcode }) => {
      setItemEditor((current) => ({ ...current, barcode }));
      setShowItemCodePreview(true);
    },
  });

  const deactivateItemMutation = useMutation({
    mutationFn: (id: string) => deactivateInventoryItem(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-warehouses"] });
      setSelectedItemId(updated.id);
    },
  });

  const createWarehouseMutation = useMutation({
    mutationFn: () => createInventoryWarehouse(mapWarehouseEditorToPayload(warehouseEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-warehouses"] });
      setSelectedWarehouseId(created.id);
      closeWarehouseEditor();
    },
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: () => updateInventoryWarehouse(warehouseEditor.id!, mapWarehouseEditorToPayload(warehouseEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-warehouses"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedWarehouseId(updated.id);
      closeWarehouseEditor();
    },
  });

  const deactivateWarehouseMutation = useMutation({
    mutationFn: (id: string) => deactivateInventoryWarehouse(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-warehouses"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSelectedWarehouseId(updated.id);
    },
  });

  const createReceiptMutation = useMutation({
    mutationFn: () => createInventoryGoodsReceipt(mapReceiptEditorToPayload(receiptEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-receipts"] });
      setSelectedReceiptId(created.id);
      closeReceiptEditor();
    },
  });

  const updateReceiptMutation = useMutation({
    mutationFn: () => updateInventoryGoodsReceipt(receiptEditor.id!, mapReceiptEditorToPayload(receiptEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-receipts"] });
      setSelectedReceiptId(updated.id);
      closeReceiptEditor();
    },
  });

  const postReceiptMutation = useMutation({
    mutationFn: (id: string) => postInventoryGoodsReceipt(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-receipts"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock-ledger"] });
      setSelectedReceiptId(updated.id);
    },
  });

  const cancelReceiptMutation = useMutation({
    mutationFn: (id: string) => cancelInventoryGoodsReceipt(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-receipts"] });
      setSelectedReceiptId(updated.id);
    },
  });

  const reverseReceiptMutation = useMutation({
    mutationFn: (id: string) => reverseInventoryGoodsReceipt(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-receipts"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock-ledger"] });
      setSelectedReceiptId(updated.id);
    },
  });

  const createIssueMutation = useMutation({
    mutationFn: () => createInventoryGoodsIssue(mapIssueEditorToPayload(issueEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-issues"] });
      setSelectedIssueId(created.id);
      closeIssueEditor();
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: () => updateInventoryGoodsIssue(issueEditor.id!, mapIssueEditorToPayload(issueEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-issues"] });
      setSelectedIssueId(updated.id);
      closeIssueEditor();
    },
  });

  const postIssueMutation = useMutation({
    mutationFn: (id: string) => postInventoryGoodsIssue(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-issues"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock-ledger"] });
      setSelectedIssueId(updated.id);
    },
  });

  const cancelIssueMutation = useMutation({
    mutationFn: (id: string) => cancelInventoryGoodsIssue(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-issues"] });
      setSelectedIssueId(updated.id);
    },
  });

  const reverseIssueMutation = useMutation({
    mutationFn: (id: string) => reverseInventoryGoodsIssue(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-goods-issues"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock-ledger"] });
      setSelectedIssueId(updated.id);
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: () => createInventoryTransfer(mapTransferEditorToPayload(transferEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      setSelectedTransferId(created.id);
      closeTransferEditor();
    },
  });

  const updateTransferMutation = useMutation({
    mutationFn: () => updateInventoryTransfer(transferEditor.id!, mapTransferEditorToPayload(transferEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      setSelectedTransferId(updated.id);
      closeTransferEditor();
    },
  });

  const postTransferMutation = useMutation({
    mutationFn: (id: string) => postInventoryTransfer(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock-ledger"] });
      setSelectedTransferId(updated.id);
    },
  });

  const cancelTransferMutation = useMutation({
    mutationFn: (id: string) => cancelInventoryTransfer(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      setSelectedTransferId(updated.id);
    },
  });

  const reverseTransferMutation = useMutation({
    mutationFn: (id: string) => reverseInventoryTransfer(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock-ledger"] });
      setSelectedTransferId(updated.id);
    },
  });

  const createAdjustmentMutation = useMutation({
    mutationFn: () => createInventoryAdjustment(mapAdjustmentEditorToPayload(adjustmentEditor), token),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      setSelectedAdjustmentId(created.id);
      closeAdjustmentEditor();
    },
  });

  const updateAdjustmentMutation = useMutation({
    mutationFn: () => updateInventoryAdjustment(adjustmentEditor.id!, mapAdjustmentEditorToPayload(adjustmentEditor), token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      setSelectedAdjustmentId(updated.id);
      closeAdjustmentEditor();
    },
  });

  const postAdjustmentMutation = useMutation({
    mutationFn: (id: string) => postInventoryAdjustment(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock-ledger"] });
      setSelectedAdjustmentId(updated.id);
    },
  });

  const cancelAdjustmentMutation = useMutation({
    mutationFn: (id: string) => cancelInventoryAdjustment(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      setSelectedAdjustmentId(updated.id);
    },
  });

  const reverseAdjustmentMutation = useMutation({
    mutationFn: (id: string) => reverseInventoryAdjustment(id, token),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock-ledger"] });
      setSelectedAdjustmentId(updated.id);
    },
  });

  const itemsResponse = inventoryItemsQuery.data;
  const items = itemsResponse?.data ?? [];
  const itemGroups = itemGroupsQuery.data ?? [];
  const itemCategories = itemCategoriesQuery.data ?? [];
  const unitsOfMeasure = unitsQuery.data ?? [];
  const activeItemGroups = activeItemGroupsQuery.data ?? itemGroups.filter((row) => row.isActive);
  const activeItemCategories = activeItemCategoriesQuery.data ?? itemCategories.filter((row) => row.isActive);
  const activeUnitsOfMeasure = activeUnitsQuery.data ?? unitsOfMeasure.filter((row) => row.isActive);
  const activeTaxes = activeTaxesQuery.data ?? [];
  const itemEditorCategories = activeItemCategories.filter((row) => row.itemGroupId === itemEditor.itemGroupId);
  const inventorySettingsDisabled = itemEditor.type === "SERVICE" || !itemEditor.trackInventory;
  useEffect(() => {
    if (itemEditor.type !== "SERVICE") {
      setItemEditor((current) => ensureBaseUnitConversionRow(current, activeUnitsOfMeasure));
    }
  }, [activeUnitsOfMeasure, itemEditor.unitOfMeasureId, itemEditor.type]);

  const itemTotal = itemsResponse?.total ?? 0;
  const itemTotalPages = itemsResponse?.totalPages ?? 1;
  const itemRangeStart = itemTotal === 0 ? 0 : (itemPage - 1) * INVENTORY_ITEMS_PAGE_SIZE + 1;
  const itemRangeEnd = itemTotal === 0 ? 0 : Math.min(itemPage * INVENTORY_ITEMS_PAGE_SIZE, itemTotal);
  const warehouses = inventoryWarehousesQuery.data ?? [];
  const receiptsResponse = goodsReceiptsQuery.data;
  const receipts = receiptsResponse?.data ?? [];
  const receiptsTotal = receiptsResponse?.total ?? 0;
  const receiptsTotalPages = receiptsResponse?.totalPages ?? 1;
  const receiptsRangeStart = receiptsTotal === 0 ? 0 : (receiptPage - 1) * INVENTORY_RECEIPTS_PAGE_SIZE + 1;
  const receiptsRangeEnd = receiptsTotal === 0 ? 0 : Math.min(receiptPage * INVENTORY_RECEIPTS_PAGE_SIZE, receiptsTotal);
  const issuesResponse = goodsIssuesQuery.data;
  const issues = issuesResponse?.data ?? [];
  const issuesTotal = issuesResponse?.total ?? 0;
  const issuesTotalPages = issuesResponse?.totalPages ?? 1;
  const issuesRangeStart = issuesTotal === 0 ? 0 : (issuePage - 1) * INVENTORY_ISSUES_PAGE_SIZE + 1;
  const issuesRangeEnd = issuesTotal === 0 ? 0 : Math.min(issuePage * INVENTORY_ISSUES_PAGE_SIZE, issuesTotal);
  const transfersResponse = inventoryTransfersQuery.data;
  const transfers = transfersResponse?.data ?? [];
  const transfersTotal = transfersResponse?.total ?? 0;
  const transfersTotalPages = transfersResponse?.totalPages ?? 1;
  const transfersRangeStart = transfersTotal === 0 ? 0 : (transferPage - 1) * INVENTORY_TRANSFERS_PAGE_SIZE + 1;
  const transfersRangeEnd = transfersTotal === 0 ? 0 : Math.min(transferPage * INVENTORY_TRANSFERS_PAGE_SIZE, transfersTotal);
  const adjustmentsResponse = inventoryAdjustmentsQuery.data;
  const adjustments = adjustmentsResponse?.data ?? [];
  const adjustmentsTotal = adjustmentsResponse?.total ?? 0;
  const adjustmentsTotalPages = adjustmentsResponse?.totalPages ?? 1;
  const adjustmentsRangeStart = adjustmentsTotal === 0 ? 0 : (adjustmentPage - 1) * INVENTORY_ADJUSTMENTS_PAGE_SIZE + 1;
  const adjustmentsRangeEnd =
    adjustmentsTotal === 0 ? 0 : Math.min(adjustmentPage * INVENTORY_ADJUSTMENTS_PAGE_SIZE, adjustmentsTotal);
  const stockMovementsResponse = inventoryStockLedgerQuery.data;
  const stockMovements = stockMovementsResponse?.data ?? [];
  const stockMovementsTotal = stockMovementsResponse?.total ?? 0;
  const stockMovementsTotalPages = stockMovementsResponse?.totalPages ?? 1;
  const stockMovementsRangeStart =
    stockMovementsTotal === 0 ? 0 : (stockLedgerPage - 1) * INVENTORY_STOCK_LEDGER_PAGE_SIZE + 1;
  const stockMovementsRangeEnd =
    stockMovementsTotal === 0
      ? 0
      : Math.min(stockLedgerPage * INVENTORY_STOCK_LEDGER_PAGE_SIZE, stockMovementsTotal);

  const selectedItem = selectedItemId ? (items.find((row) => row.id === selectedItemId) ?? null) : null;
  const selectedItemGroup = selectedItemGroupId ? (itemGroups.find((row) => row.id === selectedItemGroupId) ?? null) : null;
  const selectedItemCategory = selectedItemCategoryId ? (itemCategories.find((row) => row.id === selectedItemCategoryId) ?? null) : null;
  const selectedUnit = selectedUnitId ? (unitsOfMeasure.find((row) => row.id === selectedUnitId) ?? null) : null;
  const selectedWarehouse = selectedWarehouseId ? (warehouses.find((row) => row.id === selectedWarehouseId) ?? null) : null;
  const selectedReceipt = selectedReceiptId ? (receipts.find((row) => row.id === selectedReceiptId) ?? null) : null;
  const selectedIssue = selectedIssueId ? (issues.find((row) => row.id === selectedIssueId) ?? null) : null;
  const selectedTransfer = selectedTransferId ? (transfers.find((row) => row.id === selectedTransferId) ?? null) : null;
  const selectedAdjustment = selectedAdjustmentId ? (adjustments.find((row) => row.id === selectedAdjustmentId) ?? null) : null;

  const itemGroupFormError = getItemGroupFormError(itemGroupEditor);
  const itemCategoryFormError = getItemCategoryFormError(itemCategoryEditor);
  const unitFormError = getUnitFormError(unitEditor);
  const warehouseFormError = getWarehouseFormError(warehouseEditor);
  const receiptFormError = getReceiptFormError(receiptEditor);
  const issueFormError = getIssueFormError(issueEditor);
  const transferFormError = getTransferFormError(transferEditor);
  const adjustmentFormError = getAdjustmentFormError(adjustmentEditor);

  const itemMutationError = getMutationError(
    createItemMutation.error,
    updateItemMutation.error,
    deactivateItemMutation.error,
    generateBarcodeMutation.error,
  );
  const itemGroupMutationError = getMutationError(
    createItemGroupMutation.error,
    updateItemGroupMutation.error,
    deactivateItemGroupMutation.error,
  );
  const itemCategoryMutationError = getMutationError(
    createItemCategoryMutation.error,
    updateItemCategoryMutation.error,
    deactivateItemCategoryMutation.error,
  );
  const unitMutationError = getMutationError(createUnitMutation.error, updateUnitMutation.error, deactivateUnitMutation.error);
  const warehouseMutationError = getMutationError(
    createWarehouseMutation.error,
    updateWarehouseMutation.error,
    deactivateWarehouseMutation.error,
  );
  const receiptMutationError = getMutationError(
    createReceiptMutation.error,
    updateReceiptMutation.error,
    postReceiptMutation.error,
    cancelReceiptMutation.error,
    reverseReceiptMutation.error,
  );
  const issueMutationError = getMutationError(
    createIssueMutation.error,
    updateIssueMutation.error,
    postIssueMutation.error,
    cancelIssueMutation.error,
    reverseIssueMutation.error,
  );
  const transferMutationError = getMutationError(
    createTransferMutation.error,
    updateTransferMutation.error,
    postTransferMutation.error,
    cancelTransferMutation.error,
    reverseTransferMutation.error,
  );
  const adjustmentMutationError = getMutationError(
    createAdjustmentMutation.error,
    updateAdjustmentMutation.error,
    postAdjustmentMutation.error,
    cancelAdjustmentMutation.error,
    reverseAdjustmentMutation.error,
  );
  const policyMutationError = getMutationError(updateInventoryPolicyMutation.error);

  const activeItems = items.filter((row) => row.isActive).length;
  const activeWarehouses = warehouses.filter((row) => row.isActive).length;
  const postedReceipts = receipts.filter((row) => row.status === "POSTED").length;
  const postedIssues = issues.filter((row) => row.status === "POSTED").length;
  const postedTransfers = transfers.filter((row) => row.status === "POSTED").length;
  const postedAdjustments = adjustments.filter((row) => row.status === "POSTED").length;

  const isInlineItemEditorActive = workspace === "items" && isItemEditorOpen;

  return (
    <PageShell className={cn(isInlineItemEditorActive ? "max-w-none px-2 py-3 sm:px-3 sm:py-4 lg:px-4" : "")}>
      <div className={cn(isInlineItemEditorActive ? "space-y-4" : "space-y-10")}>
        {isInlineItemEditorActive ? (
          <div className="flex items-center px-1 text-sm font-semibold text-gray-500">
            <span className="text-gray-700">{t("inventory.title")}</span>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-gray-700">{t("inventory.items.title")}</span>
            <span className="mx-2 text-gray-300">/</span>
            <span className="text-teal-700">
              {itemEditor.id ? t("inventory.editor.editTitle") : t("inventory.editor.createTitle")}
            </span>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              {INVENTORY_WORKSPACE_TABS.map((tab) => {
                const active = workspace === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setWorkspace(tab.id);
                      setSelectedItemId(null);
                      setSelectedItemGroupId(null);
                      setSelectedItemCategoryId(null);
                      setSelectedUnitId(null);
                      setSelectedWarehouseId(null);
                      setSelectedReceiptId(null);
                      setSelectedIssueId(null);
                      setSelectedTransferId(null);
                      setSelectedAdjustmentId(null);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3.5 py-2 text-[13px] font-bold transition-colors",
                      active
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <section id="inventory-policy-section" className={`space-y-5 ${workspace === "policy" ? "" : "hidden"}`}>
          <SectionHeading title={t("inventory.policy.title")} description={t("inventory.policy.description")} />
          <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <span className="mb-1 block text-xs font-semibold text-gray-500">{isArabic ? "الطريقة الحالية" : "Current Method"}</span>
                  <span className="text-lg font-bold text-[#233329]">
                    {t(`inventory.policy.costingMethod.${inventoryPolicyQuery.data?.costingMethod ?? costingMethodDraft}`)}
                  </span>
                </Card>
                <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <span className="mb-1 block text-xs font-semibold text-gray-500">{isArabic ? "المسودة" : "Draft Selection"}</span>
                  <span className="text-lg font-bold text-[#233329]">
                    {t(`inventory.policy.costingMethod.${costingMethodDraft}`)}
                  </span>
                </Card>
              </div>

              <div className="rounded-[24px] border border-[#edf1ee] bg-[#fafcfb] p-5">
                <div className="flex flex-nowrap items-end gap-3 overflow-x-auto pb-1">
              <Field label={t("inventory.policy.field.costingMethod")}>
                <Select
                  value={costingMethodDraft}
                  onChange={(event) => setCostingMethodDraft(event.target.value as InventoryCostingMethod)}
                  className="min-w-[200px] shrink-0 rounded-[16px] border border-[#d6e1d9] bg-white"
                >
                  <option value="WEIGHTED_AVERAGE">{t("inventory.policy.costingMethod.WEIGHTED_AVERAGE")}</option>
                  <option value="FIFO">{t("inventory.policy.costingMethod.FIFO")}</option>
                </Select>
              </Field>
              <Button
                className="rounded-full bg-[#46644b] px-4 py-2 font-bold text-white hover:bg-[#39523d]"
                onClick={() => updateInventoryPolicyMutation.mutate()}
                disabled={
                  updateInventoryPolicyMutation.isPending ||
                  inventoryPolicyQuery.isLoading ||
                  costingMethodDraft === inventoryPolicyQuery.data?.costingMethod
                }
              >
                {t("inventory.policy.button.save")}
              </Button>
                </div>
              </div>
            </div>
            {policyMutationError ? <ErrorBox message={policyMutationError} /> : null}
          </Card>
        </section>

        <section id="inventory-item-groups-section" className={`space-y-5 ${workspace === "itemGroups" ? "" : "hidden"}`}>
          {selectedItemGroup ? (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setSelectedItemGroupId(null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d6e0d8] bg-white px-4 py-2 text-sm font-bold text-[#46644b] shadow-sm transition hover:bg-[#f6faf7] hover:text-[#233329]"
              >
                {isArabic ? <LuArrowRight className="h-4 w-4" /> : <LuArrowLeft className="h-4 w-4" />}
                {isArabic ? "العودة إلى مجموعات المواد" : "Back to Item Groups"}
              </button>

              <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <span className="mb-1 block text-xs font-semibold text-gray-500">{isArabic ? "عدد الفئات" : "Categories"}</span>
                      <span className="text-lg font-bold text-[#233329]">{selectedItemGroup.categoryCount}</span>
                    </Card>
                    <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <span className="mb-1 block text-xs font-semibold text-gray-500">{isArabic ? "عدد الأصناف" : "Items"}</span>
                      <span className="text-lg font-bold text-[#233329]">{selectedItemGroup.itemCount}</span>
                    </Card>
                    <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <span className="mb-1 block text-xs font-semibold text-gray-500">{isArabic ? "المجموعة الأب" : "Parent Group"}</span>
                      <span className="text-sm font-bold text-[#233329]">
                        {selectedItemGroup.parentGroup
                          ? formatCodeName(selectedItemGroup.parentGroup.code, selectedItemGroup.parentGroup.name, isArabic)
                          : t("inventory.emptyValue")}
                      </span>
                    </Card>
                  </div>

                  <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-6 shadow-sm">
                    <div className="flex items-start justify-between border-b border-[#f0f3f0] pb-4">
                      <div>
                        <span className="text-xs font-mono tracking-wider text-[#7d8c83]">{selectedItemGroup.code}</span>
                        <h2 className="mt-1 text-xl font-black text-[#233329]">{selectedItemGroup.name}</h2>
                      </div>
                      <StatusPill
                        label={selectedItemGroup.isActive ? t("inventory.status.active") : t("inventory.status.inactive")}
                        tone={selectedItemGroup.isActive ? "positive" : "warning"}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <DetailCard
                        label={t("inventory.itemGroups.field.parentGroup")}
                        value={selectedItemGroup.parentGroup ? formatCodeName(selectedItemGroup.parentGroup.code, selectedItemGroup.parentGroup.name, isArabic) : t("inventory.emptyValue")}
                      />
                      <DetailCard
                        label={t("inventory.itemGroups.detail.categoryCount")}
                        value={String(selectedItemGroup.categoryCount)}
                      />
                      <DetailCard
                        label={t("inventory.itemGroups.detail.itemCount")}
                        value={String(selectedItemGroup.itemCount)}
                      />
                    </div>

                    {selectedItemGroup.description && (
                      <div className="border-t border-[#f0f3f0] pt-4">
                        <span className="mb-1 block text-xs font-semibold text-gray-500">{isArabic ? "الوصف" : "Description"}</span>
                        <p className="whitespace-pre-wrap text-sm text-gray-700">{selectedItemGroup.description}</p>
                      </div>
                    )}
                  </Card>
                </div>

                <div>
                  <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-4 shadow-sm">
                    <h3 className="border-b border-[#f0f3f0] pb-2 text-sm font-black text-[#233329]">
                      {isArabic ? "العمليات" : "Actions"}
                    </h3>
                    <div className="flex flex-col gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => openEditItemGroup(selectedItemGroup)}
                        disabled={!selectedItemGroup.isActive}
                        className="rounded-full border-[#d6e0d8] px-4 py-2 font-bold text-[#46644b]"
                      >
                        {t("inventory.button.editItemGroup")}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => confirmDeactivateItemGroup(selectedItemGroup.id)}
                        disabled={!selectedItemGroup.isActive || deactivateItemGroupMutation.isPending}
                        className="rounded-full px-4 py-2 font-bold"
                      >
                        {t("inventory.button.deactivate")}
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <>
              <SectionHeading
                title={t("inventory.itemGroups.title")}
                description={t("inventory.itemGroups.description")}
                action={
                  <Button onClick={() => openNewItemGroup()} className="rounded-full bg-[#46644b] px-4 py-2 font-bold text-white hover:bg-[#39523d]">
                    {t("inventory.button.newItemGroup")}
                  </Button>
                }
              />

              <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-5 shadow-sm">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="relative">
                    <span className={cn("absolute inset-y-0 flex items-center text-gray-400", isArabic ? "left-3" : "right-3")}>
                      <LuSearch size={16} />
                    </span>
                    <input
                      type="text"
                      value={itemGroupSearch}
                      onChange={(event) => setItemGroupSearch(event.target.value)}
                      placeholder={t("inventory.itemGroups.filters.search")}
                      className={cn(
                        "w-full rounded-[16px] border border-[#d6e1d9] bg-white py-2.5 text-sm font-semibold text-[#233329] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20",
                        isArabic ? "pl-9 pr-3 text-right" : "pr-9 pl-3 text-left"
                      )}
                    />
                  </div>

                  <select
                    value={itemGroupStatusFilter}
                    onChange={(event) => setItemGroupStatusFilter(event.target.value as "" | "true" | "false")}
                    className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                  >
                    <option value="">{t("inventory.filters.allStatuses")}</option>
                    <option value="true">{t("inventory.filters.activeOnly")}</option>
                    <option value="false">{t("inventory.filters.inactiveOnly")}</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  {itemGroupsQuery.isLoading ? (
                    <div className="rounded-2xl border border-[#e7ece8] bg-[#fafcfb] py-6 text-sm text-gray-500">{t("inventory.loading")}</div>
                  ) : itemGroups.length === 0 ? (
                    <EmptyState message={t("inventory.itemGroups.empty")} />
                  ) : (
                    <table className="min-w-full text-xs text-start">
                      <thead>
                        <tr className="border-b border-[#e1e7e2] text-[11px] uppercase tracking-wider text-[#6d7b73]">
                          <th className="px-4 py-3 text-start font-black">{isArabic ? "الرمز" : "Code"}</th>
                          <th className="px-4 py-3 text-start font-black">{isArabic ? "الاسم" : "Name"}</th>
                          <th className="px-4 py-3 text-start font-black">{isArabic ? "المجموعة الأب" : "Parent Group"}</th>
                          <th className="px-4 py-3 text-end font-black">{isArabic ? "عدد الفئات" : "Categories"}</th>
                          <th className="px-4 py-3 text-end font-black">{isArabic ? "عدد الأصناف" : "Items"}</th>
                          <th className="px-4 py-3 text-center font-black">{isArabic ? "الحالة" : "Status"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f3f0]">
                        {itemGroups
                          .filter((group) => {
                            const searchMatch = !itemGroupSearch || group.name.toLowerCase().includes(itemGroupSearch.toLowerCase()) || group.code.toLowerCase().includes(itemGroupSearch.toLowerCase());
                            const statusMatch = !itemGroupStatusFilter || String(group.isActive) === itemGroupStatusFilter;
                            return searchMatch && statusMatch;
                          })
                          .map((group) => (
                            <tr
                              key={group.id}
                              onClick={() => setSelectedItemGroupId(group.id)}
                              className="cursor-pointer text-[12px] transition hover:bg-[#f7faf7]"
                            >
                              <td className="px-4 py-3 font-bold text-gray-900 font-mono tracking-wider">{group.code}</td>
                              <td className="px-4 py-3 font-bold text-gray-900">{group.name}</td>
                              <td className="px-4 py-3 text-gray-600">
                                {group.parentGroup ? formatCodeName(group.parentGroup.code, group.parentGroup.name, isArabic) : "—"}
                              </td>
                              <td className="px-4 py-3 text-end text-gray-600 font-medium">{group.categoryCount}</td>
                              <td className="px-4 py-3 text-end text-gray-600 font-medium">{group.itemCount}</td>
                              <td className="px-4 py-3 text-center">
                                <StatusPill
                                  label={group.isActive ? t("inventory.status.active") : t("inventory.status.inactive")}
                                  tone={group.isActive ? "positive" : "warning"}
                                />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            </>
          )}
        </section>

        <section id="inventory-item-categories-section" className={`space-y-5 ${workspace === "itemCategories" ? "" : "hidden"}`}>
          {selectedItemCategory ? (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setSelectedItemCategoryId(null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d6e0d8] bg-white px-4 py-2 text-sm font-bold text-[#46644b] shadow-sm transition hover:bg-[#f6faf7] hover:text-[#233329]"
              >
                {isArabic ? <LuArrowRight className="h-4 w-4" /> : <LuArrowLeft className="h-4 w-4" />}
                {isArabic ? "العودة إلى فئات المواد" : "Back to Item Categories"}
              </button>

              <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <span className="mb-1 block text-xs font-semibold text-gray-500">{isArabic ? "مجموعة المواد" : "Item Group"}</span>
                      <span className="text-sm font-bold text-[#233329]">
                        {formatCodeName(selectedItemCategory.itemGroup.code, selectedItemCategory.itemGroup.name, isArabic)}
                      </span>
                    </Card>
                    <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <span className="mb-1 block text-xs font-semibold text-gray-500">{isArabic ? "عدد الأصناف" : "Items"}</span>
                      <span className="text-lg font-bold text-[#233329]">{selectedItemCategory.itemCount}</span>
                    </Card>
                  </div>

                  <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-6 shadow-sm">
                    <div className="flex items-start justify-between border-b border-[#f0f3f0] pb-4">
                      <div>
                        <span className="text-xs font-mono tracking-wider text-[#7d8c83]">{selectedItemCategory.code}</span>
                        <h2 className="mt-1 text-xl font-black text-[#233329]">{selectedItemCategory.name}</h2>
                      </div>
                      <StatusPill
                        label={selectedItemCategory.isActive ? t("inventory.status.active") : t("inventory.status.inactive")}
                        tone={selectedItemCategory.isActive ? "positive" : "warning"}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <DetailCard
                        label={t("inventory.itemCategories.field.itemGroup")}
                        value={formatCodeName(selectedItemCategory.itemGroup.code, selectedItemCategory.itemGroup.name, isArabic)}
                      />
                      <DetailCard
                        label={t("inventory.itemCategories.detail.itemCount")}
                        value={String(selectedItemCategory.itemCount)}
                      />
                    </div>

                    {selectedItemCategory.description ? (
                      <div className="border-t border-[#f0f3f0] pt-4">
                        <span className="mb-1 block text-xs font-semibold text-gray-500">{isArabic ? "الوصف" : "Description"}</span>
                        <p className="whitespace-pre-wrap text-sm text-gray-700">{selectedItemCategory.description}</p>
                      </div>
                    ) : null}
                  </Card>
                </div>

                <div>
                  <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-4 shadow-sm">
                    <h3 className="border-b border-[#f0f3f0] pb-2 text-sm font-black text-[#233329]">
                      {isArabic ? "العمليات" : "Actions"}
                    </h3>
                    <div className="flex flex-col gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => openEditItemCategory(selectedItemCategory)}
                        disabled={!selectedItemCategory.isActive}
                        className="rounded-full border-[#d6e0d8] px-4 py-2 font-bold text-[#46644b]"
                      >
                        {t("inventory.button.editItemCategory")}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => confirmDeactivateItemCategory(selectedItemCategory.id)}
                        disabled={!selectedItemCategory.isActive || deactivateItemCategoryMutation.isPending}
                        className="rounded-full px-4 py-2 font-bold"
                      >
                        {t("inventory.button.deactivate")}
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <>
              <SectionHeading
                title={t("inventory.itemCategories.title")}
                description={t("inventory.itemCategories.description")}
                action={<Button onClick={() => openNewItemCategory()} className="rounded-full bg-[#46644b] px-4 py-2 font-bold text-white hover:bg-[#39523d]">{t("inventory.button.newItemCategory")}</Button>}
              />

              <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <span className={cn("absolute inset-y-0 flex items-center text-gray-400", isArabic ? "left-3" : "right-3")}>
                      <LuSearch size={16} />
                    </span>
                    <input
                      type="text"
                      value={itemCategorySearch}
                      onChange={(event) => setItemCategorySearch(event.target.value)}
                      placeholder={t("inventory.itemCategories.filters.search")}
                      className={cn(
                        "w-full min-w-[320px] flex-1 rounded-[16px] border border-[#d6e1d9] bg-white py-2.5 text-sm font-semibold text-[#233329] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20",
                        isArabic ? "pl-9 pr-3 text-right" : "pr-9 pl-3 text-left"
                      )}
                    />
                  </div>

                  <select
                    value={itemCategoryStatusFilter}
                    onChange={(event) => setItemCategoryStatusFilter(event.target.value as "" | "true" | "false")}
                    className="min-w-[190px] rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                  >
                    <option value="">{t("inventory.filters.allStatuses")}</option>
                    <option value="true">{t("inventory.filters.activeOnly")}</option>
                    <option value="false">{t("inventory.filters.inactiveOnly")}</option>
                  </select>

                  <select
                    value={itemCategoryGroupFilter}
                    onChange={(event) => setItemCategoryGroupFilter(event.target.value)}
                    className="min-w-[220px] rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                  >
                    <option value="">{t("inventory.itemCategories.filters.allGroups")}</option>
                    {activeItemGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {formatCodeNameText(group.code, group.name, isArabic)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="overflow-x-auto">
                  {itemCategoriesQuery.isLoading ? (
                    <div className="rounded-2xl border border-[#e7ece8] bg-[#fafcfb] py-6 text-sm text-gray-500">{t("inventory.loading")}</div>
                  ) : itemCategories.length === 0 ? (
                    <EmptyState message={t("inventory.itemCategories.empty")} />
                  ) : (
                    <table className="min-w-full text-xs text-start">
                      <thead>
                        <tr className="border-b border-[#e1e7e2] text-[11px] uppercase tracking-wider text-[#6d7b73]">
                          <th className="px-4 py-3 text-start font-black">{isArabic ? "الرمز" : "Code"}</th>
                          <th className="px-4 py-3 text-start font-black">{isArabic ? "الاسم" : "Name"}</th>
                          <th className="px-4 py-3 text-start font-black">{isArabic ? "مجموعة المواد" : "Item Group"}</th>
                          <th className="px-4 py-3 text-end font-black">{isArabic ? "عدد الأصناف" : "Items"}</th>
                          <th className="px-4 py-3 text-center font-black">{isArabic ? "الحالة" : "Status"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f3f0]">
                        {itemCategories.map((category) => (
                          <tr
                            key={category.id}
                            onClick={() => setSelectedItemCategoryId(category.id)}
                            className="cursor-pointer text-[12px] transition hover:bg-[#f7faf7]"
                          >
                            <td className="px-4 py-3 font-bold text-gray-900 font-mono tracking-wider">{category.code}</td>
                            <td className="px-4 py-3 font-bold text-gray-900">{category.name}</td>
                            <td className="px-4 py-3 text-gray-600">
                              {formatCodeName(category.itemGroup.code, category.itemGroup.name, isArabic)}
                            </td>
                            <td className="px-4 py-3 text-end font-medium text-gray-600">{category.itemCount}</td>
                            <td className="px-4 py-3 text-center">
                              <StatusPill
                                label={category.isActive ? t("inventory.status.active") : t("inventory.status.inactive")}
                                tone={category.isActive ? "positive" : "warning"}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            </>
          )}
        </section>

        <section id="inventory-units-section" className={`space-y-5 ${workspace === "unitsOfMeasure" ? "" : "hidden"}`}>
          {selectedUnit ? (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setSelectedUnitId(null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d6e0d8] bg-white px-4 py-2 text-sm font-bold text-[#46644b] shadow-sm transition hover:bg-[#f6faf7] hover:text-[#233329]"
              >
                {isArabic ? <LuArrowRight className="h-4 w-4" /> : <LuArrowLeft className="h-4 w-4" />}
                {isArabic ? "العودة إلى وحدات القياس" : "Back to Units"}
              </button>

              <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <span className="mb-1 block text-xs font-semibold text-gray-500">{isArabic ? "نوع الوحدة" : "Unit Type"}</span>
                      <span className="text-sm font-bold text-[#233329]">{selectedUnit.unitType || t("inventory.emptyValue")}</span>
                    </Card>
                    <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <span className="mb-1 block text-xs font-semibold text-gray-500">{isArabic ? "خانات عشرية" : "Decimals"}</span>
                      <span className="text-lg font-bold text-[#233329]">{selectedUnit.decimalPrecision}</span>
                    </Card>
                    <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <span className="mb-1 block text-xs font-semibold text-gray-500">{isArabic ? "عدد الأصناف" : "Items"}</span>
                      <span className="text-lg font-bold text-[#233329]">{selectedUnit.itemCount}</span>
                    </Card>
                  </div>

                  <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-6 shadow-sm">
                    <div className="flex items-start justify-between border-b border-[#f0f3f0] pb-4">
                      <div>
                        <span className="text-xs font-mono tracking-wider text-[#7d8c83]">{selectedUnit.code}</span>
                        <h2 className="mt-1 text-xl font-black text-[#233329]">{selectedUnit.name}</h2>
                      </div>
                      <StatusPill
                        label={selectedUnit.isActive ? t("inventory.status.active") : t("inventory.status.inactive")}
                        tone={selectedUnit.isActive ? "positive" : "warning"}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <DetailCard label={t("inventory.units.field.unitType")} value={selectedUnit.unitType || t("inventory.emptyValue")} />
                      <DetailCard label={t("inventory.units.field.decimalPrecision")} value={String(selectedUnit.decimalPrecision)} />
                      <DetailCard label={t("inventory.units.detail.itemCount")} value={String(selectedUnit.itemCount)} />
                    </div>

                    {selectedUnit.description ? (
                      <div className="border-t border-[#f0f3f0] pt-4">
                        <span className="mb-1 block text-xs font-semibold text-gray-500">{isArabic ? "الوصف" : "Description"}</span>
                        <p className="whitespace-pre-wrap text-sm text-gray-700">{selectedUnit.description}</p>
                      </div>
                    ) : null}
                  </Card>
                </div>

                <div>
                  <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-4 shadow-sm">
                    <h3 className="border-b border-[#f0f3f0] pb-2 text-sm font-black text-[#233329]">
                      {isArabic ? "العمليات" : "Actions"}
                    </h3>
                    <div className="flex flex-col gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => openEditUnit(selectedUnit)}
                        disabled={!selectedUnit.isActive}
                        className="rounded-full border-[#d6e0d8] px-4 py-2 font-bold text-[#46644b]"
                      >
                        {t("inventory.button.editUnit")}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => confirmDeactivateUnit(selectedUnit.id)}
                        disabled={!selectedUnit.isActive || deactivateUnitMutation.isPending}
                        className="rounded-full px-4 py-2 font-bold"
                      >
                        {t("inventory.button.deactivate")}
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <>
              <SectionHeading
                title={t("inventory.units.title")}
                description={t("inventory.units.description")}
                action={<Button onClick={() => openNewUnit()} className="rounded-full bg-[#46644b] px-4 py-2 font-bold text-white hover:bg-[#39523d]">{t("inventory.button.newUnit")}</Button>}
              />

              <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <span className={cn("absolute inset-y-0 flex items-center text-gray-400", isArabic ? "left-3" : "right-3")}>
                      <LuSearch size={16} />
                    </span>
                    <input
                      type="text"
                      value={unitSearch}
                      onChange={(event) => setUnitSearch(event.target.value)}
                      placeholder={t("inventory.units.filters.search")}
                      className={cn(
                        "w-full min-w-[320px] flex-1 rounded-[16px] border border-[#d6e1d9] bg-white py-2.5 text-sm font-semibold text-[#233329] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20",
                        isArabic ? "pl-9 pr-3 text-right" : "pr-9 pl-3 text-left"
                      )}
                    />
                  </div>

                  <select
                    value={unitStatusFilter}
                    onChange={(event) => setUnitStatusFilter(event.target.value as "" | "true" | "false")}
                    className="min-w-[190px] rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                  >
                    <option value="">{t("inventory.filters.allStatuses")}</option>
                    <option value="true">{t("inventory.filters.activeOnly")}</option>
                    <option value="false">{t("inventory.filters.inactiveOnly")}</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  {unitsQuery.isLoading ? (
                    <div className="rounded-2xl border border-[#e7ece8] bg-[#fafcfb] py-6 text-sm text-gray-500">{t("inventory.loading")}</div>
                  ) : unitsOfMeasure.length === 0 ? (
                    <EmptyState message={t("inventory.units.empty")} />
                  ) : (
                    <table className="min-w-full text-xs text-start">
                      <thead>
                        <tr className="border-b border-[#e1e7e2] text-[11px] uppercase tracking-wider text-[#6d7b73]">
                          <th className="px-4 py-3 text-start font-black">{isArabic ? "الرمز" : "Code"}</th>
                          <th className="px-4 py-3 text-start font-black">{isArabic ? "الاسم" : "Name"}</th>
                          <th className="px-4 py-3 text-start font-black">{isArabic ? "نوع الوحدة" : "Unit Type"}</th>
                          <th className="px-4 py-3 text-end font-black">{isArabic ? "الخانات العشرية" : "Decimals"}</th>
                          <th className="px-4 py-3 text-end font-black">{isArabic ? "عدد الأصناف" : "Items"}</th>
                          <th className="px-4 py-3 text-center font-black">{isArabic ? "الحالة" : "Status"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f3f0]">
                        {unitsOfMeasure.map((unit) => (
                          <tr
                            key={unit.id}
                            onClick={() => setSelectedUnitId(unit.id)}
                            className="cursor-pointer text-[12px] transition hover:bg-[#f7faf7]"
                          >
                            <td className="px-4 py-3 font-bold text-gray-900 font-mono tracking-wider">{unit.code}</td>
                            <td className="px-4 py-3 font-bold text-gray-900">{unit.name}</td>
                            <td className="px-4 py-3 text-gray-600">{unit.unitType || "—"}</td>
                            <td className="px-4 py-3 text-end font-medium text-gray-600">{unit.decimalPrecision}</td>
                            <td className="px-4 py-3 text-end font-medium text-gray-600">{unit.itemCount}</td>
                            <td className="px-4 py-3 text-center">
                              <StatusPill
                                label={unit.isActive ? t("inventory.status.active") : t("inventory.status.inactive")}
                                tone={unit.isActive ? "positive" : "warning"}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            </>
          )}
        </section>

        <section id="inventory-items-section" className={`space-y-5 ${workspace === "items" ? "" : "hidden"}`}>
          {isItemEditorOpen ? (
            <ItemEditorModal
              presentation="inline"
              isOpen={isItemEditorOpen}
              onClose={closeItemEditor}
              title={itemEditor.id ? t("inventory.editor.editTitle") : t("inventory.editor.createTitle")}
              editor={itemEditor}
              onChange={setItemEditor}
              onSave={submitItemEditor}
              isSaving={createItemMutation.isPending || updateItemMutation.isPending}
              validationError={itemMutationError}
              activeItemGroups={activeItemGroups}
              activeItemCategories={activeItemCategories}
              activeUnitsOfMeasure={activeUnitsOfMeasure}
              activeTaxes={activeTaxes}
              warehouses={warehouses}
              inventoryAccounts={inventoryAccountsQuery.data ?? []}
              expenseAccounts={cogsAccountsQuery.data ?? []}
              salesAccounts={salesAccountsQuery.data ?? []}
              cogsAccounts={cogsAccountsQuery.data ?? []}
              adjustmentAccounts={adjustmentAccountsQuery.data ?? []}
              generateBarcode={() => void generateBarcodeMutation.mutate()}
              isGeneratingBarcode={generateBarcodeMutation.isPending}
              generateQr={generateQrForItemEditor}
              previewCodes={previewItemCodes}
              printLabel={printItemLabel}
              showCodePreview={showItemCodePreview}
              getBarcodePreviewSvg={getBarcodePreviewSvg}
              getQrPreviewSvg={getQrPreviewSvg}
            />
          ) : selectedItemId && selectedItem ? (
            <div className="space-y-5 text-start">
              {/* Back Button and status bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedItemId(null)}
                  className="flex items-center gap-1.5 rounded-full border border-[#d6e0d8] bg-white px-4 py-2 text-xs font-bold text-[#46644b] hover:bg-gray-50 transition shadow-sm"
                >
                  {isArabic ? <LuChevronRight size={14} className="ml-1" /> : <LuChevronLeft size={14} className="mr-1" />}
                  <span>{isArabic ? "العودة إلى قائمة الأصناف" : "Back to Items List"}</span>
                </button>
                
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border",
                    selectedItem.isActive
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-slate-50 text-slate-800 border-slate-200"
                  )}
                >
                  {selectedItem.isActive ? (isArabic ? "نشط" : "Active") : (isArabic ? "غير نشط" : "Inactive")}
                </span>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button
                    onClick={() => openEditItem(selectedItem)}
                    className="rounded-full bg-[#46644b] px-4 py-2 text-xs font-bold text-white hover:bg-[#39523d] transition shadow-sm flex items-center gap-1.5"
                  >
                    <LuPencil size={13} />
                    <span>{isArabic ? "تعديل بطاقة المادة" : "Edit Item"}</span>
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => confirmDeactivateItem(selectedItem.id)}
                    disabled={!selectedItem.isActive || deactivateItemMutation.isPending}
                    className="rounded-full px-4 py-2 text-xs font-bold"
                  >
                    {t("inventory.button.deactivate")}
                  </Button>
                </div>
              </div>

              {/* Grid of details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Basic & Stock Info */}
                <div className="md:col-span-2 space-y-6">
                  {/* Stocks Overview Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <span className="block text-xs font-semibold text-gray-500 mb-1">{isArabic ? "الكمية المتوفرة" : "On Hand Qty"}</span>
                      <span className="text-lg font-bold text-[#233329]">
                        {selectedItem.onHandQuantity} {selectedItem.unitOfMeasure}
                      </span>
                    </Card>
                    <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <span className="block text-xs font-semibold text-gray-500 mb-1">{isArabic ? "قيمة المخزون" : "Valuation Amount"}</span>
                      <span className="text-lg font-bold text-[#233329]">
                        {selectedItem.valuationAmount} {selectedItem.currencyCode || "JOD"}
                      </span>
                    </Card>
                    <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <span className="block text-xs font-semibold text-gray-500 mb-1">{isArabic ? "مستوى إعادة الطلب" : "Reorder Level"}</span>
                      <span className="text-lg font-bold text-[#233329]">
                        {selectedItem.reorderLevel || "0.00"}
                      </span>
                    </Card>
                  </div>

                  {/* Main Details Card */}
                  <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-6">
                    <h2 className="text-lg font-black text-[#233329] border-b border-[#f0f3f0] pb-3">
                      {isArabic ? "تفاصيل المادة" : "Item Information"}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-gray-50">
                        <span className="text-gray-500">{isArabic ? "الرمز (SKU)" : "Code (SKU)"}</span>
                        <span className="font-bold text-gray-900">{selectedItem.code}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-50">
                        <span className="text-gray-500">{isArabic ? "الاسم" : "Name"}</span>
                        <span className="font-bold text-gray-900">{selectedItem.name}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-50">
                        <span className="text-gray-500">{isArabic ? "النوع" : "Type"}</span>
                        <span className="font-bold text-gray-900">{t(`inventory.type.${selectedItem.type}`)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-50">
                        <span className="text-gray-500">{isArabic ? "وحدة القياس" : "Unit of Measure"}</span>
                        <span className="font-bold text-gray-900">{selectedItem.unitOfMeasure}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-50">
                        <span className="text-gray-500">{isArabic ? "مجموعة المواد" : "Item Group"}</span>
                        <span className="font-bold text-gray-900">
                          {selectedItem.itemGroup ? selectedItem.itemGroup.name : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-50">
                        <span className="text-gray-500">{isArabic ? "الفئة" : "Category"}</span>
                        <span className="font-bold text-gray-900">
                          {selectedItem.itemCategory ? selectedItem.itemCategory.name : selectedItem.category || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-50">
                        <span className="text-gray-500">{isArabic ? "سعر البيع الافتراضي" : "Default Sales Price"}</span>
                        <span className="font-bold text-gray-900">
                          {selectedItem.defaultSalesPrice} {selectedItem.currencyCode || "JOD"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-50">
                        <span className="text-gray-500">{isArabic ? "سعر الشراء الافتراضي" : "Default Purchase Price"}</span>
                        <span className="font-bold text-gray-900">
                          {selectedItem.defaultPurchasePrice} {selectedItem.currencyCode || "JOD"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-50">
                        <span className="text-gray-500">{isArabic ? "خاضع للضريبة" : "Taxable"}</span>
                        <span className="font-bold text-gray-900">
                          {selectedItem.taxable ? (isArabic ? "نعم" : "Yes") : (isArabic ? "لا" : "No")}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-50">
                        <span className="text-gray-500">{isArabic ? "الضريبة الافتراضية" : "Default Tax"}</span>
                        <span className="font-bold text-gray-900">
                          {selectedItem.defaultTax ? `${selectedItem.defaultTax.taxName} (${selectedItem.defaultTax.rate}%)` : "—"}
                        </span>
                      </div>
                    </div>

                    {selectedItem.description && (
                      <div className="pt-4 border-t border-[#f0f3f0] space-y-2">
                        <span className="text-xs font-semibold text-gray-500 block">{isArabic ? "الوصف" : "Description"}</span>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedItem.description}</p>
                      </div>
                    )}
                    {selectedItem.internalNotes && (
                      <div className="pt-4 border-t border-[#f0f3f0] space-y-2">
                        <span className="text-xs font-semibold text-gray-500 block">{isArabic ? "ملاحظات داخلية" : "Internal Notes"}</span>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedItem.internalNotes}</p>
                      </div>
                    )}
                  </Card>

                  {/* Unit Conversions Table Card */}
                  {selectedItem.unitConversions && selectedItem.unitConversions.length > 0 && (
                    <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-4">
                      <h2 className="text-lg font-black text-[#233329] border-b border-[#f0f3f0] pb-3">
                        {isArabic ? "تحويلات الوحدات" : "Unit Conversions"}
                      </h2>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#e1e7e2] text-[#6d7b73]">
                              <th className="px-4 py-2 text-start font-black">{isArabic ? "الوحدة" : "Unit"}</th>
                              <th className="px-4 py-2 text-center font-black">{isArabic ? "معامل التحويل" : "Conversion Factor"}</th>
                              <th className="px-4 py-2 text-start font-black">{isArabic ? "سعر البيع" : "Sales Price"}</th>
                              <th className="px-4 py-2 text-start font-black">{isArabic ? "سعر الشراء" : "Purchase Price"}</th>
                              <th className="px-4 py-2 text-start font-black">{isArabic ? "الباركود" : "Barcode"}</th>
                              <th className="px-4 py-2 text-center font-black">{isArabic ? "الوحدة الأساسية" : "Base Unit"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#f0f3f0]">
                            {selectedItem.unitConversions.map((conv) => (
                              <tr key={conv.id} className="hover:bg-gray-50/50 transition">
                                <td className="px-4 py-2.5 font-bold text-gray-900">{conv.unit?.name || conv.unit?.code}</td>
                                <td className="px-4 py-2.5 text-center text-gray-700">{conv.conversionFactorToBaseUnit}</td>
                                <td className="px-4 py-2.5 text-gray-700">{conv.defaultSalesPrice}</td>
                                <td className="px-4 py-2.5 text-gray-700">{conv.defaultPurchasePrice}</td>
                                <td className="px-4 py-2.5 text-gray-500 font-mono">{conv.barcode || "—"}</td>
                                <td className="px-4 py-2.5 text-center">
                                  {conv.isBaseUnit ? (
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-xs font-bold">
                                      {isArabic ? "أساسية" : "Base"}
                                    </span>
                                  ) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Sidebar Info: Barcode / QR / Accounts / Location */}
                <div className="space-y-6">
                  {/* Barcode Card */}
                  {selectedItem.barcode && (
                    <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-4">
                      <h2 className="text-sm font-black text-[#233329] border-b border-[#f0f3f0] pb-2">
                        {isArabic ? "الباركود" : "Barcode"}
                      </h2>
                      <div className="flex flex-col items-center justify-center bg-gray-50/50 rounded-2xl p-4">
                        <div
                          className="overflow-hidden rounded-xl bg-white border border-gray-150 p-3 flex items-center justify-center w-full max-w-[260px]"
                          dangerouslySetInnerHTML={{ __html: getBarcodePreviewSvg(selectedItem.barcode) }}
                        />
                      </div>
                    </Card>
                  )}

                  {/* QR Code Card */}
                  {selectedItem.qrCodeValue && (
                    <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-4">
                      <h2 className="text-sm font-black text-[#233329] border-b border-[#f0f3f0] pb-2">
                        {isArabic ? "رمز QR" : "QR Code"}
                      </h2>
                      <div className="flex flex-col items-center justify-center bg-gray-50/50 rounded-2xl p-4">
                        <div
                          className="overflow-hidden rounded-xl bg-white border border-gray-150 p-3 flex items-center justify-center w-full max-w-[140px]"
                          dangerouslySetInnerHTML={{ __html: getQrPreviewSvg(selectedItem.qrCodeValue) }}
                        />
                      </div>
                    </Card>
                  )}

                  {/* Financial Accounts Card */}
                  <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-4">
                    <h2 className="text-sm font-black text-[#233329] border-b border-[#f0f3f0] pb-2">
                      {isArabic ? "الحسابات المالية" : "Financial Accounts"}
                    </h2>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500">{isArabic ? "حساب المخزون" : "Inventory Account"}</span>
                        <span className="font-bold text-gray-900 text-end">
                          {selectedItem.inventoryAccount
                            ? `${selectedItem.inventoryAccount.code} · ${isArabic ? selectedItem.inventoryAccount.nameAr || selectedItem.inventoryAccount.name : selectedItem.inventoryAccount.name}`
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500">{isArabic ? "حساب تكلفة المبيعات" : "COGS Account"}</span>
                        <span className="font-bold text-gray-900 text-end">
                          {selectedItem.cogsAccount
                            ? `${selectedItem.cogsAccount.code} · ${isArabic ? selectedItem.cogsAccount.nameAr || selectedItem.cogsAccount.name : selectedItem.cogsAccount.name}`
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500">{isArabic ? "حساب المبيعات" : "Sales Account"}</span>
                        <span className="font-bold text-gray-900 text-end">
                          {selectedItem.salesAccount
                            ? `${selectedItem.salesAccount.code} · ${isArabic ? selectedItem.salesAccount.nameAr || selectedItem.salesAccount.name : selectedItem.salesAccount.name}`
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">{isArabic ? "حساب التعديل" : "Adjustment Account"}</span>
                        <span className="font-bold text-gray-900 text-end">
                          {selectedItem.adjustmentAccount
                            ? `${selectedItem.adjustmentAccount.code} · ${isArabic ? (selectedItem.adjustmentAccount as any).nameAr || selectedItem.adjustmentAccount.name : selectedItem.adjustmentAccount.name}`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Location & Preferred Warehouse Card */}
                  <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-4">
                    <h2 className="text-sm font-black text-[#233329] border-b border-[#f0f3f0] pb-2">
                      {isArabic ? "المستودع المفضل" : "Preferred Warehouse"}
                    </h2>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500">{isArabic ? "المستودع" : "Warehouse"}</span>
                        <span className="font-bold text-gray-900">
                          {selectedItem.preferredWarehouse
                            ? `${selectedItem.preferredWarehouse.code} · ${selectedItem.preferredWarehouse.name}`
                            : selectedItem.preferredWarehouseCode || "—"}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <>
              <SectionHeading
                title={t("inventory.items.title")}
                description={t("inventory.items.description")}
                action={
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setIsItemImportOpen(true)}>
                      {t("inventory.button.importItems")}
                    </Button>
                    <Button onClick={() => openNewItem()}>{t("inventory.button.newItem")}</Button>
                  </div>
                }
              />

              <div className="w-full">
            <Card className="space-y-5">
              <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_180px_180px_220px_220px]">
                <div className="relative">
                  <span className={cn("absolute inset-y-0 flex items-center text-gray-400", isArabic ? "left-3" : "right-3")}>
                    <LuSearch size={16} />
                  </span>
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(event) => setItemSearch(event.target.value)}
                    placeholder={t("inventory.filters.search")}
                    className={cn(
                      "w-full rounded-[16px] border border-[#d6e1d9] bg-white py-2.5 text-sm font-semibold text-[#233329] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20",
                      isArabic ? "pl-9 pr-3 text-right" : "pr-9 pl-3 text-left"
                    )}
                  />
                </div>

                <select
                  value={itemStatusFilter}
                  onChange={(event) => setItemStatusFilter(event.target.value as "" | "true" | "false")}
                  className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                >
                  <option value="">{t("inventory.filters.allStatuses")}</option>
                  <option value="true">{t("inventory.filters.activeOnly")}</option>
                  <option value="false">{t("inventory.filters.inactiveOnly")}</option>
                </select>

                <select
                  value={itemTypeFilter}
                  onChange={(event) => setItemTypeFilter(event.target.value as InventoryItemType | "")}
                  className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                >
                  <option value="">{t("inventory.filters.allTypes")}</option>
                  {ITEM_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {t(`inventory.type.${type}`)}
                    </option>
                  ))}
                </select>

                <select
                  value={itemGroupFilter}
                  onChange={(event) => {
                    setItemGroupFilter(event.target.value);
                    setItemCategoryFilter("");
                  }}
                  className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                >
                  <option value="">{t("inventory.filters.allItemGroups")}</option>
                  {activeItemGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {formatCodeNameText(group.code, group.name, isArabic)}
                    </option>
                  ))}
                </select>

                <select
                  value={itemCategoryFilter}
                  onChange={(event) => setItemCategoryFilter(event.target.value)}
                  className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                >
                  <option value="">{t("inventory.filters.allItemCategories")}</option>
                  {activeItemCategories
                    .filter((category) => !itemGroupFilter || category.itemGroupId === itemGroupFilter)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {formatCodeNameText(category.code, category.name, isArabic)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="overflow-x-auto">
                {inventoryItemsQuery.isLoading ? (
                  <div className="text-sm text-gray-500 py-4">{t("inventory.loading")}</div>
                ) : items.length === 0 ? (
                  <EmptyState message={t("inventory.empty")} />
                ) : (
                  <table className="min-w-full text-xs text-start">
                    <thead>
                      <tr className="border-b border-[#e1e7e2] text-[#6d7b73] text-[11px] uppercase tracking-wider">
                        <th className="px-4 py-3 text-start font-black">{isArabic ? "الرمز" : "Code"}</th>
                        <th className="px-4 py-3 text-start font-black">{isArabic ? "الاسم" : "Name"}</th>
                        <th className="px-4 py-3 text-start font-black">{isArabic ? "النوع" : "Type"}</th>
                        <th className="px-4 py-3 text-start font-black">{isArabic ? "الوحدة" : "Unit"}</th>
                        <th className="px-4 py-3 text-start font-black">{isArabic ? "المجموعة" : "Group"}</th>
                        <th className="px-4 py-3 text-end font-black">{isArabic ? "سعر البيع" : "Sales Price"}</th>
                        <th className="px-4 py-3 text-end font-black">{isArabic ? "الكمية المتوفرة" : "On Hand"}</th>
                        <th className="px-4 py-3 text-center font-black">{isArabic ? "الحالة" : "Status"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f3f0]">
                      {items.map((item) => {
                        const isSelected = selectedItemId === item.id;

                        // Derive dot color
                        const isDrink = item.code?.startsWith("POS-DRK") || item.category?.includes("Drinks") || item.category?.includes("مشروبات");
                        const isService = item.type === "SERVICE" || item.code?.startsWith("POS-SRV");
                        let dotColor = "#1D9E75"; // active sellable
                        if (isService) {
                          dotColor = "#9CA3AF"; // service
                        } else if (isDrink) {
                          dotColor = "#3B82F6"; // drinks/variants
                        }

                        return (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedItemId(item.id)}
                            className={cn(
                              "hover:bg-gray-50/70 transition cursor-pointer text-[12px]",
                              isSelected ? "bg-teal-50/50 font-semibold" : ""
                            )}
                          >
                            <td className="px-4 py-3 font-bold text-gray-900">
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-block rounded-full shrink-0"
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    backgroundColor: dotColor,
                                  }}
                                />
                                <span className="font-mono tracking-wider">{item.code}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">
                              {item.name}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {t(`inventory.type.${item.type}`)}
                            </td>
                            <td className="px-4 py-3 text-gray-500 font-medium">
                              {item.unitOfMeasure}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {item.itemGroup ? item.itemGroup.name : "—"}
                            </td>
                            <td className="px-4 py-3 text-end font-bold text-gray-900">
                              {item.defaultSalesPrice} {item.currencyCode || "JOD"}
                            </td>
                            <td className="px-4 py-3 text-end font-bold text-[#46644b]">
                              {item.onHandQuantity}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                                  item.isActive
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-slate-50 text-slate-800 border-slate-200"
                                )}
                              >
                                {item.isActive ? (isArabic ? "نشط" : "Active") : (isArabic ? "غير نشط" : "Inactive")}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 text-sm text-gray-600">
                <div>
                  {t("inventory.pagination.summary", {
                    from: itemRangeStart,
                    to: itemRangeEnd,
                    total: itemTotal,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    {t("inventory.pagination.page", { page: itemPage, totalPages: itemTotalPages })}
                  </span>
                  <Button variant="secondary" onClick={() => setItemPage((current) => current - 1)} disabled={itemPage <= 1}>
                    {t("inventory.pagination.previous")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setItemPage((current) => current + 1)}
                    disabled={itemPage >= itemTotalPages}
                  >
                    {t("inventory.pagination.next")}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
            </>
          )}
        </section>

        <section id="inventory-issues-section" className={`space-y-5 ${workspace === "issues" ? "" : "hidden"}`}>
          {isIssueEditorOpen ? (
            <IssueEditorModal
              presentation="inline"
              isOpen={isIssueEditorOpen}
              title={issueEditor.id ? t("inventory.issues.editor.editTitle") : t("inventory.issues.editor.createTitle")}
              editor={issueEditor}
              onClose={closeIssueEditor}
              onChange={setIssueEditor}
              onSave={() => {
                if (issueEditor.id) {
                  void updateIssueMutation.mutate();
                } else {
                  void createIssueMutation.mutate();
                }
              }}
              isSaving={createIssueMutation.isPending || updateIssueMutation.isPending}
              validationError={issueMutationError}
              items={items}
              warehouses={warehouses}
            />
          ) : (
            <>
              <SectionHeading
                title={t("inventory.issues.title")}
                description={t("inventory.issues.description")}
                action={<Button onClick={() => openNewIssue()} className="rounded-full bg-[#46644b] px-4 py-2 font-bold text-white hover:bg-[#39523d]">{t("inventory.button.newIssue")}</Button>}
              />

          <div className={cn("grid gap-6", selectedIssue ? "lg:grid-cols-[1.3fr_1fr]" : "")}>
            <Card className="space-y-5 rounded-[28px] border-[#d7ddd8] bg-white p-5 shadow-sm">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_220px]">
                <div className="relative">
                  <span className={cn("absolute inset-y-0 flex items-center text-gray-400", isArabic ? "left-3" : "right-3")}>
                    <LuSearch size={16} />
                  </span>
                  <input
                    type="text"
                    value={issueSearch}
                    onChange={(event) => setIssueSearch(event.target.value)}
                    placeholder={t("inventory.issues.filters.search")}
                    className={cn(
                      "w-full rounded-[16px] border border-[#d6e1d9] bg-white py-2.5 text-sm font-semibold text-[#233329] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20",
                      isArabic ? "pl-9 pr-3 text-right" : "pr-9 pl-3 text-left"
                    )}
                  />
                </div>

                <select
                  value={issueStatusFilter}
                  onChange={(event) => setIssueStatusFilter(event.target.value as InventoryIssueStatus | "")}
                  className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                >
                  <option value="">{t("inventory.issues.filters.allStatuses")}</option>
                  {ISSUE_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {t(`inventory.issues.status.${status}`)}
                    </option>
                  ))}
                </select>

                <select
                  value={issueWarehouseFilter}
                  onChange={(event) => setIssueWarehouseFilter(event.target.value)}
                  className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                >
                  <option value="">{t("inventory.issues.filters.allWarehouses")}</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} · {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto">
                {goodsIssuesQuery.isLoading ? (
                  <div className="rounded-[24px] border border-[#e6ece7] bg-[#fafcfb] px-5 py-8 text-sm text-[#66756d]">{t("inventory.issues.loading")}</div>
                ) : issues.length === 0 ? (
                  <EmptyState message={t("inventory.issues.empty")} />
                ) : (
                  <table className="min-w-full text-xs text-start">
                    <thead>
                      <tr className="border-b border-[#e1e7e2] text-[11px] uppercase tracking-wider text-[#6d7b73]">
                        <th className="px-4 py-3 text-start font-black">{isArabic ? "المرجع" : "Reference"}</th>
                        <th className="px-4 py-3 text-start font-black">{isArabic ? "المستودع" : "Warehouse"}</th>
                        <th className="px-4 py-3 text-start font-black">{isArabic ? "التاريخ" : "Date"}</th>
                        <th className="px-4 py-3 text-end font-black">{isArabic ? "الكمية" : "Quantity"}</th>
                        <th className="px-4 py-3 text-end font-black">{isArabic ? "القيمة" : "Amount"}</th>
                        <th className="px-4 py-3 text-center font-black">{isArabic ? "الحالة" : "Status"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f3f0]">
                      {issues.map((issue) => {
                        const isSelected = selectedIssue?.id === issue.id;
                        return (
                          <tr
                            key={issue.id}
                            onClick={() => setSelectedIssueId(issue.id)}
                            className={cn(
                              "cursor-pointer text-[12px] transition hover:bg-[#f7faf7]",
                              isSelected ? "bg-rose-50/60 font-semibold" : "",
                            )}
                          >
                            <td className="px-4 py-3 font-bold text-gray-900">
                              <div className="flex items-center gap-2">
                                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                                <span className="font-mono tracking-wider">{issue.reference}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">{issue.warehouse.name}</td>
                            <td className="px-4 py-3 text-gray-600">{issue.issueDate.slice(0, 10)}</td>
                            <td className="px-4 py-3 text-end font-medium text-[#46644b]">{issue.totalQuantity}</td>
                            <td className="px-4 py-3 text-end font-bold text-gray-900">{issue.totalAmount}</td>
                            <td className="px-4 py-3 text-center">
                              <StatusPill label={t(`inventory.issues.status.${issue.status}`)} tone={issueTone(issue.status)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1ee] pt-4 text-sm text-[#66756d]">
                <div>
                  {t("inventory.pagination.summary", {
                    from: issuesRangeStart,
                    to: issuesRangeEnd,
                    total: issuesTotal,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    {t("inventory.pagination.page", { page: issuePage, totalPages: issuesTotalPages })}
                  </span>
                  <Button variant="secondary" onClick={() => setIssuePage((current) => current - 1)} disabled={issuePage <= 1}>
                    {t("inventory.pagination.previous")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setIssuePage((current) => current + 1)}
                    disabled={issuePage >= issuesTotalPages}
                  >
                    {t("inventory.pagination.next")}
                  </Button>
                </div>
              </div>
            </Card>

            {selectedIssue ? (
              <Card className="space-y-4 rounded-[28px] border-[#d7ddd8] bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7d8c83]">{selectedIssue.reference}</div>
                      <h2 className="text-2xl font-black tracking-tight text-[#233329]">{selectedIssue.warehouse.name}</h2>
                    </div>
                    <StatusPill label={t(`inventory.issues.status.${selectedIssue.status}`)} tone={issueTone(selectedIssue.status)} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailCard label={t("inventory.issues.detail.date")} value={selectedIssue.issueDate.slice(0, 10)} />
                    <DetailCard label={t("inventory.issues.detail.lines")} value={String(selectedIssue.lines.length)} />
                    <DetailCard label={t("inventory.issues.detail.totalQuantity")} value={selectedIssue.totalQuantity} />
                    <DetailCard label={t("inventory.issues.detail.totalAmount")} value={selectedIssue.totalAmount} />
                  </div>

                  <div className="space-y-2 rounded-[24px] bg-[#fafcfb] p-4 text-sm leading-7 text-[#66756d]">
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.issues.field.warehouse")}:</span>{" "}
                      {selectedIssue.warehouse.code} · {selectedIssue.warehouse.name}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.issues.field.sourceSalesOrder")}:</span>{" "}
                      {selectedIssue.sourceSalesOrderRef || t("inventory.emptyValue")}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.issues.field.sourceSalesInvoice")}:</span>{" "}
                      {selectedIssue.sourceSalesInvoiceRef || t("inventory.emptyValue")}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.issues.field.sourceProductionRequest")}:</span>{" "}
                      {selectedIssue.sourceProductionRequestRef || t("inventory.emptyValue")}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.issues.field.sourceInternalRequest")}:</span>{" "}
                      {selectedIssue.sourceInternalRequestRef || t("inventory.emptyValue")}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.issues.field.postedAt")}:</span>{" "}
                      {selectedIssue.postedAt ? selectedIssue.postedAt.slice(0, 10) : t("inventory.issues.notPosted")}
                    </div>
                  </div>

                  {selectedIssue.description ? <p className="text-sm leading-7 text-[#66756d]">{selectedIssue.description}</p> : null}

                  <div className="space-y-2 rounded-[24px] border border-[#e1e7e2] bg-[#fafcfb] p-4">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7d8c83]">
                      {t("inventory.issues.lines.title")}
                    </div>
                    {selectedIssue.lines.map((line) => (
                      <div key={line.id} className="rounded-2xl border border-[#edf1ee] bg-white px-4 py-3 text-sm text-[#66756d] shadow-sm">
                        <div className="font-semibold text-[#233329]">
                          {formatItemServiceLabel(line.item.code, line.item.name)}
                        </div>
                        <div>
                          {line.quantity} {line.unitOfMeasure} · {line.unitCost} · {line.lineTotalAmount}
                        </div>
                        <div>
                          {t("inventory.issues.detail.available")}: {line.item.onHandQuantity}
                        </div>
                        {line.description ? <div>{line.description}</div> : null}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button variant="secondary" onClick={() => openEditIssue(selectedIssue)} disabled={!selectedIssue.canEdit} className="rounded-full border-[#d6e0d8] px-4 py-2 font-bold text-[#46644b]">
                      {t("inventory.button.editIssue")}
                    </Button>
                    <Button
                      onClick={() => confirmPostIssue(selectedIssue.id)}
                      disabled={!selectedIssue.canPost || postIssueMutation.isPending}
                      className="rounded-full bg-[#46644b] px-4 py-2 font-bold text-white hover:bg-[#39523d]"
                    >
                      {t("inventory.button.postIssue")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmCancelIssue(selectedIssue.id)}
                      disabled={!selectedIssue.canCancel || cancelIssueMutation.isPending}
                      className="rounded-full px-4 py-2 font-bold"
                    >
                      {t("inventory.button.cancelIssue")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmReverseIssue(selectedIssue.id)}
                      disabled={!selectedIssue.canReverse || reverseIssueMutation.isPending}
                      className="rounded-full px-4 py-2 font-bold"
                    >
                      {t("inventory.button.reverseIssue")}
                    </Button>
                  </div>
              </Card>
            ) : null}
          </div>
            </>
          )}
        </section>

        <section id="inventory-transfers-section" className={`space-y-5 ${workspace === "transfers" ? "" : "hidden"}`}>
          {isTransferEditorOpen ? (
            <TransferEditorModal
              presentation="inline"
              isOpen={isTransferEditorOpen}
              title={transferEditor.id ? t("inventory.transfers.editor.editTitle") : t("inventory.transfers.editor.createTitle")}
              editor={transferEditor}
              onClose={closeTransferEditor}
              onChange={setTransferEditor}
              onSave={() => {
                if (transferEditor.id) {
                  void updateTransferMutation.mutate();
                } else {
                  void createTransferMutation.mutate();
                }
              }}
              isSaving={createTransferMutation.isPending || updateTransferMutation.isPending}
              validationError={transferMutationError}
              items={items}
              warehouses={warehouses}
            />
          ) : (
            <>
              <SectionHeading
                title={t("inventory.transfers.title")}
                description={t("inventory.transfers.description")}
                action={<Button onClick={() => openNewTransfer()} className="rounded-full bg-[#46644b] px-4 py-2 font-bold text-white hover:bg-[#39523d]">{t("inventory.button.newTransfer")}</Button>}
              />

          <div className={cn("grid gap-6", selectedTransfer ? "lg:grid-cols-[1.3fr_1fr]" : "")}>
            <Card className="space-y-5 rounded-[28px] border-[#d7ddd8] bg-white p-5 shadow-sm">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_210px_210px]">
                <div className="relative">
                  <span className={cn("absolute inset-y-0 flex items-center text-gray-400", isArabic ? "left-3" : "right-3")}>
                    <LuSearch size={16} />
                  </span>
                  <input
                    type="text"
                    value={transferSearch}
                    onChange={(event) => setTransferSearch(event.target.value)}
                    placeholder={t("inventory.transfers.filters.search")}
                    className={cn(
                      "w-full rounded-[16px] border border-[#d6e1d9] bg-white py-2.5 text-sm font-semibold text-[#233329] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20",
                      isArabic ? "pl-9 pr-3 text-right" : "pr-9 pl-3 text-left"
                    )}
                  />
                </div>

                <select
                  value={transferStatusFilter}
                  onChange={(event) => setTransferStatusFilter(event.target.value as InventoryTransferStatus | "")}
                  className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                >
                  <option value="">{t("inventory.transfers.filters.allStatuses")}</option>
                  {TRANSFER_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {t(`inventory.transfers.status.${status}`)}
                    </option>
                  ))}
                </select>

                <select
                  value={transferSourceWarehouseFilter}
                  onChange={(event) => setTransferSourceWarehouseFilter(event.target.value)}
                  className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                >
                  <option value="">{t("inventory.transfers.filters.allSourceWarehouses")}</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} · {warehouse.name}
                    </option>
                  ))}
                </select>

                <select
                  value={transferDestinationWarehouseFilter}
                  onChange={(event) => setTransferDestinationWarehouseFilter(event.target.value)}
                  className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                >
                  <option value="">{t("inventory.transfers.filters.allDestinationWarehouses")}</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} · {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto">
                {inventoryTransfersQuery.isLoading ? (
                  <div className="rounded-[24px] border border-[#e6ece7] bg-[#fafcfb] px-5 py-8 text-sm text-[#66756d]">{t("inventory.transfers.loading")}</div>
                ) : transfers.length === 0 ? (
                  <EmptyState message={t("inventory.transfers.empty")} />
                ) : (
                  <table className="min-w-full text-xs text-start">
                    <thead>
                      <tr className="border-b border-[#e1e7e2] text-[11px] uppercase tracking-wider text-[#6d7b73]">
                        <th className="px-4 py-3 text-start font-black">{isArabic ? "المرجع" : "Reference"}</th>
                        <th className="px-4 py-3 text-start font-black">{isArabic ? "من" : "From"}</th>
                        <th className="px-4 py-3 text-start font-black">{isArabic ? "إلى" : "To"}</th>
                        <th className="px-4 py-3 text-start font-black">{isArabic ? "التاريخ" : "Date"}</th>
                        <th className="px-4 py-3 text-end font-black">{isArabic ? "الكمية" : "Quantity"}</th>
                        <th className="px-4 py-3 text-center font-black">{isArabic ? "الحالة" : "Status"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f3f0]">
                      {transfers.map((transfer) => {
                        const isSelected = selectedTransfer?.id === transfer.id;
                        return (
                          <tr
                            key={transfer.id}
                            onClick={() => setSelectedTransferId(transfer.id)}
                            className={cn(
                              "cursor-pointer text-[12px] transition hover:bg-[#f7faf7]",
                              isSelected ? "bg-violet-50/60 font-semibold" : "",
                            )}
                          >
                            <td className="px-4 py-3 font-bold text-gray-900">
                              <div className="flex items-center gap-2">
                                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                                <span className="font-mono tracking-wider">{transfer.reference}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">{transfer.sourceWarehouse.name}</td>
                            <td className="px-4 py-3 font-bold text-gray-900">{transfer.destinationWarehouse.name}</td>
                            <td className="px-4 py-3 text-gray-600">{transfer.transferDate.slice(0, 10)}</td>
                            <td className="px-4 py-3 text-end font-medium text-[#46644b]">{transfer.totalQuantity}</td>
                            <td className="px-4 py-3 text-center">
                              <StatusPill label={t(`inventory.transfers.status.${transfer.status}`)} tone={transferTone(transfer.status)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1ee] pt-4 text-sm text-[#66756d]">
                <div>
                  {t("inventory.pagination.summary", {
                    from: transfersRangeStart,
                    to: transfersRangeEnd,
                    total: transfersTotal,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    {t("inventory.pagination.page", { page: transferPage, totalPages: transfersTotalPages })}
                  </span>
                  <Button variant="secondary" onClick={() => setTransferPage((current) => current - 1)} disabled={transferPage <= 1}>
                    {t("inventory.pagination.previous")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setTransferPage((current) => current + 1)}
                    disabled={transferPage >= transfersTotalPages}
                  >
                    {t("inventory.pagination.next")}
                  </Button>
                </div>
              </div>
            </Card>

            {selectedTransfer ? (
              <Card className="space-y-4 rounded-[28px] border-[#d7ddd8] bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7d8c83]">{selectedTransfer.reference}</div>
                      <h2 className="text-2xl font-black tracking-tight text-[#233329]">
                        {selectedTransfer.sourceWarehouse.name} {"->"} {selectedTransfer.destinationWarehouse.name}
                      </h2>
                    </div>
                    <StatusPill
                      label={t(`inventory.transfers.status.${selectedTransfer.status}`)}
                      tone={transferTone(selectedTransfer.status)}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailCard label={t("inventory.transfers.detail.date")} value={selectedTransfer.transferDate.slice(0, 10)} />
                    <DetailCard label={t("inventory.transfers.detail.lines")} value={String(selectedTransfer.lines.length)} />
                    <DetailCard label={t("inventory.transfers.detail.totalQuantity")} value={selectedTransfer.totalQuantity} />
                    <DetailCard label={t("inventory.transfers.detail.totalAmount")} value={selectedTransfer.totalAmount} />
                  </div>

                  <div className="space-y-2 rounded-[24px] bg-[#fafcfb] p-4 text-sm leading-7 text-[#66756d]">
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.transfers.field.sourceWarehouse")}:</span>{" "}
                      {selectedTransfer.sourceWarehouse.code} · {selectedTransfer.sourceWarehouse.name}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.transfers.field.destinationWarehouse")}:</span>{" "}
                      {selectedTransfer.destinationWarehouse.code} · {selectedTransfer.destinationWarehouse.name}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.transfers.field.postedAt")}:</span>{" "}
                      {selectedTransfer.postedAt ? selectedTransfer.postedAt.slice(0, 10) : t("inventory.transfers.notPosted")}
                    </div>
                  </div>

                  {selectedTransfer.description ? <p className="text-sm leading-7 text-[#66756d]">{selectedTransfer.description}</p> : null}

                  <div className="space-y-2 rounded-[24px] border border-[#e1e7e2] bg-[#fafcfb] p-4">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7d8c83]">
                      {t("inventory.transfers.lines.title")}
                    </div>
                    {selectedTransfer.lines.map((line) => (
                      <div key={line.id} className="rounded-2xl border border-[#edf1ee] bg-white px-4 py-3 text-sm text-[#66756d] shadow-sm">
                        <div className="font-semibold text-[#233329]">
                          {formatItemServiceLabel(line.item.code, line.item.name)}
                        </div>
                        <div>
                          {line.quantity} {line.unitOfMeasure} · {line.unitCost} · {line.lineTotalAmount}
                        </div>
                        <div>
                          {t("inventory.transfers.detail.available")}: {line.item.onHandQuantity}
                        </div>
                        {line.description ? <div>{line.description}</div> : null}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => openEditTransfer(selectedTransfer)}
                      disabled={!selectedTransfer.canEdit}
                      className="rounded-full border-[#d6e0d8] px-4 py-2 font-bold text-[#46644b]"
                    >
                      {t("inventory.button.editTransfer")}
                    </Button>
                    <Button
                      onClick={() => confirmPostTransfer(selectedTransfer.id)}
                      disabled={!selectedTransfer.canPost || postTransferMutation.isPending}
                      className="rounded-full bg-[#46644b] px-4 py-2 font-bold text-white hover:bg-[#39523d]"
                    >
                      {t("inventory.button.postTransfer")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmCancelTransfer(selectedTransfer.id)}
                      disabled={!selectedTransfer.canCancel || cancelTransferMutation.isPending}
                      className="rounded-full px-4 py-2 font-bold"
                    >
                      {t("inventory.button.cancelTransfer")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmReverseTransfer(selectedTransfer.id)}
                      disabled={!selectedTransfer.canReverse || reverseTransferMutation.isPending}
                      className="rounded-full px-4 py-2 font-bold"
                    >
                      {t("inventory.button.reverseTransfer")}
                    </Button>
                  </div>
              </Card>
            ) : null}
          </div>
            </>
          )}
        </section>

        <section id="inventory-adjustments-section" className={`space-y-5 ${workspace === "adjustments" ? "" : "hidden"}`}>
          {isAdjustmentEditorOpen ? (
            <AdjustmentEditorModal
              presentation="inline"
              isOpen={isAdjustmentEditorOpen}
              title={adjustmentEditor.id ? t("inventory.adjustments.editor.editTitle") : t("inventory.adjustments.editor.createTitle")}
              editor={adjustmentEditor}
              onClose={closeAdjustmentEditor}
              onChange={setAdjustmentEditor}
              onSave={() => {
                if (adjustmentEditor.id) {
                  void updateAdjustmentMutation.mutate();
                } else {
                  void createAdjustmentMutation.mutate();
                }
              }}
              isSaving={createAdjustmentMutation.isPending || updateAdjustmentMutation.isPending}
              validationError={adjustmentMutationError}
              items={items}
              warehouses={warehouses}
            />
          ) : (
            <>
              <SectionHeading
                title={t("inventory.adjustments.title")}
                description={t("inventory.adjustments.description")}
                action={<Button onClick={() => openNewAdjustment()} className="rounded-full bg-[#46644b] px-4 py-2 font-bold text-white hover:bg-[#39523d]">{t("inventory.button.newAdjustment")}</Button>}
              />

          <div className={cn("grid gap-6", selectedAdjustment ? "lg:grid-cols-[1.3fr_1fr]" : "")}>
            <Card className="space-y-5 rounded-[28px] border-[#d7ddd8] bg-white p-5 shadow-sm">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_210px_210px]">
                <div className="relative">
                  <span className={cn("absolute inset-y-0 flex items-center text-gray-400", isArabic ? "left-3" : "right-3")}>
                    <LuSearch size={16} />
                  </span>
                  <input
                    type="text"
                    value={adjustmentSearch}
                    onChange={(event) => setAdjustmentSearch(event.target.value)}
                    placeholder={t("inventory.adjustments.filters.search")}
                    className={cn(
                      "w-full rounded-[16px] border border-[#d6e1d9] bg-white py-2.5 text-sm font-semibold text-[#233329] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20",
                      isArabic ? "pl-9 pr-3 text-right" : "pr-9 pl-3 text-left"
                    )}
                  />
                </div>

                <select
                  value={adjustmentStatusFilter}
                  onChange={(event) => setAdjustmentStatusFilter(event.target.value as InventoryAdjustmentStatus | "")}
                  className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                >
                  <option value="">{t("inventory.adjustments.filters.allStatuses")}</option>
                  {ADJUSTMENT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {t(`inventory.adjustments.status.${status}`)}
                    </option>
                  ))}
                </select>

                <select
                  value={adjustmentWarehouseFilter}
                  onChange={(event) => setAdjustmentWarehouseFilter(event.target.value)}
                  className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                >
                  <option value="">{t("inventory.adjustments.filters.allWarehouses")}</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} · {warehouse.name}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <input
                    type="text"
                    value={adjustmentReasonFilter}
                    onChange={(event) => setAdjustmentReasonFilter(event.target.value)}
                    placeholder={t("inventory.adjustments.filters.reason")}
                    className={cn(
                      "w-full rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] py-2.5 text-sm font-semibold text-[#233329] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20",
                      isArabic ? "px-3 text-right" : "px-3 text-left"
                    )}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                {inventoryAdjustmentsQuery.isLoading ? (
                  <div className="rounded-[24px] border border-[#e6ece7] bg-[#fafcfb] px-5 py-8 text-sm text-[#66756d]">{t("inventory.adjustments.loading")}</div>
                ) : adjustments.length === 0 ? (
                  <EmptyState message={t("inventory.adjustments.empty")} />
                ) : (
                  <table className="min-w-full text-xs text-start">
                    <thead>
                      <tr className="border-b border-[#e1e7e2] text-[11px] uppercase tracking-wider text-[#6d7b73]">
                        <th className="px-4 py-3 text-start font-black">{isArabic ? "المرجع" : "Reference"}</th>
                        <th className="px-4 py-3 text-start font-black">{isArabic ? "المستودع" : "Warehouse"}</th>
                        <th className="px-4 py-3 text-start font-black">{isArabic ? "السبب" : "Reason"}</th>
                        <th className="px-4 py-3 text-start font-black">{isArabic ? "التاريخ" : "Date"}</th>
                        <th className="px-4 py-3 text-end font-black">{isArabic ? "الفرق" : "Variance"}</th>
                        <th className="px-4 py-3 text-center font-black">{isArabic ? "الحالة" : "Status"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f3f0]">
                      {adjustments.map((adjustment) => {
                        const isSelected = selectedAdjustment?.id === adjustment.id;
                        return (
                          <tr
                            key={adjustment.id}
                            onClick={() => setSelectedAdjustmentId(adjustment.id)}
                            className={cn(
                              "cursor-pointer text-[12px] transition hover:bg-[#f7faf7]",
                              isSelected ? "bg-emerald-50/60 font-semibold" : "",
                            )}
                          >
                            <td className="px-4 py-3 font-bold text-gray-900">
                              <div className="flex items-center gap-2">
                                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                <span className="font-mono tracking-wider">{adjustment.reference}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">{adjustment.warehouse.name}</td>
                            <td className="px-4 py-3 text-gray-600">{adjustment.reason}</td>
                            <td className="px-4 py-3 text-gray-600">{adjustment.adjustmentDate.slice(0, 10)}</td>
                            <td className="px-4 py-3 text-end font-medium text-[#46644b]">{adjustment.totalVarianceQuantity}</td>
                            <td className="px-4 py-3 text-center">
                              <StatusPill label={t(`inventory.adjustments.status.${adjustment.status}`)} tone={adjustmentTone(adjustment.status)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1ee] pt-4 text-sm text-[#66756d]">
                <div>
                  {t("inventory.pagination.summary", {
                    from: adjustmentsRangeStart,
                    to: adjustmentsRangeEnd,
                    total: adjustmentsTotal,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    {t("inventory.pagination.page", { page: adjustmentPage, totalPages: adjustmentsTotalPages })}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => setAdjustmentPage((current) => current - 1)}
                    disabled={adjustmentPage <= 1}
                  >
                    {t("inventory.pagination.previous")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setAdjustmentPage((current) => current + 1)}
                    disabled={adjustmentPage >= adjustmentsTotalPages}
                  >
                    {t("inventory.pagination.next")}
                  </Button>
                </div>
              </div>
            </Card>

            {selectedAdjustment ? (
              <Card className="space-y-4 rounded-[28px] border-[#d7ddd8] bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7d8c83]">{selectedAdjustment.reference}</div>
                      <h2 className="text-2xl font-black tracking-tight text-[#233329]">{selectedAdjustment.warehouse.name}</h2>
                    </div>
                    <StatusPill
                      label={t(`inventory.adjustments.status.${selectedAdjustment.status}`)}
                      tone={adjustmentTone(selectedAdjustment.status)}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailCard label={t("inventory.adjustments.detail.date")} value={selectedAdjustment.adjustmentDate.slice(0, 10)} />
                    <DetailCard label={t("inventory.adjustments.detail.lines")} value={String(selectedAdjustment.lines.length)} />
                    <DetailCard label={t("inventory.adjustments.detail.totalVariance")} value={selectedAdjustment.totalVarianceQuantity} />
                    <DetailCard label={t("inventory.adjustments.detail.totalAmount")} value={selectedAdjustment.totalAmount} />
                  </div>

                  <div className="space-y-2 rounded-[24px] bg-[#fafcfb] p-4 text-sm leading-7 text-[#66756d]">
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.adjustments.field.warehouse")}:</span>{" "}
                      {selectedAdjustment.warehouse.code} · {selectedAdjustment.warehouse.name}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.adjustments.field.reason")}:</span>{" "}
                      {selectedAdjustment.reason}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{t("inventory.adjustments.field.postedAt")}:</span>{" "}
                      {selectedAdjustment.postedAt ? selectedAdjustment.postedAt.slice(0, 10) : t("inventory.adjustments.notPosted")}
                    </div>
                  </div>

                  {selectedAdjustment.description ? <p className="text-sm leading-7 text-[#66756d]">{selectedAdjustment.description}</p> : null}

                  <div className="space-y-2 rounded-[24px] border border-[#e1e7e2] bg-[#fafcfb] p-4">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7d8c83]">
                      {t("inventory.adjustments.lines.title")}
                    </div>
                    {selectedAdjustment.lines.map((line) => (
                      <div key={line.id} className="rounded-2xl border border-[#edf1ee] bg-white px-4 py-3 text-sm text-[#66756d] shadow-sm">
                        <div className="font-semibold text-[#233329]">
                          {formatItemServiceLabel(line.item.code, line.item.name)}
                        </div>
                        <div>
                          {t("inventory.adjustments.detail.system")}: {line.systemQuantity} · {t("inventory.adjustments.detail.counted")}:{" "}
                          {line.countedQuantity}
                        </div>
                        <div>
                          {t("inventory.adjustments.detail.variance")}: {line.varianceQuantity} · {line.unitCost} · {line.lineTotalAmount}
                        </div>
                        {line.description ? <div>{line.description}</div> : null}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => openEditAdjustment(selectedAdjustment)}
                      disabled={!selectedAdjustment.canEdit}
                      className="rounded-full border-[#d6e0d8] px-4 py-2 font-bold text-[#46644b]"
                    >
                      {t("inventory.button.editAdjustment")}
                    </Button>
                    <Button
                      onClick={() => confirmPostAdjustment(selectedAdjustment.id)}
                      disabled={!selectedAdjustment.canPost || postAdjustmentMutation.isPending}
                      className="rounded-full bg-[#46644b] px-4 py-2 font-bold text-white hover:bg-[#39523d]"
                    >
                      {t("inventory.button.postAdjustment")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmCancelAdjustment(selectedAdjustment.id)}
                      disabled={!selectedAdjustment.canCancel || cancelAdjustmentMutation.isPending}
                      className="rounded-full px-4 py-2 font-bold"
                    >
                      {t("inventory.button.cancelAdjustment")}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmReverseAdjustment(selectedAdjustment.id)}
                      disabled={!selectedAdjustment.canReverse || reverseAdjustmentMutation.isPending}
                      className="rounded-full px-4 py-2 font-bold"
                    >
                      {t("inventory.button.reverseAdjustment")}
                    </Button>
                  </div>
              </Card>
            ) : null}
          </div>
            </>
          )}
        </section>

        <section id="inventory-warehouses-section" className={`space-y-5 ${workspace === "warehouses" ? "" : "hidden"}`}>
          {selectedWarehouse ? (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setSelectedWarehouseId(null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d6e0d8] bg-white px-4 py-2 text-sm font-bold text-[#46644b] shadow-sm transition hover:bg-[#f6faf7] hover:text-[#233329]"
              >
                {isArabic ? <LuArrowRight className="h-4 w-4" /> : <LuArrowLeft className="h-4 w-4" />}
                {isArabic ? "العودة إلى المستودعات" : "Back to Warehouses"}
              </button>

              <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <span className="mb-1 block text-xs font-semibold text-gray-500">{isArabic ? "نمط المستودع" : "Mode"}</span>
                      <span className="text-sm font-bold text-[#233329]">
                        {selectedWarehouse.isTransit ? t("inventory.warehouses.mode.transit") : t("inventory.warehouses.mode.storage")}
                      </span>
                    </Card>
                    <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <span className="mb-1 block text-xs font-semibold text-gray-500">{isArabic ? "ترانزيت افتراضي" : "Default Transit"}</span>
                      <span className="text-lg font-bold text-[#233329]">
                        {selectedWarehouse.isDefaultTransit ? t("inventory.boolean.yes") : t("inventory.boolean.no")}
                      </span>
                    </Card>
                    <Card className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <span className="mb-1 block text-xs font-semibold text-gray-500">{isArabic ? "عدد الأصناف" : "Items"}</span>
                      <span className="text-lg font-bold text-[#233329]">{selectedWarehouse.itemCount}</span>
                    </Card>
                  </div>

                  <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-6 shadow-sm">
                    <div className="flex items-start justify-between border-b border-[#f0f3f0] pb-4">
                      <div>
                        <span className="text-xs font-mono tracking-wider text-[#7d8c83]">{selectedWarehouse.code}</span>
                        <h2 className="mt-1 text-xl font-black text-[#233329]">{selectedWarehouse.name}</h2>
                      </div>
                      <StatusPill
                        label={selectedWarehouse.isActive ? t("inventory.status.active") : t("inventory.status.inactive")}
                        tone={selectedWarehouse.isActive ? "positive" : "warning"}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <DetailCard
                        label={t("inventory.warehouses.detail.mode")}
                        value={selectedWarehouse.isTransit ? t("inventory.warehouses.mode.transit") : t("inventory.warehouses.mode.storage")}
                      />
                      <DetailCard
                        label={t("inventory.warehouses.detail.defaultTransit")}
                        value={selectedWarehouse.isDefaultTransit ? t("inventory.boolean.yes") : t("inventory.boolean.no")}
                      />
                      <DetailCard label={t("inventory.warehouses.detail.itemCount")} value={String(selectedWarehouse.itemCount)} />
                    </div>

                    <div className="rounded-[24px] bg-[#fafcfb] p-4 text-sm leading-7 text-[#66756d]">
                      <div>
                        <span className="font-semibold text-gray-900">{t("inventory.warehouses.field.address")}:</span>{" "}
                        {selectedWarehouse.address || t("inventory.emptyValue")}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">{t("inventory.warehouses.field.responsiblePerson")}:</span>{" "}
                        {selectedWarehouse.responsiblePerson || t("inventory.emptyValue")}
                      </div>
                    </div>
                  </Card>
                </div>

                <div>
                  <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6 space-y-4 shadow-sm">
                    <h3 className="border-b border-[#f0f3f0] pb-2 text-sm font-black text-[#233329]">
                      {isArabic ? "العمليات" : "Actions"}
                    </h3>
                    <div className="flex flex-col gap-3">
                      <Button variant="secondary" onClick={() => openEditWarehouse(selectedWarehouse)} disabled={!selectedWarehouse.isActive} className="rounded-full border-[#d6e0d8] px-4 py-2 font-bold text-[#46644b]">
                        {t("inventory.button.editWarehouse")}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => confirmDeactivateWarehouse(selectedWarehouse.id)}
                        disabled={!selectedWarehouse.isActive || deactivateWarehouseMutation.isPending}
                        className="rounded-full px-4 py-2 font-bold"
                      >
                        {t("inventory.button.deactivate")}
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <>
              <SectionHeading
                title={t("inventory.warehouses.title")}
                description={t("inventory.warehouses.description")}
                action={<Button onClick={() => openNewWarehouse()} className="rounded-full bg-[#46644b] px-4 py-2 font-bold text-white hover:bg-[#39523d]">{t("inventory.button.newWarehouse")}</Button>}
              />

              <div className="space-y-6">
                <Card className="space-y-5 rounded-[28px] border-[#d7ddd8] bg-white p-5 shadow-sm">
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_220px]">
                    <div className="relative">
                      <span className={cn("absolute inset-y-0 flex items-center text-gray-400", isArabic ? "left-3" : "right-3")}>
                        <LuSearch size={16} />
                      </span>
                      <input
                        type="text"
                        value={warehouseSearch}
                        onChange={(event) => setWarehouseSearch(event.target.value)}
                        placeholder={t("inventory.warehouses.filters.search")}
                        className={cn(
                          "w-full rounded-[16px] border border-[#d6e1d9] bg-white py-2.5 text-sm font-semibold text-[#233329] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20",
                          isArabic ? "pl-9 pr-3 text-right" : "pr-9 pl-3 text-left"
                        )}
                      />
                    </div>

                    <select
                      value={warehouseStatusFilter}
                      onChange={(event) => setWarehouseStatusFilter(event.target.value as "" | "true" | "false")}
                      className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                    >
                      <option value="">{t("inventory.filters.allStatuses")}</option>
                      <option value="true">{t("inventory.filters.activeOnly")}</option>
                      <option value="false">{t("inventory.filters.inactiveOnly")}</option>
                    </select>

                    <select
                      value={warehouseTransitFilter}
                      onChange={(event) => setWarehouseTransitFilter(event.target.value as "" | "true" | "false")}
                      className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                    >
                      <option value="">{t("inventory.warehouses.filters.allModes")}</option>
                      <option value="false">{t("inventory.warehouses.filters.storageOnly")}</option>
                      <option value="true">{t("inventory.warehouses.filters.transitOnly")}</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    {inventoryWarehousesQuery.isLoading ? (
                      <div className="rounded-[24px] border border-[#e6ece7] bg-[#fafcfb] px-5 py-8 text-sm text-[#66756d]">{t("inventory.warehouses.loading")}</div>
                    ) : warehouses.length === 0 ? (
                      <EmptyState message={t("inventory.warehouses.empty")} />
                    ) : (
                      <table className="min-w-full text-xs text-start">
                        <thead>
                          <tr className="border-b border-[#e1e7e2] text-[11px] uppercase tracking-wider text-[#6d7b73]">
                            <th className="px-4 py-3 text-start font-black">{isArabic ? "الرمز" : "Code"}</th>
                            <th className="px-4 py-3 text-start font-black">{isArabic ? "الاسم" : "Name"}</th>
                            <th className="px-4 py-3 text-start font-black">{isArabic ? "النمط" : "Mode"}</th>
                            <th className="px-4 py-3 text-end font-black">{isArabic ? "عدد الأصناف" : "Items"}</th>
                            <th className="px-4 py-3 text-start font-black">{isArabic ? "المسؤول" : "Responsible"}</th>
                            <th className="px-4 py-3 text-center font-black">{isArabic ? "الحالة" : "Status"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0f3f0]">
                          {warehouses.map((warehouse) => (
                            <tr
                              key={warehouse.id}
                              onClick={() => setSelectedWarehouseId(warehouse.id)}
                              className="cursor-pointer text-[12px] transition hover:bg-[#f7faf7]"
                            >
                              <td className="px-4 py-3 font-bold text-gray-900">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                                      warehouse.isTransit ? "bg-[#c48a2c]" : "bg-[#4b7a57]",
                                    )}
                                  />
                                  <span className="font-mono tracking-wider">{warehouse.code}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-bold text-gray-900">{warehouse.name}</td>
                              <td className="px-4 py-3 text-gray-600">
                                {warehouse.isTransit ? t("inventory.warehouses.mode.transit") : t("inventory.warehouses.mode.storage")}
                                {warehouse.isDefaultTransit ? ` · ${t("inventory.warehouses.badge.defaultTransit")}` : ""}
                              </td>
                              <td className="px-4 py-3 text-end font-medium text-[#46644b]">{warehouse.itemCount}</td>
                              <td className="px-4 py-3 text-gray-600">{warehouse.responsiblePerson || "—"}</td>
                              <td className="px-4 py-3 text-center">
                                <StatusPill
                                  label={warehouse.isActive ? t("inventory.status.active") : t("inventory.status.inactive")}
                                  tone={warehouse.isActive ? "positive" : "warning"}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Card>

              </div>
            </>
          )}
        </section>

        <section id="inventory-receipts-section" className={`space-y-5 ${workspace === "receipts" ? "" : "hidden"}`}>
          {isReceiptEditorOpen ? (
            <ReceiptEditorModal
              presentation="inline"
              isOpen={isReceiptEditorOpen}
              title={receiptEditor.id ? t("inventory.receipts.editor.editTitle") : t("inventory.receipts.editor.createTitle")}
              editor={receiptEditor}
              onClose={closeReceiptEditor}
              onChange={setReceiptEditor}
              onSave={() => {
                if (receiptEditor.id) {
                  void updateReceiptMutation.mutate();
                } else {
                  void createReceiptMutation.mutate();
                }
              }}
              isSaving={createReceiptMutation.isPending || updateReceiptMutation.isPending}
              validationError={receiptMutationError}
              items={items}
              warehouses={warehouses}
            />
          ) : (
            <>
              <SectionHeading
                title={t("inventory.receipts.title")}
                description={t("inventory.receipts.description")}
                action={<Button onClick={() => openNewReceipt()} className="rounded-full bg-[#46644b] px-4 py-2 font-bold text-white hover:bg-[#39523d]">{t("inventory.button.newReceipt")}</Button>}
              />

              <div className={cn("grid gap-6", selectedReceipt ? "lg:grid-cols-[1.3fr_1fr]" : "")}>
                <Card className="space-y-5 rounded-[28px] border-[#d7ddd8] bg-white p-5 shadow-sm">
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_220px]">
                    <div className="relative">
                      <span className={cn("absolute inset-y-0 flex items-center text-gray-400", isArabic ? "left-3" : "right-3")}>
                        <LuSearch size={16} />
                      </span>
                      <input
                        type="text"
                        value={receiptSearch}
                        onChange={(event) => setReceiptSearch(event.target.value)}
                        placeholder={t("inventory.receipts.filters.search")}
                        className={cn(
                          "w-full rounded-[16px] border border-[#d6e1d9] bg-white py-2.5 text-sm font-semibold text-[#233329] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20",
                          isArabic ? "pl-9 pr-3 text-right" : "pr-9 pl-3 text-left"
                        )}
                      />
                    </div>

                    <select
                      value={receiptStatusFilter}
                      onChange={(event) => setReceiptStatusFilter(event.target.value as InventoryReceiptStatus | "")}
                      className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                    >
                      <option value="">{t("inventory.receipts.filters.allStatuses")}</option>
                      {RECEIPT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {t(`inventory.receipts.status.${status}`)}
                        </option>
                      ))}
                    </select>

                    <select
                      value={receiptWarehouseFilter}
                      onChange={(event) => setReceiptWarehouseFilter(event.target.value)}
                      className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
                    >
                      <option value="">{t("inventory.receipts.filters.allWarehouses")}</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.code} · {warehouse.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    {goodsReceiptsQuery.isLoading ? (
                      <div className="rounded-[24px] border border-[#e6ece7] bg-[#fafcfb] px-5 py-8 text-sm text-[#66756d]">{t("inventory.receipts.loading")}</div>
                    ) : receipts.length === 0 ? (
                      <EmptyState message={t("inventory.receipts.empty")} />
                    ) : (
                      <table className="min-w-full text-xs text-start">
                        <thead>
                          <tr className="border-b border-[#e1e7e2] text-[11px] uppercase tracking-wider text-[#6d7b73]">
                            <th className="px-4 py-3 text-start font-black">{isArabic ? "المرجع" : "Reference"}</th>
                            <th className="px-4 py-3 text-start font-black">{isArabic ? "المستودع" : "Warehouse"}</th>
                            <th className="px-4 py-3 text-start font-black">{isArabic ? "التاريخ" : "Date"}</th>
                            <th className="px-4 py-3 text-end font-black">{isArabic ? "الكمية" : "Quantity"}</th>
                            <th className="px-4 py-3 text-end font-black">{isArabic ? "القيمة" : "Amount"}</th>
                            <th className="px-4 py-3 text-center font-black">{isArabic ? "الحالة" : "Status"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0f3f0]">
                          {receipts.map((receipt) => {
                            const isSelected = selectedReceipt?.id === receipt.id;
                            return (
                              <tr
                                key={receipt.id}
                                onClick={() => setSelectedReceiptId(receipt.id)}
                                className={cn(
                                  "cursor-pointer text-[12px] transition hover:bg-[#f7faf7]",
                                  isSelected ? "bg-sky-50/60 font-semibold" : "",
                                )}
                              >
                                <td className="px-4 py-3 font-bold text-gray-900">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                                    <span className="font-mono tracking-wider">{receipt.reference}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-bold text-gray-900">{receipt.warehouse.name}</td>
                                <td className="px-4 py-3 text-gray-600">{receipt.receiptDate.slice(0, 10)}</td>
                                <td className="px-4 py-3 text-end font-medium text-[#46644b]">{receipt.totalQuantity}</td>
                                <td className="px-4 py-3 text-end font-bold text-gray-900">{receipt.totalAmount}</td>
                                <td className="px-4 py-3 text-center">
                                  <StatusPill label={t(`inventory.receipts.status.${receipt.status}`)} tone={receiptTone(receipt.status)} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1ee] pt-4 text-sm text-[#66756d]">
                    <div>
                      {t("inventory.pagination.summary", {
                        from: receiptsRangeStart,
                        to: receiptsRangeEnd,
                        total: receiptsTotal,
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                        {t("inventory.pagination.page", { page: receiptPage, totalPages: receiptsTotalPages })}
                      </span>
                      <Button variant="secondary" onClick={() => setReceiptPage((current) => current - 1)} disabled={receiptPage <= 1}>
                        {t("inventory.pagination.previous")}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setReceiptPage((current) => current + 1)}
                        disabled={receiptPage >= receiptsTotalPages}
                      >
                        {t("inventory.pagination.next")}
                      </Button>
                    </div>
                  </div>
                </Card>

                {selectedReceipt ? (
                  <Card className="space-y-4 rounded-[28px] border-[#d7ddd8] bg-white p-6 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7d8c83]">{selectedReceipt.reference}</div>
                          <h2 className="text-2xl font-black tracking-tight text-[#233329]">{selectedReceipt.warehouse.name}</h2>
                        </div>
                        <StatusPill label={t(`inventory.receipts.status.${selectedReceipt.status}`)} tone={receiptTone(selectedReceipt.status)} />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <DetailCard label={t("inventory.receipts.detail.date")} value={selectedReceipt.receiptDate.slice(0, 10)} />
                        <DetailCard label={t("inventory.receipts.detail.lines")} value={String(selectedReceipt.lines.length)} />
                        <DetailCard label={t("inventory.receipts.detail.totalQuantity")} value={selectedReceipt.totalQuantity} />
                        <DetailCard label={t("inventory.receipts.detail.totalAmount")} value={selectedReceipt.totalAmount} />
                      </div>

                      <div className="space-y-2 rounded-[24px] bg-[#fafcfb] p-4 text-sm leading-7 text-[#66756d]">
                        <div>
                          <span className="font-semibold text-gray-900">{t("inventory.receipts.field.warehouse")}:</span>{" "}
                          {selectedReceipt.warehouse.code} · {selectedReceipt.warehouse.name}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900">{t("inventory.receipts.field.sourcePurchaseOrder")}:</span>{" "}
                          {selectedReceipt.sourcePurchaseOrderRef || t("inventory.emptyValue")}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900">{t("inventory.receipts.field.sourcePurchaseInvoice")}:</span>{" "}
                          {selectedReceipt.sourcePurchaseInvoiceRef || t("inventory.emptyValue")}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900">{t("inventory.receipts.field.postedAt")}:</span>{" "}
                          {selectedReceipt.postedAt ? selectedReceipt.postedAt.slice(0, 10) : t("inventory.receipts.notPosted")}
                        </div>
                      </div>

                      {selectedReceipt.description ? <p className="text-sm leading-7 text-[#66756d]">{selectedReceipt.description}</p> : null}

                      <div className="space-y-2 rounded-[24px] border border-[#e1e7e2] bg-[#fafcfb] p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7d8c83]">
                          {t("inventory.receipts.lines.title")}
                        </div>
                        {selectedReceipt.lines.map((line) => (
                          <div key={line.id} className="rounded-2xl border border-[#edf1ee] bg-white px-4 py-3 text-sm text-[#66756d] shadow-sm">
                            <div className="font-semibold text-[#233329]">
                              {formatItemServiceLabel(line.item.code, line.item.name)}
                            </div>
                            <div>
                              {line.quantity} {line.unitOfMeasure} · {line.unitCost} · {line.lineTotalAmount}
                            </div>
                            {line.description ? <div>{line.description}</div> : null}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button variant="secondary" onClick={() => openEditReceipt(selectedReceipt)} disabled={!selectedReceipt.canEdit} className="rounded-full border-[#d6e0d8] px-4 py-2 font-bold text-[#46644b]">
                          {t("inventory.button.editReceipt")}
                        </Button>
                        <Button
                          onClick={() => confirmPostReceipt(selectedReceipt.id)}
                          disabled={!selectedReceipt.canPost || postReceiptMutation.isPending}
                          className="rounded-full bg-[#46644b] px-4 py-2 font-bold text-white hover:bg-[#39523d]"
                        >
                          {t("inventory.button.postReceipt")}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => confirmCancelReceipt(selectedReceipt.id)}
                          disabled={!selectedReceipt.canCancel || cancelReceiptMutation.isPending}
                          className="rounded-full px-4 py-2 font-bold"
                        >
                          {t("inventory.button.cancelReceipt")}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => confirmReverseReceipt(selectedReceipt.id)}
                          disabled={!selectedReceipt.canReverse || reverseReceiptMutation.isPending}
                          className="rounded-full px-4 py-2 font-bold"
                        >
                          {t("inventory.button.reverseReceipt")}
                        </Button>
                      </div>
                  </Card>
                ) : null}
              </div>
            </>
          )}
        </section>

        <section id="inventory-stock-ledger-section" className={`space-y-6 ${workspace === "stockLedger" ? "" : "hidden"}`}>
          <SectionHeading title={t("inventory.stockLedger.title")} description={t("inventory.stockLedger.description")} />

          <Card className="space-y-5 rounded-[28px] border-[#d7ddd8] bg-white p-5 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_190px_190px_190px]">
              <div className="relative">
                <span className={cn("absolute inset-y-0 flex items-center text-gray-400", isArabic ? "left-3" : "right-3")}>
                  <LuSearch size={16} />
                </span>
                <input
                  type="text"
                  value={stockLedgerSearch}
                  onChange={(event) => setStockLedgerSearch(event.target.value)}
                  placeholder={t("inventory.stockLedger.filters.search")}
                  className={cn(
                    "w-full rounded-[16px] border border-[#d6e1d9] bg-white py-2.5 text-sm font-semibold text-[#233329] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20",
                    isArabic ? "pl-9 pr-3 text-right" : "pr-9 pl-3 text-left"
                  )}
                />
              </div>

              <select
                value={stockLedgerItemFilter}
                onChange={(event) => setStockLedgerItemFilter(event.target.value)}
                className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
              >
                <option value="">{t("inventory.stockLedger.filters.allItems")}</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatItemServiceLabel(item.code, item.name)}
                  </option>
                ))}
              </select>

              <select
                value={stockLedgerWarehouseFilter}
                onChange={(event) => setStockLedgerWarehouseFilter(event.target.value)}
                className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
              >
                <option value="">{t("inventory.stockLedger.filters.allWarehouses")}</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} · {warehouse.name}
                  </option>
                ))}
              </select>

              <select
                value={stockLedgerMovementTypeFilter}
                onChange={(event) => setStockLedgerMovementTypeFilter(event.target.value as InventoryStockMovementType | "")}
                className="rounded-[16px] border border-[#d6e1d9] bg-[#fafcfb] px-3 py-2.5 text-sm font-semibold text-[#233329] focus:outline-none focus:ring-2 focus:ring-[#5f8a67]/20"
              >
                <option value="">{t("inventory.stockLedger.filters.allMovementTypes")}</option>
                {STOCK_MOVEMENT_TYPE_OPTIONS.map((movementType) => (
                  <option key={movementType} value={movementType}>
                    {t(`inventory.stockLedger.movementType.${movementType}`)}
                  </option>
                ))}
              </select>
            </div>

            {inventoryStockLedgerQuery.isLoading ? (
              <div className="rounded-[24px] border border-[#e6ece7] bg-[#fafcfb] px-5 py-8 text-sm text-[#66756d]">{t("inventory.stockLedger.loading")}</div>
            ) : stockMovements.length === 0 ? (
              <EmptyState message={t("inventory.stockLedger.empty")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-[#e1e7e2] text-[11px] uppercase tracking-wider text-[#6d7b73]">
                      <th className="px-4 py-3 text-start font-black">{isArabic ? "المرجع" : "Reference"}</th>
                      <th className="px-4 py-3 text-start font-black">{isArabic ? "الصنف" : "Item"}</th>
                      <th className="px-4 py-3 text-start font-black">{isArabic ? "المستودع" : "Warehouse"}</th>
                      <th className="px-4 py-3 text-start font-black">{isArabic ? "النوع" : "Type"}</th>
                      <th className="px-4 py-3 text-end font-black">{isArabic ? "داخل" : "In"}</th>
                      <th className="px-4 py-3 text-end font-black">{isArabic ? "خارج" : "Out"}</th>
                      <th className="px-4 py-3 text-end font-black">{isArabic ? "الرصيد" : "Balance"}</th>
                      <th className="px-4 py-3 text-center font-black">{isArabic ? "إجراء" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f3f0]">
                    {stockMovements.map((movement) => (
                      <tr key={movement.id} className="text-[12px] transition hover:bg-[#f7faf7]">
                        <td className="px-4 py-3 font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
                            <div>
                              <div className="font-mono tracking-wider">{movement.transactionReference}</div>
                              <div className="text-[11px] font-medium text-[#7d8c83]">{movement.transactionDate.slice(0, 10)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">{formatItemServiceLabel(movement.item.code, movement.item.name)}</td>
                        <td className="px-4 py-3 text-gray-600">{movement.warehouse.code} · {movement.warehouse.name}</td>
                        <td className="px-4 py-3">
                          <StatusPill label={t(`inventory.stockLedger.movementType.${movement.movementType}`)} tone="neutral" />
                        </td>
                        <td className="px-4 py-3 text-end font-medium text-emerald-700">{movement.quantityIn}</td>
                        <td className="px-4 py-3 text-end font-medium text-rose-700">{movement.quantityOut}</td>
                        <td className="px-4 py-3 text-end font-bold text-[#46644b]">{movement.runningQuantity}</td>
                        <td className="px-4 py-3 text-center">
                          {isStockMovementDrillDownSupported(movement) ? (
                            <Button variant="secondary" onClick={() => openStockMovementSource(movement)} className="rounded-full border-[#d6e0d8] px-3 py-1.5 text-xs font-bold text-[#46644b]">
                              {t("inventory.stockLedger.action.openSource")}
                            </Button>
                          ) : (
                            <span className="text-xs text-[#7d8c83]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1ee] pt-4 text-sm text-[#66756d]">
              <div>
                {t("inventory.pagination.summary", {
                  from: stockMovementsRangeStart,
                  to: stockMovementsRangeEnd,
                  total: stockMovementsTotal,
                })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                  {t("inventory.pagination.page", { page: stockLedgerPage, totalPages: stockMovementsTotalPages })}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setStockLedgerPage((current) => current - 1)}
                  disabled={stockLedgerPage <= 1}
                >
                  {t("inventory.pagination.previous")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setStockLedgerPage((current) => current + 1)}
                  disabled={stockLedgerPage >= stockMovementsTotalPages}
                >
                  {t("inventory.pagination.next")}
                </Button>
              </div>
            </div>
          </Card>
        </section>


        {/* Old item editor SidePanel removed */}
        <SidePanel
          isOpen={isItemGroupEditorOpen}
          onClose={closeItemGroupEditor}
          title={itemGroupEditor.id ? t("inventory.itemGroups.editor.editTitle") : t("inventory.itemGroups.editor.createTitle")}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.itemGroups.field.code")} hint={t("inventory.field.codeHint")}>
                <Input value={itemGroupEditor.code} onChange={(event) => setItemGroupEditor((current) => ({ ...current, code: event.target.value }))} />
              </Field>
              <Field label={t("inventory.itemGroups.field.name")}>
                <Input value={itemGroupEditor.name} onChange={(event) => setItemGroupEditor((current) => ({ ...current, name: event.target.value }))} />
              </Field>
              <Field label={t("inventory.itemGroups.field.parentGroup")}>
                <ItemGroupSelect
                  value={itemGroupEditor.parentGroupId}
                  onChange={(value) => setItemGroupEditor((current) => ({ ...current, parentGroupId: value }))}
                  options={activeItemGroups.filter((group) => group.id !== itemGroupEditor.id)}
                  placeholder={t("inventory.placeholder.selectOptionalItemGroup")}
                />
              </Field>
            </div>
            <Field label={t("inventory.field.description")}>
              <Textarea value={itemGroupEditor.description} rows={3} onChange={(event) => setItemGroupEditor((current) => ({ ...current, description: event.target.value }))} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.field.inventoryAccount")}>
                <AccountSelect value={itemGroupEditor.inventoryAccountId} onChange={(value) => setItemGroupEditor((current) => ({ ...current, inventoryAccountId: value }))} options={inventoryAccountsQuery.data ?? []} placeholder={t("inventory.placeholder.selectAccount")} />
              </Field>
              <Field label={t("inventory.field.cogsAccount")}>
                <AccountSelect value={itemGroupEditor.cogsAccountId} onChange={(value) => setItemGroupEditor((current) => ({ ...current, cogsAccountId: value }))} options={cogsAccountsQuery.data ?? []} placeholder={t("inventory.placeholder.selectAccount")} />
              </Field>
              <Field label={t("inventory.field.salesAccount")}>
                <AccountSelect value={itemGroupEditor.salesAccountId} onChange={(value) => setItemGroupEditor((current) => ({ ...current, salesAccountId: value }))} options={salesAccountsQuery.data ?? []} placeholder={t("inventory.placeholder.selectAccount")} />
              </Field>
              <Field label={t("inventory.field.adjustmentAccount")}>
                <AccountSelect value={itemGroupEditor.adjustmentAccountId} onChange={(value) => setItemGroupEditor((current) => ({ ...current, adjustmentAccountId: value }))} options={adjustmentAccountsQuery.data ?? []} placeholder={t("inventory.placeholder.selectAccount")} />
              </Field>
            </div>
            {itemGroupFormError ? <ErrorBox message={itemGroupFormError} /> : null}
            {itemGroupMutationError ? <ErrorBox message={itemGroupMutationError} /> : null}
            <EditorActions
              onCancel={closeItemGroupEditor}
              onSave={() => {
                if (itemGroupFormError) return;
                if (itemGroupEditor.id) void updateItemGroupMutation.mutate();
                else void createItemGroupMutation.mutate();
              }}
              disabled={Boolean(itemGroupFormError) || createItemGroupMutation.isPending || updateItemGroupMutation.isPending}
              label={itemGroupEditor.id ? t("inventory.button.save") : t("inventory.button.createItemGroup")}
              cancelLabel={t("inventory.button.cancel")}
            />
          </div>
        </SidePanel>

        <SidePanel
          isOpen={isItemCategoryEditorOpen}
          onClose={closeItemCategoryEditor}
          title={itemCategoryEditor.id ? t("inventory.itemCategories.editor.editTitle") : t("inventory.itemCategories.editor.createTitle")}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.itemCategories.field.code")} hint={t("inventory.field.codeHint")}>
                <Input value={itemCategoryEditor.code} onChange={(event) => setItemCategoryEditor((current) => ({ ...current, code: event.target.value }))} disabled={Boolean(itemCategoryEditor.id)} />
              </Field>
              <Field label={t("inventory.itemCategories.field.name")}>
                <Input value={itemCategoryEditor.name} onChange={(event) => setItemCategoryEditor((current) => ({ ...current, name: event.target.value }))} />
              </Field>
              <Field label={t("inventory.itemCategories.field.itemGroup")}>
                <ItemGroupSelect
                  value={itemCategoryEditor.itemGroupId}
                  onChange={(value) => setItemCategoryEditor((current) => ({ ...current, itemGroupId: value }))}
                  options={activeItemGroups}
                  placeholder={t("inventory.placeholder.selectItemGroup")}
                />
              </Field>
            </div>
            <Field label={t("inventory.field.description")}>
              <Textarea value={itemCategoryEditor.description} rows={3} onChange={(event) => setItemCategoryEditor((current) => ({ ...current, description: event.target.value }))} />
            </Field>
            {itemCategoryFormError ? <ErrorBox message={itemCategoryFormError} /> : null}
            {itemCategoryMutationError ? <ErrorBox message={itemCategoryMutationError} /> : null}
            <EditorActions
              onCancel={closeItemCategoryEditor}
              onSave={() => {
                if (itemCategoryFormError) return;
                if (itemCategoryEditor.id) void updateItemCategoryMutation.mutate();
                else void createItemCategoryMutation.mutate();
              }}
              disabled={Boolean(itemCategoryFormError) || createItemCategoryMutation.isPending || updateItemCategoryMutation.isPending}
              label={itemCategoryEditor.id ? t("inventory.button.save") : t("inventory.button.createItemCategory")}
              cancelLabel={t("inventory.button.cancel")}
            />
          </div>
        </SidePanel>

        <SidePanel
          isOpen={isUnitEditorOpen}
          onClose={closeUnitEditor}
          title={unitEditor.id ? t("inventory.units.editor.editTitle") : t("inventory.units.editor.createTitle")}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.units.field.code")} hint={t("inventory.field.codeHint")}>
                <Input value={unitEditor.code} onChange={(event) => setUnitEditor((current) => ({ ...current, code: event.target.value }))} disabled={Boolean(unitEditor.id)} />
              </Field>
              <Field label={t("inventory.units.field.name")}>
                <Input value={unitEditor.name} onChange={(event) => setUnitEditor((current) => ({ ...current, name: event.target.value }))} />
              </Field>
              <Field label={t("inventory.units.field.unitType")}>
                <Input value={unitEditor.unitType} onChange={(event) => setUnitEditor((current) => ({ ...current, unitType: event.target.value }))} />
              </Field>
              <Field label={t("inventory.units.field.decimalPrecision")}>
                <Input value={unitEditor.decimalPrecision} onChange={(event) => setUnitEditor((current) => ({ ...current, decimalPrecision: event.target.value }))} />
              </Field>
            </div>
            <Field label={t("inventory.field.description")}>
              <Textarea value={unitEditor.description} rows={3} onChange={(event) => setUnitEditor((current) => ({ ...current, description: event.target.value }))} />
            </Field>
            {unitFormError ? <ErrorBox message={unitFormError} /> : null}
            {unitMutationError ? <ErrorBox message={unitMutationError} /> : null}
            <EditorActions
              onCancel={closeUnitEditor}
              onSave={() => {
                if (unitFormError) return;
                if (unitEditor.id) void updateUnitMutation.mutate();
                else void createUnitMutation.mutate();
              }}
              disabled={Boolean(unitFormError) || createUnitMutation.isPending || updateUnitMutation.isPending}
              label={unitEditor.id ? t("inventory.button.save") : t("inventory.button.createUnit")}
              cancelLabel={t("inventory.button.cancel")}
            />
          </div>
        </SidePanel>

        <SidePanel
          isOpen={isWarehouseEditorOpen}
          onClose={closeWarehouseEditor}
          title={warehouseEditor.id ? t("inventory.warehouses.editor.editTitle") : t("inventory.warehouses.editor.createTitle")}
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.warehouses.field.code")} hint={t("inventory.warehouses.field.codeHint")}>
                <Input value={warehouseEditor.code} onChange={(event) => setWarehouseEditor((current) => ({ ...current, code: event.target.value }))} />
              </Field>
              <Field label={t("inventory.warehouses.field.name")}>
                <Input value={warehouseEditor.name} onChange={(event) => setWarehouseEditor((current) => ({ ...current, name: event.target.value }))} />
              </Field>
            </div>

            <Field label={t("inventory.warehouses.field.address")}>
              <Textarea value={warehouseEditor.address} rows={4} onChange={(event) => setWarehouseEditor((current) => ({ ...current, address: event.target.value }))} />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("inventory.warehouses.field.responsiblePerson")}>
                <Input
                  value={warehouseEditor.responsiblePerson}
                  onChange={(event) => setWarehouseEditor((current) => ({ ...current, responsiblePerson: event.target.value }))}
                />
              </Field>
              <Field label={t("inventory.warehouses.field.mode")}>
                <Select
                  value={warehouseEditor.isTransit ? "transit" : "storage"}
                  onChange={(event) =>
                    setWarehouseEditor((current) => {
                      const isTransit = event.target.value === "transit";
                      return { ...current, isTransit, isDefaultTransit: isTransit ? current.isDefaultTransit : false };
                    })
                  }
                >
                  <option value="storage">{t("inventory.warehouses.mode.storage")}</option>
                  <option value="transit">{t("inventory.warehouses.mode.transit")}</option>
                </Select>
              </Field>
              <Field label={t("inventory.warehouses.field.defaultTransit")}>
                <Select
                  value={warehouseEditor.isDefaultTransit ? "true" : "false"}
                  onChange={(event) =>
                    setWarehouseEditor((current) => ({ ...current, isDefaultTransit: event.target.value === "true" }))
                  }
                  disabled={!warehouseEditor.isTransit}
                >
                  <option value="false">{t("inventory.boolean.no")}</option>
                  <option value="true">{t("inventory.boolean.yes")}</option>
                </Select>
              </Field>
            </div>

            {warehouseFormError ? <ErrorBox message={warehouseFormError} /> : null}
            {warehouseMutationError ? <ErrorBox message={warehouseMutationError} /> : null}

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={closeWarehouseEditor}>
                {t("inventory.button.cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (warehouseFormError) return;
                  if (warehouseEditor.id) {
                    void updateWarehouseMutation.mutate();
                    return;
                  }
                  void createWarehouseMutation.mutate();
                }}
                disabled={Boolean(warehouseFormError) || createWarehouseMutation.isPending || updateWarehouseMutation.isPending}
              >
                {warehouseEditor.id ? t("inventory.button.save") : t("inventory.button.createWarehouse")}
              </Button>
            </div>
          </div>
        </SidePanel>

      </div>
      <ItemImportModal
        open={isItemImportOpen}
        onClose={() => setIsItemImportOpen(false)}
        onImported={async () => {
          await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
        }}
      />
    </PageShell>
  );

  function openNewItem() {
    setItemEditor(createEmptyItemEditor());
    setShowItemCodePreview(false);
    setIsItemEditorOpen(true);
  }

  function openEditItem(item: InventoryItem) {
    setItemEditor(mapItemToEditor(item));
    setShowItemCodePreview(Boolean(item.barcode || item.qrCodeValue));
    setIsItemEditorOpen(true);
  }

  function addUnitConversionRow() {
    setItemEditor((current) => ({
      ...current,
      unitConversions: [...current.unitConversions, createUnitConversionEditor()],
    }));
  }

  function updateUnitConversionRow(
    key: string,
    updater: (row: ItemUnitConversionEditorState) => ItemUnitConversionEditorState,
  ) {
    setItemEditor((current) => ({
      ...current,
      unitConversions: current.unitConversions.map((row) =>
        row.key === key ? updater(row) : row,
      ),
    }));
  }

  function removeUnitConversionRow(key: string) {
    setItemEditor((current) => {
      const row = current.unitConversions.find((entry) => entry.key === key);
      if (!row || row.isBaseUnit) {
        return current;
      }

      return {
        ...current,
        unitConversions: current.unitConversions.filter((entry) => entry.key !== key),
      };
    });
  }

  function submitItemEditor(mode: "save" | "saveAndClose") {
    itemSaveModeRef.current = mode;
    if (itemEditor.id) {
      void updateItemMutation.mutate();
      return;
    }
    void createItemMutation.mutate();
  }

  function openNewItemGroup() {
    setItemGroupEditor(createEmptyItemGroupEditor());
    setIsItemGroupEditorOpen(true);
  }

  function openEditItemGroup(group: InventoryItemGroup) {
    setItemGroupEditor(mapItemGroupToEditor(group));
    setIsItemGroupEditorOpen(true);
  }

  function openNewItemCategory() {
    setItemCategoryEditor({
      ...createEmptyItemCategoryEditor(),
      itemGroupId: itemCategoryGroupFilter,
    });
    setIsItemCategoryEditorOpen(true);
  }

  function openEditItemCategory(category: InventoryItemCategory) {
    setItemCategoryEditor(mapItemCategoryToEditor(category));
    setIsItemCategoryEditorOpen(true);
  }

  function openNewUnit() {
    setUnitEditor(createEmptyUnitEditor());
    setIsUnitEditorOpen(true);
  }

  function openEditUnit(unit: InventoryUnitOfMeasure) {
    setUnitEditor(mapUnitToEditor(unit));
    setIsUnitEditorOpen(true);
  }

  function generateQrForItemEditor() {
    const nextCode = itemEditor.code.trim();
    const nextBarcode = itemEditor.barcode.trim();

    const nextQrValue = buildInventoryQrValue({
      code: nextCode,
      name: itemEditor.name,
      barcode: nextBarcode,
      category: itemEditor.category,
      unitOfMeasure: itemEditor.unitOfMeasure,
      itemGroup: itemEditor.type,
    });

    setItemEditor((current) => ({
      ...current,
      qrCodeValue: nextQrValue,
    }));
    setShowItemCodePreview(true);
  }

  function previewItemCodes() {
    setShowItemCodePreview(true);
  }

  function printItemLabel() {
    const barcode = itemEditor.barcode.trim();
    const qrCodeValue = itemEditor.qrCodeValue.trim();
    if (!barcode && !qrCodeValue) {
      setShowItemCodePreview(true);
      return;
    }

    const labelWindow = window.open("", "_blank", "noopener,noreferrer,width=920,height=720");
    if (!labelWindow) {
      return;
    }

    const title = itemEditor.name.trim() || itemEditor.code.trim() || "Item Label";
    const barcodeSvg = barcode ? getBarcodePreviewSvg(barcode) : "";
    const qrSvg = qrCodeValue ? getQrPreviewSvg(qrCodeValue) : "";

    labelWindow.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
      .label { border: 1px solid #d1d5db; border-radius: 18px; padding: 24px; }
      .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
      .meta div { border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 12px; }
      .title { font-size: 24px; font-weight: 700; margin: 0 0 8px; }
      .row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; align-items: start; }
      .section { border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; }
      .label-name { font-size: 14px; font-weight: 700; margin-bottom: 12px; }
      .value { margin-top: 10px; font-size: 13px; word-break: break-all; }
      @media print { body { margin: 0; } .label { border: 0; border-radius: 0; } }
    </style>
  </head>
  <body>
    <div class="label">
      <h1 class="title">${escapeHtml(title)}</h1>
      <div class="meta">
        <div><strong>رمز المادة / الخدمة:</strong> ${escapeHtml(itemEditor.code.trim() || "—")}</div>
        <div><strong>وحدة القياس:</strong> ${escapeHtml(itemEditor.unitOfMeasure.trim() || "—")}</div>
        <div><strong>الفئة:</strong> ${escapeHtml(itemEditor.category.trim() || "—")}</div>
        <div><strong>المجموعة:</strong> ${escapeHtml(itemEditor.type)}</div>
      </div>
      <div class="row">
        <div class="section">
          <div class="label-name">الباركود</div>
          ${barcodeSvg || "<div>—</div>"}
          <div class="value">${escapeHtml(barcode || "—")}</div>
        </div>
        <div class="section">
          <div class="label-name">رمز QR</div>
          ${qrSvg || "<div>—</div>"}
          <div class="value">${escapeHtml(qrCodeValue || "—")}</div>
        </div>
      </div>
    </div>
    <script>window.onload = () => window.print();</script>
  </body>
</html>`);
    labelWindow.document.close();
  }

  function openNewWarehouse() {
    setWarehouseEditor(createEmptyWarehouseEditor());
    setIsWarehouseEditorOpen(true);
  }

  function openEditWarehouse(warehouse: InventoryWarehouse) {
    setWarehouseEditor(mapWarehouseToEditor(warehouse));
    setIsWarehouseEditorOpen(true);
  }

  function openNewReceipt() {
    setReceiptEditor(createEmptyReceiptEditor());
    setIsReceiptEditorOpen(true);
  }

  function openEditReceipt(receipt: InventoryGoodsReceipt) {
    setReceiptEditor(mapReceiptToEditor(receipt));
    setIsReceiptEditorOpen(true);
  }

  function openNewIssue() {
    setIssueEditor(createEmptyIssueEditor());
    setIsIssueEditorOpen(true);
  }

  function openEditIssue(issue: InventoryGoodsIssue) {
    setIssueEditor(mapIssueToEditor(issue));
    setIsIssueEditorOpen(true);
  }

  function openNewTransfer() {
    setTransferEditor(createEmptyTransferEditor());
    setIsTransferEditorOpen(true);
  }

  function openEditTransfer(transfer: InventoryTransfer) {
    setTransferEditor(mapTransferToEditor(transfer));
    setIsTransferEditorOpen(true);
  }

  function openNewAdjustment() {
    setAdjustmentEditor(createEmptyAdjustmentEditor());
    setIsAdjustmentEditorOpen(true);
  }

  function openEditAdjustment(adjustment: InventoryAdjustment) {
    setAdjustmentEditor(mapAdjustmentToEditor(adjustment));
    setIsAdjustmentEditorOpen(true);
  }

  function addReceiptLine() {
    setReceiptEditor((current) => ({ ...current, lines: [...current.lines, createEmptyReceiptLine()] }));
  }

  function removeReceiptLine(index: number) {
    setReceiptEditor((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }));
  }

  function updateReceiptLine(index: number, patch: Partial<ReceiptLineEditorState>) {
    setReceiptEditor((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    }));
  }

  function addIssueLine() {
    setIssueEditor((current) => ({ ...current, lines: [...current.lines, createEmptyIssueLine()] }));
  }

  function removeIssueLine(index: number) {
    setIssueEditor((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }));
  }

  function updateIssueLine(index: number, patch: Partial<IssueLineEditorState>) {
    setIssueEditor((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    }));
  }

  function addTransferLine() {
    setTransferEditor((current) => ({ ...current, lines: [...current.lines, createEmptyTransferLine()] }));
  }

  function removeTransferLine(index: number) {
    setTransferEditor((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }));
  }

  function updateTransferLine(index: number, patch: Partial<TransferLineEditorState>) {
    setTransferEditor((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    }));
  }

  function addAdjustmentLine() {
    setAdjustmentEditor((current) => ({ ...current, lines: [...current.lines, createEmptyAdjustmentLine()] }));
  }

  function removeAdjustmentLine(index: number) {
    setAdjustmentEditor((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }));
  }

  function updateAdjustmentLine(index: number, patch: Partial<AdjustmentLineEditorState>) {
    setAdjustmentEditor((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    }));
  }

  function confirmDeactivateItem(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.confirm.deactivate"))) {
      void deactivateItemMutation.mutate(id);
    }
  }

  function confirmDeactivateWarehouse(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.warehouses.confirm.deactivate"))) {
      void deactivateWarehouseMutation.mutate(id);
    }
  }

  function confirmDeactivateItemGroup(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.itemGroups.confirm.deactivate"))) {
      void deactivateItemGroupMutation.mutate(id);
    }
  }

  function confirmDeactivateItemCategory(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.itemCategories.confirm.deactivate"))) {
      void deactivateItemCategoryMutation.mutate(id);
    }
  }

  function confirmDeactivateUnit(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.units.confirm.deactivate"))) {
      void deactivateUnitMutation.mutate(id);
    }
  }

  function confirmPostReceipt(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.receipts.confirm.post"))) {
      void postReceiptMutation.mutate(id);
    }
  }

  function confirmCancelReceipt(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.receipts.confirm.cancel"))) {
      void cancelReceiptMutation.mutate(id);
    }
  }

  function confirmReverseReceipt(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.receipts.confirm.reverse"))) {
      void reverseReceiptMutation.mutate(id);
    }
  }

  function confirmPostIssue(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.issues.confirm.post"))) {
      void postIssueMutation.mutate(id);
    }
  }

  function confirmCancelIssue(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.issues.confirm.cancel"))) {
      void cancelIssueMutation.mutate(id);
    }
  }

  function confirmReverseIssue(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.issues.confirm.reverse"))) {
      void reverseIssueMutation.mutate(id);
    }
  }

  function confirmPostTransfer(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.transfers.confirm.post"))) {
      void postTransferMutation.mutate(id);
    }
  }

  function confirmCancelTransfer(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.transfers.confirm.cancel"))) {
      void cancelTransferMutation.mutate(id);
    }
  }

  function confirmReverseTransfer(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.transfers.confirm.reverse"))) {
      void reverseTransferMutation.mutate(id);
    }
  }

  function confirmPostAdjustment(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.adjustments.confirm.post"))) {
      void postAdjustmentMutation.mutate(id);
    }
  }

  function confirmCancelAdjustment(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.adjustments.confirm.cancel"))) {
      void cancelAdjustmentMutation.mutate(id);
    }
  }

  function confirmReverseAdjustment(id: string) {
    if (typeof window === "undefined" || window.confirm(t("inventory.adjustments.confirm.reverse"))) {
      void reverseAdjustmentMutation.mutate(id);
    }
  }

  function isStockMovementDrillDownSupported(movement: InventoryStockMovement) {
    return (
      movement.transactionType === "InventoryGoodsReceipt" ||
      movement.transactionType === "InventoryGoodsIssue" ||
      movement.transactionType === "InventoryTransfer" ||
      movement.transactionType === "InventoryAdjustment"
    );
  }

  function openStockMovementSource(movement: InventoryStockMovement) {
    if (movement.transactionType === "InventoryGoodsReceipt") {
      setWorkspace("receipts");
      setSelectedReceiptId(movement.transactionId);
      setTimeout(() => document.getElementById("inventory-receipts-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      return;
    }
    if (movement.transactionType === "InventoryGoodsIssue") {
      setWorkspace("issues");
      setSelectedIssueId(movement.transactionId);
      setTimeout(() => document.getElementById("inventory-issues-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      return;
    }
    if (movement.transactionType === "InventoryTransfer") {
      setWorkspace("transfers");
      setSelectedTransferId(movement.transactionId);
      setTimeout(() => document.getElementById("inventory-transfers-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      return;
    }
    if (movement.transactionType === "InventoryAdjustment") {
      setWorkspace("adjustments");
      setSelectedAdjustmentId(movement.transactionId);
      setTimeout(() => document.getElementById("inventory-adjustments-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }
  }

  function closeItemEditor() {
    setIsItemEditorOpen(false);
    setItemEditor(createEmptyItemEditor());
    setShowItemCodePreview(false);
  }

  function closeItemGroupEditor() {
    setIsItemGroupEditorOpen(false);
    setItemGroupEditor(createEmptyItemGroupEditor());
  }

  function closeItemCategoryEditor() {
    setIsItemCategoryEditorOpen(false);
    setItemCategoryEditor(createEmptyItemCategoryEditor());
  }

  function closeUnitEditor() {
    setIsUnitEditorOpen(false);
    setUnitEditor(createEmptyUnitEditor());
  }

  function closeWarehouseEditor() {
    setIsWarehouseEditorOpen(false);
    setWarehouseEditor(createEmptyWarehouseEditor());
  }

  function closeReceiptEditor() {
    setIsReceiptEditorOpen(false);
    setReceiptEditor(createEmptyReceiptEditor());
  }

  function closeIssueEditor() {
    setIsIssueEditorOpen(false);
    setIssueEditor(createEmptyIssueEditor());
  }

  function closeTransferEditor() {
    setIsTransferEditorOpen(false);
    setTransferEditor(createEmptyTransferEditor());
  }

  function closeAdjustmentEditor() {
    setIsAdjustmentEditorOpen(false);
    setAdjustmentEditor(createEmptyAdjustmentEditor());
  }
}

function MetricCard({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  const numValue = Number(value) || 0;
  const isActive = numValue > 0;

  return (
    <Card 
      className={cn(
        "rounded-2xl border border-[#d7ddd8] bg-white p-4 shadow-sm transition-all duration-300",
        isActive ? "border-[#b7d9c2] bg-[#f0fbf6]" : ""
      )}
    >
      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7d8c83]">{label}</div>
      <div 
        className="text-3xl font-black tracking-tight"
        style={{
          color: isActive ? "#0F6E56" : "#9CA3AF",
        }}
      >
        {value}
        {suffix ? <span className="ms-2 text-base text-gray-500">{suffix}</span> : null}
      </div>
    </Card>
  );
}

function DetailCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e1e7e2] bg-[#fafcfb] px-4 py-3 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7d8c83]">{label}</div>
      <div className="mt-1 text-[13px] font-semibold text-[#233329]">{value}</div>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string | ReactNode;
  description?: string;
  action?: ReactNode;
}) {
  const isPageTitle = typeof title === "string" && (title.includes("المخزون") || title.includes("Inventory"));
  const titleSize = isPageTitle ? "20px" : "18px";

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-[28px] border border-[#d7ddd8] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(246,248,246,0.94)_100%)] px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="space-y-1.5">
        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#7d8c83]">
          {isPageTitle ? "Inventory Workspace" : "Inventory View"}
        </div>
        <h1 
          className="app-title tracking-tight text-[#233329]"
          style={{ fontSize: titleSize, fontWeight: 800 }}
        >
          {title}
        </h1>
        {description ? (
          <p className="app-subtitle max-w-3xl text-[13px] leading-relaxed font-normal text-[#66756d]">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex-shrink-0">
        {action}
      </div>
    </div>
  );
}

function PreviewCard({
  label,
  value,
  emptyMessage,
  svg,
}: {
  label: string;
  value?: string | null;
  emptyMessage: string;
  svg?: string | null;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4">
      <div className="mb-3 text-sm font-black text-gray-900">{label}</div>
      {svg ? (
        <div
          className="overflow-hidden rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-3"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <EmptyState message={emptyMessage} />
      )}
      <div className="mt-3 break-all text-xs leading-6 text-gray-600">{value || "—"}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#d7ddd8] bg-[#fafcfb] px-6 py-10 text-sm text-[#66756d] shadow-sm">
      {message}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">{message}</div>;
}

type MasterDataRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

function MasterDataGrid<T extends MasterDataRow>({
  search,
  onSearch,
  status,
  onStatus,
  searchPlaceholder,
  loading,
  empty,
  rows,
  selectedId,
  onSelect,
  renderMeta,
  detail,
  extraFilter,
}: {
  search: string;
  onSearch: (value: string) => void;
  status: "" | "true" | "false";
  onStatus: (value: "" | "true" | "false") => void;
  searchPlaceholder: string;
  loading: boolean;
  empty: string;
  rows: T[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  renderMeta: (row: T) => ReactNode;
  detail: ReactNode;
  extraFilter?: ReactNode;
}) {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card className="space-y-5 rounded-[28px] border-[#d7ddd8] bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_220px] xl:grid-cols-[minmax(0,1.5fr)_220px_220px]">
          <Input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="rounded-xl border-[#d7ddd8] bg-[#fafcfb]"
          />
          <Select
            value={status}
            onChange={(event) => onStatus(event.target.value as "" | "true" | "false")}
            className="rounded-xl border-[#d7ddd8] bg-[#fafcfb]"
          >
            <option value="">{t("inventory.filters.allStatuses")}</option>
            <option value="true">{t("inventory.filters.activeOnly")}</option>
            <option value="false">{t("inventory.filters.inactiveOnly")}</option>
          </Select>
          {extraFilter ? <div className="[&>select]:rounded-xl [&>select]:border-[#d7ddd8] [&>select]:bg-[#fafcfb]">{extraFilter}</div> : null}
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="rounded-[24px] border border-[#e6ece7] bg-[#fafcfb] px-5 py-8 text-sm text-[#66756d]">{t("inventory.loading")}</div>
          ) : rows.length === 0 ? (
            <EmptyState message={empty} />
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelect(row.id)}
                className={`w-full rounded-2xl border px-5 py-4 transition ${
                  selectedId === row.id
                    ? "border-[#cfe2d3] bg-[linear-gradient(135deg,_rgba(238,248,241,0.96)_0%,_rgba(255,255,255,1)_100%)] shadow-sm"
                    : "border-[#e1e7e2] bg-[#fcfdfc] hover:border-[#cfd8d1] hover:bg-white"
                }`}
              >
                <div className={`flex items-center gap-4 ${isArabic ? "flex-row-reverse" : ""}`}>
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#4b7a57]"
                    aria-hidden="true"
                  />
                  <div className={`flex min-w-0 flex-1 items-center justify-between gap-4 ${isArabic ? "flex-row-reverse" : ""}`}>
                    <div className={`min-w-0 flex-1 ${isArabic ? "text-right" : "text-left"}`}>
                      <div className="font-mono text-xs font-black uppercase tracking-[0.2em] text-[#7d8c83]">
                        {row.code}
                      </div>
                      <div className="mt-1 truncate text-base font-black tracking-tight text-[#233329]">
                        {row.name}
                      </div>
                      <div className="mt-1 text-xs font-medium text-[#66756d]">{renderMeta(row)}</div>
                    </div>
                    <div className="shrink-0">
                      <StatusPill
                        label={row.isActive ? t("inventory.status.active") : t("inventory.status.inactive")}
                        tone={row.isActive ? "positive" : "warning"}
                      />
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </Card>
      <Card className="space-y-4 rounded-[28px] border-[#d7ddd8] bg-white p-6 shadow-sm">{detail}</Card>
    </div>
  );
}

function MasterDataDetail({
  code,
  name,
  isActive,
  description,
  rows,
  onEdit,
  onDeactivate,
  editLabel,
  deactivateLabel,
  disableActions,
}: {
  code: string;
  name: string;
  isActive: boolean;
  description?: string | null;
  rows: Array<[string, ReactNode]>;
  onEdit: () => void;
  onDeactivate: () => void;
  editLabel: string;
  deactivateLabel: string;
  disableActions: boolean;
}) {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";

  return (
    <>
      <div className={`flex items-start gap-4 ${isArabic ? "flex-row-reverse" : "justify-between"}`}>
        <div className={`flex min-w-0 flex-1 flex-col space-y-1 ${isArabic ? "items-end text-right" : "text-left"}`}>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7d8c83]">{code}</div>
          <h2 className="text-2xl font-black tracking-tight text-[#233329]">{name}</h2>
        </div>
        <div className="shrink-0">
          <StatusPill label={isActive ? t("inventory.status.active") : t("inventory.status.inactive")} tone={isActive ? "positive" : "warning"} />
        </div>
      </div>
      {description ? <p className={`text-sm leading-7 text-[#66756d] ${isArabic ? "text-right" : ""}`}>{description}</p> : null}
      <div className="space-y-2 rounded-[24px] bg-[#fafcfb] p-4 text-sm leading-7 text-[#66756d]">
        {rows.map(([label, value]) => (
          <div key={label} className={cn("flex justify-between gap-4 border-b border-[#edf1ee] py-1.5 last:border-b-0", isArabic ? "text-right" : "text-left")}>
            <span className="font-semibold text-[#233329]">{label}</span>
            <span className="text-[#4f5d55]">{value}</span>
          </div>
        ))}
      </div>
      <div className={`flex flex-wrap gap-3 pt-2 ${isArabic ? "justify-end" : ""}`}>
        <Button variant="secondary" onClick={onEdit} disabled={disableActions} className="rounded-full border-[#d6e0d8] px-4 py-2 font-bold text-[#46644b]">
          {editLabel}
        </Button>
        <Button variant="danger" onClick={onDeactivate} disabled={disableActions} className="rounded-full px-4 py-2 font-bold">
          {deactivateLabel}
        </Button>
      </div>
    </>
  );
}

function EditorActions({
  onCancel,
  onSave,
  disabled,
  label,
  cancelLabel,
}: {
  onCancel: () => void;
  onSave: () => void;
  disabled: boolean;
  label: string;
  cancelLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={onCancel} className="rounded-full border-[#d6e0d8] px-4 py-2 font-bold text-[#46644b]">
        {cancelLabel}
      </Button>
      <Button onClick={onSave} disabled={disabled} className="rounded-full bg-[#46644b] px-4 py-2 font-bold text-white hover:bg-[#39523d]">
        {label}
      </Button>
    </div>
  );
}

function AccountLine({ label, account }: { label: string; account?: InventoryItem["inventoryAccount"] }) {
  const { language } = useTranslation();
  return (
    <div>
      <span className="font-semibold text-gray-900">{label}:</span>{" "}
      {account ? `${account.code} · ${language === "ar" ? account.nameAr || account.name : account.name}` : "—"}
    </div>
  );
}

function AccountSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: AccountOption[];
  placeholder: string;
}) {
  const { language } = useTranslation();

  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.code} - {language === "ar" ? option.nameAr?.trim() || option.name : option.name?.trim() || option.nameAr?.trim() || ""}
        </option>
      ))}
    </Select>
  );
}

function WarehouseSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: InventoryWarehouse[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {formatItemServiceLabel(option.code, option.name)}
        </option>
      ))}
    </Select>
  );
}

function ItemSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: InventoryItem[];
  placeholder: string;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.code} · {option.name}
        </option>
      ))}
    </Select>
  );
}

function ItemGroupSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: InventoryItemGroup[];
  placeholder: string;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.code} · {option.name}
        </option>
      ))}
    </Select>
  );
}

function ItemCategorySelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: InventoryItemCategory[];
  placeholder: string;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.code} · {option.name}
        </option>
      ))}
    </Select>
  );
}

function UnitSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: InventoryUnitOfMeasure[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.code} · {option.name}
        </option>
      ))}
    </Select>
  );
}

function mapItemToEditor(item: InventoryItem): ItemEditorState {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description ?? "",
    internalNotes: item.internalNotes ?? "",
    itemImageUrl: item.itemImageUrl ?? "",
    attachmentsText: item.attachmentsText ?? "",
    barcode: item.barcode ?? "",
    qrCodeValue: item.qrCodeValue ?? "",
    unitOfMeasure: item.unitOfMeasure,
    unitOfMeasureId: item.unitOfMeasureRef?.id ?? item.unitOfMeasureId ?? "",
    category: item.category ?? "",
    itemGroupId: item.itemGroup?.id ?? item.itemGroupId ?? "",
    itemCategoryId: item.itemCategory?.id ?? item.itemCategoryId ?? "",
    type: item.type,
    defaultSalesPrice: item.defaultSalesPrice ?? "",
    defaultPurchasePrice: item.defaultPurchasePrice ?? "",
    currencyCode: item.currencyCode ?? "JOD",
    taxable: item.taxable,
    defaultTaxId: item.defaultTaxId ?? "",
    trackInventory: item.trackInventory,
    inventoryAccountId: item.inventoryAccount?.id ?? "",
    expenseAccountId: item.expenseAccount?.id ?? "",
    cogsAccountId: item.cogsAccount?.id ?? "",
    salesAccountId: item.salesAccount?.id ?? "",
    salesReturnAccountId: item.salesReturnAccount?.id ?? "",
    adjustmentAccountId: item.adjustmentAccount?.id ?? "",
    reorderLevel: item.reorderLevel,
    reorderQuantity: item.reorderQuantity,
    preferredWarehouseId: item.preferredWarehouse?.id ?? item.preferredWarehouseId ?? "",
    unitConversions: item.unitConversions.map(mapUnitConversionToEditor),

    // Extended UI fields
    isActive: item.isActive,
    sellable: item.defaultSalesPrice ? true : true,
    purchasable: item.defaultPurchasePrice ? true : true,
    onHandQuantity: item.onHandQuantity ?? "0",
    valuationAmount: item.valuationAmount ?? "0",
    salesUnitId: item.unitOfMeasureId ?? "",
    purchaseUnitId: item.unitOfMeasureId ?? "",
    allowFractionalQuantity: item.allowFractionalQuantity ?? false,
    minSalesQuantity: item.minSalesQuantity ?? "1",
    minStockLevel: "0",
    maxStockLevel: "0",
    allowNegativeStock: false,
    salesDiscountAccountId: "",
    defaultCostCenterId: "",
    purchaseTaxId: "",
    priceIncludesTax: false,
    specialTaxTreatment: "",
    defaultSupplierId: "",
    supplierItemCode: "",
    lastPurchasePrice: "",
    leadTime: "",
    minPurchaseQuantity: "1",
    alternativeSuppliersText: "",
    datasheetUrl: "",
    purchaseNotes: "",
    inventoryNotes: "",
  };
}

function mapUnitConversionToEditor(conversion: InventoryItemUnitConversion): ItemUnitConversionEditorState {
  return createUnitConversionEditor({
    key: conversion.id,
    unitId: conversion.unitId,
    conversionFactorToBaseUnit: conversion.conversionFactorToBaseUnit,
    barcode: conversion.barcode ?? "",
    defaultSalesPrice: conversion.defaultSalesPrice ?? "",
    defaultPurchasePrice: conversion.defaultPurchasePrice ?? "",
    isBaseUnit: conversion.isBaseUnit,
  });
}

function ensureBaseUnitConversionRow(
  editor: ItemEditorState,
  units: InventoryUnitOfMeasure[],
): ItemEditorState {
  if (!editor.unitOfMeasureId) {
    return editor.unitConversions.length === 0 ? editor : { ...editor, unitConversions: [] };
  }

  const baseUnit = units.find((row) => row.id === editor.unitOfMeasureId);
  const nextUnitOfMeasure = baseUnit?.code ?? editor.unitOfMeasure;
  const nextRows = editor.unitConversions
    .filter((row, index, current) => current.findIndex((candidate) => candidate.unitId === row.unitId) === index)
    .map((row) =>
      row.unitId === editor.unitOfMeasureId
        ? {
            ...row,
            isBaseUnit: true,
            conversionFactorToBaseUnit: "1",
          }
        : { ...row, isBaseUnit: false },
    );

  const hasBaseRow = nextRows.some((row) => row.unitId === editor.unitOfMeasureId);
  const normalizedRows = hasBaseRow
    ? nextRows
    : [createUnitConversionEditor({ unitId: editor.unitOfMeasureId, conversionFactorToBaseUnit: "1", isBaseUnit: true }), ...nextRows];

  if (
    nextUnitOfMeasure === editor.unitOfMeasure &&
    normalizedRows.length === editor.unitConversions.length &&
    normalizedRows.every((row, index) => {
      const current = editor.unitConversions[index];
      return current
        && current.unitId === row.unitId
        && current.conversionFactorToBaseUnit === row.conversionFactorToBaseUnit
        && current.barcode === row.barcode
        && current.defaultSalesPrice === row.defaultSalesPrice
        && current.defaultPurchasePrice === row.defaultPurchasePrice
        && current.isBaseUnit === row.isBaseUnit;
    })
  ) {
    return editor;
  }

  return {
    ...editor,
    unitOfMeasure: nextUnitOfMeasure,
    unitConversions: normalizedRows,
  };
}

function mapItemGroupToEditor(group: InventoryItemGroup): ItemGroupEditorState {
  return {
    id: group.id,
    code: group.code,
    name: group.name,
    description: group.description ?? "",
    parentGroupId: group.parentGroup?.id ?? group.parentGroupId ?? "",
    inventoryAccountId: group.inventoryAccount?.id ?? "",
    cogsAccountId: group.cogsAccount?.id ?? "",
    salesAccountId: group.salesAccount?.id ?? "",
    adjustmentAccountId: group.adjustmentAccount?.id ?? "",
  };
}

function mapItemCategoryToEditor(category: InventoryItemCategory): ItemCategoryEditorState {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
    description: category.description ?? "",
    itemGroupId: category.itemGroup.id,
  };
}

function mapUnitToEditor(unit: InventoryUnitOfMeasure): UnitEditorState {
  return {
    id: unit.id,
    code: unit.code,
    name: unit.name,
    description: unit.description ?? "",
    unitType: unit.unitType ?? "",
    decimalPrecision: String(unit.decimalPrecision),
  };
}

function mapWarehouseToEditor(warehouse: InventoryWarehouse): WarehouseEditorState {
  return {
    id: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
    address: warehouse.address ?? "",
    responsiblePerson: warehouse.responsiblePerson ?? "",
    isTransit: warehouse.isTransit,
    isDefaultTransit: Boolean(warehouse.isDefaultTransit),
  };
}

function mapReceiptToEditor(receipt: InventoryGoodsReceipt): ReceiptEditorState {
  return {
    id: receipt.id,
    reference: receipt.reference,
    receiptDate: receipt.receiptDate.slice(0, 10),
    warehouseId: receipt.warehouse.id,
    sourcePurchaseOrderRef: receipt.sourcePurchaseOrderRef ?? "",
    sourcePurchaseInvoiceRef: receipt.sourcePurchaseInvoiceRef ?? "",
    description: receipt.description ?? "",
    lines: receipt.lines.map((line) => ({
      itemId: line.item.id,
      quantity: line.quantity,
      unitCost: line.unitCost,
      unitOfMeasure: line.unitOfMeasure,
      description: line.description ?? "",
    })),
  };
}

function mapIssueToEditor(issue: InventoryGoodsIssue): IssueEditorState {
  return {
    id: issue.id,
    reference: issue.reference,
    issueDate: issue.issueDate.slice(0, 10),
    warehouseId: issue.warehouse.id,
    sourceSalesOrderRef: issue.sourceSalesOrderRef ?? "",
    sourceSalesInvoiceRef: issue.sourceSalesInvoiceRef ?? "",
    sourceProductionRequestRef: issue.sourceProductionRequestRef ?? "",
    sourceInternalRequestRef: issue.sourceInternalRequestRef ?? "",
    description: issue.description ?? "",
    lines: issue.lines.map((line) => ({
      itemId: line.item.id,
      quantity: line.quantity,
      unitOfMeasure: line.unitOfMeasure,
      description: line.description ?? "",
    })),
  };
}

function mapTransferToEditor(transfer: InventoryTransfer): TransferEditorState {
  return {
    id: transfer.id,
    reference: transfer.reference,
    transferDate: transfer.transferDate.slice(0, 10),
    sourceWarehouseId: transfer.sourceWarehouse.id,
    destinationWarehouseId: transfer.destinationWarehouse.id,
    description: transfer.description ?? "",
    lines: transfer.lines.map((line) => ({
      itemId: line.item.id,
      quantity: line.quantity,
      unitOfMeasure: line.unitOfMeasure,
      description: line.description ?? "",
    })),
  };
}

function mapAdjustmentToEditor(adjustment: InventoryAdjustment): AdjustmentEditorState {
  return {
    id: adjustment.id,
    reference: adjustment.reference,
    adjustmentDate: adjustment.adjustmentDate.slice(0, 10),
    warehouseId: adjustment.warehouse.id,
    reason: adjustment.reason,
    description: adjustment.description ?? "",
    lines: adjustment.lines.map((line) => ({
      itemId: line.item.id,
      systemQuantity: line.systemQuantity,
      countedQuantity: line.countedQuantity,
      unitOfMeasure: line.unitOfMeasure,
      description: line.description ?? "",
    })),
  };
}

function mapItemEditorToPayload(editor: ItemEditorState) {
  return {
    name: editor.name.trim(),
    description: editor.description.trim() || undefined,
    internalNotes: editor.internalNotes.trim() || undefined,
    itemImageUrl: editor.itemImageUrl.trim() || undefined,
    attachmentsText: editor.attachmentsText.trim() || undefined,
    barcode: editor.barcode.trim() || undefined,
    qrCodeValue: editor.qrCodeValue.trim() || undefined,
    unitOfMeasure: editor.unitOfMeasure.trim(),
    unitOfMeasureId: editor.unitOfMeasureId,
    category: editor.category.trim() || undefined,
    itemGroupId: editor.itemGroupId,
    itemCategoryId: editor.itemCategoryId,
    type: editor.type,
    defaultSalesPrice: editor.defaultSalesPrice.trim() || undefined,
    defaultPurchasePrice: editor.defaultPurchasePrice.trim() || undefined,
    currencyCode: editor.currencyCode.trim() || undefined,
    taxable: editor.taxable,
    defaultTaxId: editor.taxable ? editor.defaultTaxId || undefined : undefined,
    trackInventory: editor.trackInventory,
    inventoryAccountId: editor.inventoryAccountId || undefined,
    expenseAccountId: editor.expenseAccountId || undefined,
    cogsAccountId: editor.cogsAccountId || undefined,
    salesAccountId: editor.salesAccountId || undefined,
    salesReturnAccountId: editor.salesReturnAccountId || undefined,
    adjustmentAccountId: editor.adjustmentAccountId || undefined,
    reorderLevel: editor.reorderLevel.trim() || undefined,
    reorderQuantity: editor.reorderQuantity.trim() || undefined,
    preferredWarehouseId: editor.preferredWarehouseId || undefined,
    unitConversions: editor.unitConversions.map((row) => ({
      unitId: row.unitId,
      conversionFactorToBaseUnit: row.conversionFactorToBaseUnit.trim(),
      barcode: row.barcode.trim() || undefined,
      defaultSalesPrice: row.defaultSalesPrice.trim() || undefined,
      defaultPurchasePrice: row.defaultPurchasePrice.trim() || undefined,
      isBaseUnit: row.isBaseUnit,
    })),
    isActive: editor.isActive,
    allowFractionalQuantity: editor.allowFractionalQuantity,
    minSalesQuantity: editor.minSalesQuantity?.trim() || undefined,
  };
}

function mapItemGroupEditorToPayload(editor: ItemGroupEditorState) {
  return {
    code: editor.id ? undefined : editor.code.trim() || undefined,
    name: editor.name.trim(),
    description: editor.description.trim() || undefined,
    parentGroupId: editor.parentGroupId || undefined,
    inventoryAccountId: editor.inventoryAccountId || undefined,
    cogsAccountId: editor.cogsAccountId || undefined,
    salesAccountId: editor.salesAccountId || undefined,
    adjustmentAccountId: editor.adjustmentAccountId || undefined,
  };
}

function mapItemCategoryEditorToPayload(editor: ItemCategoryEditorState) {
  return {
    code: editor.id ? undefined : editor.code.trim() || undefined,
    name: editor.name.trim(),
    description: editor.description.trim() || undefined,
    itemGroupId: editor.itemGroupId,
  };
}

function mapUnitEditorToPayload(editor: UnitEditorState) {
  return {
    code: editor.id ? undefined : editor.code.trim() || undefined,
    name: editor.name.trim(),
    description: editor.description.trim() || undefined,
    unitType: editor.unitType.trim() || undefined,
    decimalPrecision: Number(editor.decimalPrecision || 0),
  };
}

function mapWarehouseEditorToPayload(editor: WarehouseEditorState) {
  return {
    code: editor.code.trim() || undefined,
    name: editor.name.trim(),
    address: editor.address.trim() || undefined,
    responsiblePerson: editor.responsiblePerson.trim() || undefined,
    isTransit: editor.isTransit,
    isDefaultTransit: editor.isTransit ? editor.isDefaultTransit : false,
  };
}

function mapReceiptEditorToPayload(editor: ReceiptEditorState) {
  return {
    reference: editor.reference.trim() || undefined,
    receiptDate: editor.receiptDate,
    warehouseId: editor.warehouseId,
    sourcePurchaseOrderRef: editor.sourcePurchaseOrderRef.trim() || undefined,
    sourcePurchaseInvoiceRef: editor.sourcePurchaseInvoiceRef.trim() || undefined,
    description: editor.description.trim() || undefined,
    lines: editor.lines.map(
      (line): InventoryGoodsReceiptLinePayload => ({
        itemId: line.itemId,
        quantity: line.quantity.trim(),
        unitCost: line.unitCost.trim(),
        unitOfMeasure: line.unitOfMeasure.trim(),
        description: line.description.trim() || undefined,
      }),
    ),
  };
}

function mapIssueEditorToPayload(editor: IssueEditorState) {
  return {
    reference: editor.reference.trim() || undefined,
    issueDate: editor.issueDate,
    warehouseId: editor.warehouseId,
    sourceSalesOrderRef: editor.sourceSalesOrderRef.trim() || undefined,
    sourceSalesInvoiceRef: editor.sourceSalesInvoiceRef.trim() || undefined,
    sourceProductionRequestRef: editor.sourceProductionRequestRef.trim() || undefined,
    sourceInternalRequestRef: editor.sourceInternalRequestRef.trim() || undefined,
    description: editor.description.trim() || undefined,
    lines: editor.lines.map(
      (line): InventoryGoodsIssueLinePayload => ({
        itemId: line.itemId,
        quantity: line.quantity.trim(),
        unitOfMeasure: line.unitOfMeasure.trim(),
        description: line.description.trim() || undefined,
      }),
    ),
  };
}

function mapTransferEditorToPayload(editor: TransferEditorState) {
  return {
    reference: editor.reference.trim() || undefined,
    transferDate: editor.transferDate,
    sourceWarehouseId: editor.sourceWarehouseId,
    destinationWarehouseId: editor.destinationWarehouseId,
    description: editor.description.trim() || undefined,
    lines: editor.lines.map(
      (line): InventoryTransferLinePayload => ({
        itemId: line.itemId,
        quantity: line.quantity.trim(),
        unitOfMeasure: line.unitOfMeasure.trim(),
        description: line.description.trim() || undefined,
      }),
    ),
  };
}

function mapAdjustmentEditorToPayload(editor: AdjustmentEditorState) {
  return {
    reference: editor.reference.trim() || undefined,
    adjustmentDate: editor.adjustmentDate,
    warehouseId: editor.warehouseId,
    reason: editor.reason.trim(),
    description: editor.description.trim() || undefined,
    lines: editor.lines.map(
      (line): InventoryAdjustmentLinePayload => ({
        itemId: line.itemId,
        systemQuantity: line.systemQuantity.trim(),
        countedQuantity: line.countedQuantity.trim(),
        unitOfMeasure: line.unitOfMeasure.trim(),
        description: line.description.trim() || undefined,
      }),
    ),
  };
}

function getItemGroupFormError(editor: ItemGroupEditorState) {
  if (!editor.name.trim()) return "Item group name is required. اسم مجموعة الأصناف مطلوب.";
  return null;
}

function getItemCategoryFormError(editor: ItemCategoryEditorState) {
  if (!editor.name.trim()) return "Item category name is required. اسم فئة الصنف مطلوب.";
  if (!editor.itemGroupId) return "Item group is required. مجموعة الأصناف مطلوبة.";
  return null;
}

function getUnitFormError(editor: UnitEditorState) {
  if (!editor.name.trim()) return "Unit name is required. اسم وحدة القياس مطلوب.";
  if (editor.decimalPrecision.trim() && (!Number.isInteger(Number(editor.decimalPrecision)) || Number(editor.decimalPrecision) < 0 || Number(editor.decimalPrecision) > 6)) {
    return "Decimal precision must be an integer between 0 and 6. دقة الكسور يجب أن تكون رقماً صحيحاً بين 0 و6.";
  }
  return null;
}

function getWarehouseFormError(editor: WarehouseEditorState) {
  if (!editor.name.trim()) return "Warehouse name is required. اسم المستودع مطلوب.";
  if (editor.isDefaultTransit && !editor.isTransit) {
    return "Default transit requires transit mode.";
  }
  return null;
}

function getReceiptFormError(editor: ReceiptEditorState) {
  if (!editor.receiptDate) return "Receipt date is required. تاريخ الاستلام مطلوب.";
  const receiptYear = new Date(editor.receiptDate).getFullYear();
  if (Number.isNaN(receiptYear) || receiptYear < 1900) {
    return "Receipt date must be at least year 1900. يجب أن يكون تاريخ الاستلام في عام 1900 أو بعده.";
  }
  if (!editor.warehouseId) return "Warehouse is required. المستودع مطلوب.";
  if (editor.lines.length === 0) return "At least one receipt line is required. يجب إدخال سطر استلام واحد على الأقل.";

  for (let index = 0; index < editor.lines.length; index += 1) {
    const line = editor.lines[index];
    if (!line.itemId) return `Receipt line ${index + 1} requires an item. سطر الاستلام ${index + 1} يتطلب صنفا.`;
    if (!line.unitOfMeasure.trim()) return `Receipt line ${index + 1} requires a unit of measure. سطر الاستلام ${index + 1} يتطلب وحدة قياس.`;
    if (!line.quantity.trim() || Number.isNaN(Number(line.quantity)) || Number(line.quantity) <= 0) {
      return `Receipt line ${index + 1} requires a positive quantity. سطر الاستلام ${index + 1} يتطلب كمية موجبة.`;
    }
    if (!line.unitCost.trim() || Number.isNaN(Number(line.unitCost)) || Number(line.unitCost) < 0) {
      return `Receipt line ${index + 1} requires a valid unit cost. سطر الاستلام ${index + 1} يتطلب تكلفة وحدة صحيحة.`;
    }
  }

  return null;
}

function getIssueFormError(editor: IssueEditorState) {
  if (!editor.issueDate) return "Issue date is required. تاريخ الصرف مطلوب.";
  const issueYear = new Date(editor.issueDate).getFullYear();
  if (Number.isNaN(issueYear) || issueYear < 1900) {
    return "Issue date must be at least year 1900. يجب أن يكون تاريخ الصرف في عام 1900 أو بعده.";
  }
  if (!editor.warehouseId) return "Warehouse is required. المستودع مطلوب.";
  if (editor.lines.length === 0) return "At least one issue line is required. يجب إدخال سطر صرف واحد على الأقل.";

  for (let index = 0; index < editor.lines.length; index += 1) {
    const line = editor.lines[index];
    if (!line.itemId) return `Issue line ${index + 1} requires an item. سطر الصرف ${index + 1} يتطلب صنفاً.`;
    if (!line.unitOfMeasure.trim()) return `Issue line ${index + 1} requires a unit of measure. سطر الصرف ${index + 1} يتطلب وحدة قياس.`;
    if (!line.quantity.trim() || Number.isNaN(Number(line.quantity)) || Number(line.quantity) <= 0) {
      return `Issue line ${index + 1} requires a positive quantity. سطر الصرف ${index + 1} يتطلب كمية موجبة.`;
    }
  }

  return null;
}

function getTransferFormError(editor: TransferEditorState) {
  if (!editor.transferDate) return "Transfer date is required. تاريخ التحويل مطلوب.";
  const transferYear = new Date(editor.transferDate).getFullYear();
  if (Number.isNaN(transferYear) || transferYear < 1900) {
    return "Transfer date must be at least year 1900. يجب أن يكون تاريخ التحويل في عام 1900 أو بعده.";
  }
  if (!editor.sourceWarehouseId) return "Source warehouse is required. مستودع المصدر مطلوب.";
  if (!editor.destinationWarehouseId) return "Destination warehouse is required. مستودع الوجهة مطلوب.";
  if (editor.sourceWarehouseId && editor.destinationWarehouseId && editor.sourceWarehouseId === editor.destinationWarehouseId) {
    return "Source and destination warehouses must be different. يجب أن يكون مستودع المصدر مختلفاً عن مستودع الوجهة.";
  }
  if (editor.lines.length === 0) return "At least one transfer line is required. يجب إدخال سطر تحويل واحد على الأقل.";

  for (let index = 0; index < editor.lines.length; index += 1) {
    const line = editor.lines[index];
    if (!line.itemId) return `Transfer line ${index + 1} requires an item. سطر التحويل ${index + 1} يتطلب صنفاً.`;
    if (!line.unitOfMeasure.trim()) {
      return `Transfer line ${index + 1} requires a unit of measure. سطر التحويل ${index + 1} يتطلب وحدة قياس.`;
    }
    if (!line.quantity.trim() || Number.isNaN(Number(line.quantity)) || Number(line.quantity) <= 0) {
      return `Transfer line ${index + 1} requires a positive quantity. سطر التحويل ${index + 1} يتطلب كمية موجبة.`;
    }
  }

  return null;
}

function getAdjustmentFormError(editor: AdjustmentEditorState) {
  if (!editor.adjustmentDate) return "Adjustment date is required. تاريخ التسوية مطلوب.";
  const adjustmentYear = new Date(editor.adjustmentDate).getFullYear();
  if (Number.isNaN(adjustmentYear) || adjustmentYear < 1900) {
    return "Adjustment date must be at least year 1900. يجب أن يكون تاريخ التسوية في عام 1900 أو بعده.";
  }
  if (!editor.warehouseId) return "Warehouse is required. المستودع مطلوب.";
  if (!editor.reason.trim()) return "Adjustment reason is required. سبب التسوية مطلوب.";
  if (editor.lines.length === 0) return "At least one adjustment line is required. يجب إدخال سطر تسوية واحد على الأقل.";

  for (let index = 0; index < editor.lines.length; index += 1) {
    const line = editor.lines[index];
    if (!line.itemId) return `Adjustment line ${index + 1} requires an item. سطر التسوية ${index + 1} يتطلب صنفًا.`;
    if (!line.unitOfMeasure.trim()) {
      return `Adjustment line ${index + 1} requires a unit of measure. سطر التسوية ${index + 1} يتطلب وحدة قياس.`;
    }
    if (!line.systemQuantity.trim() || Number.isNaN(Number(line.systemQuantity)) || Number(line.systemQuantity) < 0) {
      return `Adjustment line ${index + 1} requires a non-negative system quantity. سطر التسوية ${index + 1} يتطلب كمية نظام غير سالبة.`;
    }
    if (!line.countedQuantity.trim() || Number.isNaN(Number(line.countedQuantity)) || Number(line.countedQuantity) < 0) {
      return `Adjustment line ${index + 1} requires a non-negative counted quantity. سطر التسوية ${index + 1} يتطلب كمية جرد غير سالبة.`;
    }
  }

  return null;
}

function getMutationError(...errors: unknown[]) {
  const error = errors.find((value) => value instanceof Error);
  return error instanceof Error ? translateInventoryMutationError(error.message) : null;
}

function translateInventoryMutationError(message: string) {
  switch (message) {
    case "Inventory item lines must post to an active inventory asset account.":
      return "Inventory item lines must post to an active inventory asset account. يجب ترحيل بنود الأصناف المخزنية إلى حساب أصل مخزون نشط.";
    case "Service or non-stock item lines must post to an active expense account.":
      return "Service or non-stock item lines must post to an active expense account. يجب ترحيل بنود الخدمات أو الأصناف غير المخزنية إلى حساب مصروف نشط.";
    case "Each purchase invoice line must use an active posting inventory, fixed asset, or expense account.":
      return "Each purchase invoice line must use an active posting inventory, fixed asset, or expense account. يجب أن يستخدم كل سطر حساب ترحيل نشط من نوع مخزون أو أصل ثابت أو مصروف.";
    default:
      return message;
  }
}

function receiptTone(status: InventoryReceiptStatus): "positive" | "warning" | "neutral" {
  if (status === "POSTED") return "positive";
  if (status === "CANCELLED") return "neutral";
  return "warning";
}

function issueTone(status: InventoryIssueStatus): "positive" | "warning" | "neutral" {
  if (status === "POSTED") return "positive";
  if (status === "CANCELLED") return "neutral";
  return "warning";
}

function transferTone(status: InventoryTransferStatus): "positive" | "warning" | "neutral" {
  if (status === "POSTED") return "positive";
  if (status === "CANCELLED") return "neutral";
  return "warning";
}

function adjustmentTone(status: InventoryAdjustmentStatus): "positive" | "warning" | "neutral" {
  if (status === "POSTED") return "positive";
  if (status === "CANCELLED") return "neutral";
  return "warning";
}

function formatVariance(systemQuantity: string, countedQuantity: string) {
  const system = Number(systemQuantity);
  const counted = Number(countedQuantity);
  if (Number.isNaN(system) || Number.isNaN(counted)) {
    return "";
  }
  return String(counted - system);
}

function formatCodeName(code: string, name: string, isArabic: boolean) {
  return isArabic ? (
    <>
      <span>{name}</span>
      <span>{' · '}</span>
      <bdi dir="ltr">{code}</bdi>
    </>
  ) : (
    <>
      <bdi dir="ltr">{code}</bdi>
      <span>{' · '}</span>
      <span>{name}</span>
    </>
  );
}

function formatCodeNameText(code: string, name: string, isArabic: boolean) {
  return isArabic ? `${name} · ${code}` : `${code} · ${name}`;
}

function buildInventoryQrValue({
  code,
  name,
  barcode,
  category,
  unitOfMeasure,
  itemGroup,
}: {
  code: string;
  name: string;
  barcode: string;
  category: string;
  unitOfMeasure: string;
  itemGroup: string;
}) {
  return JSON.stringify(
    {
      itemCode: code.trim(),
      itemName: name.trim(),
      barcode: barcode.trim(),
      itemGroup: itemGroup.trim(),
      itemCategory: category.trim(),
      unitOfMeasure: unitOfMeasure.trim(),
    },
    null,
    0,
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getBarcodePreviewSvg(value: string) {
  const bits: number[] = [1, 0, 1, 0, 1, 0];

  for (const char of value) {
    const binary = char.charCodeAt(0).toString(2).padStart(8, "0");
    for (const bit of binary) {
      bits.push(bit === "1" ? 1 : 0);
    }
    bits.push(0);
  }

  bits.push(1, 0, 1, 0, 1, 0, 1);

  const barWidth = 2;
  const width = bits.length * barWidth + 24;
  const rects = bits
    .map((bit, index) =>
      bit
        ? `<rect x="${12 + index * barWidth}" y="8" width="${barWidth}" height="68" fill="#111827" />`
        : "",
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 96" width="100%" height="160" role="img" aria-label="Barcode preview">
  <rect width="${width}" height="96" rx="16" fill="#ffffff" />
  ${rects}
  <text x="${width / 2}" y="90" text-anchor="middle" font-family="monospace" font-size="12" fill="#111827">${escapeHtml(value)}</text>
</svg>`;
}

function getQrPreviewSvg(value: string) {
  const size = 25;
  const cell = 7;
  const margin = 2;
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => false));

  paintFinder(matrix, 0, 0);
  paintFinder(matrix, size - 7, 0);
  paintFinder(matrix, 0, size - 7);

  let state = 2166136261;
  for (const char of value) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (isFinderZone(size, row, column)) {
        continue;
      }
      state ^= row * size + column + 1;
      state = Math.imul(state, 2246822519);
      matrix[row][column] = (state >>> 29) % 2 === 0;
    }
  }

  const viewSize = (size + margin * 2) * cell;
  const rects: string[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (!matrix[row][column]) {
        continue;
      }
      rects.push(
        `<rect x="${(column + margin) * cell}" y="${(row + margin) * cell}" width="${cell}" height="${cell}" fill="#111827" />`,
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" width="100%" height="220" role="img" aria-label="QR preview">
  <rect width="${viewSize}" height="${viewSize}" rx="16" fill="#ffffff" />
  ${rects.join("")}
</svg>`;
}

function paintFinder(matrix: boolean[][], startColumn: number, startRow: number) {
  for (let row = 0; row < 7; row += 1) {
    for (let column = 0; column < 7; column += 1) {
      const isBorder = row === 0 || row === 6 || column === 0 || column === 6;
      const isCenter = row >= 2 && row <= 4 && column >= 2 && column <= 4;
      matrix[startRow + row][startColumn + column] = isBorder || isCenter;
    }
  }
}

function isFinderZone(size: number, row: number, column: number) {
  const inTopLeft = row < 7 && column < 7;
  const inTopRight = row < 7 && column >= size - 7;
  const inBottomLeft = row >= size - 7 && column < 7;
  return inTopLeft || inTopRight || inBottomLeft;
}
