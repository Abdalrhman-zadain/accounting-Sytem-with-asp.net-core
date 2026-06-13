import type { InventoryItem, InventoryItemWarehouseStock } from "@/types/api";
import type { SalesLineEditorState } from "./components/quotation-editor-modal";

export function lineTracksInventory(item: InventoryItem | null | undefined) {
  return Boolean(item && item.type !== "SERVICE" && item.trackInventory);
}

export function warehouseOnHandQuantity(
  stock: InventoryItemWarehouseStock | undefined,
  warehouseId: string,
) {
  if (!warehouseId) {
    return 0;
  }
  const balance = stock?.balances.find((row) => row.warehouseId === warehouseId);
  return balance ? Number(balance.onHandQuantity) : 0;
}

export function pickBestWarehouseId(
  item: InventoryItem,
  stock: InventoryItemWarehouseStock | undefined,
) {
  if (!stock?.balances.length) {
    return item.preferredWarehouse?.id || item.preferredWarehouseId || "";
  }

  const preferredId = item.preferredWarehouse?.id || item.preferredWarehouseId || "";
  if (preferredId && warehouseOnHandQuantity(stock, preferredId) > 0) {
    return preferredId;
  }

  const best = stock.balances.reduce((current, candidate) =>
    Number(candidate.onHandQuantity) > Number(current.onHandQuantity) ? candidate : current,
  );
  return best.warehouseId;
}

export function validateSalesDocumentInventoryStock(options: {
  lines: SalesLineEditorState[];
  inventoryItems: InventoryItem[];
  stockByItemId: Map<string, InventoryItemWarehouseStock>;
  warehouses: Array<{ id: string; code: string; name: string }>;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { lines, inventoryItems, stockByItemId, warehouses, t } = options;

  for (const [index, line] of lines.entries()) {
    const item = inventoryItems.find((row) => row.id === line.itemId) ?? null;
    if (!lineTracksInventory(item)) {
      continue;
    }

    if (!line.warehouseId) {
      return t("salesReceivables.validation.warehouseRequiredForInventory", {
        index: index + 1,
      });
    }

    const requestedQty = Number(line.quantity);
    if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
      continue;
    }

    const stock = stockByItemId.get(line.itemId);
    const availableQty = warehouseOnHandQuantity(stock, line.warehouseId);
    if (availableQty + 1e-9 >= requestedQty) {
      continue;
    }

    const warehouse =
      warehouses.find((row) => row.id === line.warehouseId) ??
      stock?.balances.find((row) => row.warehouseId === line.warehouseId);

    const warehouseLabel = warehouse
      ? "warehouseCode" in warehouse
        ? `${warehouse.warehouseCode} · ${warehouse.warehouseName}`
        : `${warehouse.code} · ${warehouse.name}`
      : line.warehouseId;

    return t("salesReceivables.validation.insufficientWarehouseStock", {
      index: index + 1,
      itemCode: item?.code ?? line.itemName,
      warehouse: warehouseLabel,
      available: availableQty,
      requested: requestedQty,
    });
  }

  return null;
}
