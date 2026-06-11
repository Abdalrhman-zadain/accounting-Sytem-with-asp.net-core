import { getInventoryItems } from "@/lib/api";
import type { InventoryItem } from "@/types/api";

export function filterMarketItems(items: InventoryItem[]) {
  return items.filter(
    (item) =>
      item.code.startsWith("MKT-") ||
      item.itemGroup?.code?.startsWith("MARKET-") ||
      item.itemGroup?.code?.startsWith("MKT-"),
  );
}

export async function fetchAllActiveInventoryItems(token?: string | null) {
  const pageLimit = 100;
  const allItems: InventoryItem[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await getInventoryItems(
      { isActive: "true", limit: pageLimit, page },
      token,
    );
    allItems.push(...response.data);
    totalPages = response.totalPages;
    page += 1;
  } while (page <= totalPages);

  return allItems;
}

export async function fetchMarketInventoryItems(token?: string | null) {
  const items = await fetchAllActiveInventoryItems(token);
  return filterMarketItems(items);
}

export async function fetchMarketInventoryItemsForWarehouse(
  warehouseId: string,
  token?: string | null,
) {
  const pageLimit = 100;
  const allItems: InventoryItem[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await getInventoryItems(
      { isActive: "true", limit: pageLimit, page, warehouseId },
      token,
    );
    allItems.push(...response.data);
    totalPages = response.totalPages;
    page += 1;
  } while (page <= totalPages);

  return filterMarketItems(allItems);
}

export function getWarehouseOnHandQuantity(
  warehouseItems: InventoryItem[],
  itemId: string,
) {
  const item = warehouseItems.find((row) => row.id === itemId);
  return item ? Number(item.onHandQuantity) : 0;
}

export type RepLoadStockIssue = {
  itemId: string;
  code: string;
  onHand: number;
  demand: number;
  shortage: number;
};

function buildRepLoadDemandByItem(lines: Array<{ itemId: string; quantity: string }>) {
  const demandByItem = new Map<string, number>();

  for (const line of lines) {
    if (!line.itemId) continue;
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    demandByItem.set(line.itemId, (demandByItem.get(line.itemId) ?? 0) + quantity);
  }

  return demandByItem;
}

export function findRepLoadStockIssues(
  lines: Array<{ itemId: string; quantity: string }>,
  warehouseItems: InventoryItem[],
): RepLoadStockIssue[] {
  const demandByItem = buildRepLoadDemandByItem(lines);
  const issues: RepLoadStockIssue[] = [];

  for (const [itemId, demand] of demandByItem) {
    const item = warehouseItems.find((row) => row.id === itemId);
    const onHand = item ? Number(item.onHandQuantity) : 0;
    if (demand > onHand + 0.0001) {
      issues.push({
        itemId,
        code: item?.code ?? itemId,
        onHand,
        demand,
        shortage: Number((demand - onHand).toFixed(4)),
      });
    }
  }

  return issues;
}

export function findRepLoadStockIssue(
  lines: Array<{ itemId: string; quantity: string }>,
  warehouseItems: InventoryItem[],
) {
  return findRepLoadStockIssues(lines, warehouseItems)[0] ?? null;
}
