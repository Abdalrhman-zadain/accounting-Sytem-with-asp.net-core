"use client";

import { useQuery } from "@tanstack/react-query";

import { getInventoryItems, getInventoryWarehouses } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { InventoryItem } from "@/types/api";

const POS_CATALOG_PAGE_LIMIT = 100;

type PosCatalogOptions = {
  /** When set, item on-hand quantities reflect this warehouse (matches sale stock checks). */
  warehouseId?: string | null;
  /** When true, the catalog query waits until `warehouseId` is set (market register). */
  requireWarehouse?: boolean;
};

async function fetchActiveInventoryCatalog(
  token: string | null,
  warehouseId?: string,
): Promise<InventoryItem[]> {
  const baseParams = {
    page: 1,
    limit: POS_CATALOG_PAGE_LIMIT,
    isActive: "true" as const,
    warehouseId,
  };

  const firstPage = await getInventoryItems(baseParams, token);

  if (firstPage.totalPages <= 1) {
    return firstPage.data;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      getInventoryItems(
        {
          ...baseParams,
          page: index + 2,
        },
        token,
      ),
    ),
  );

  return [...firstPage.data, ...remainingPages.flatMap((page) => page.data)];
}

/**
 * Shared POS catalog data used by both restaurant and market terminals.
 * Import this hook from `features/pos-shared`, not from `features/pos`.
 */
export function usePosCatalog(
  token: string | null | undefined,
  options?: PosCatalogOptions,
) {
  const authToken = token ?? null;
  const warehouseId = options?.warehouseId?.trim() || undefined;
  const requireWarehouse = options?.requireWarehouse ?? false;

  const itemsQuery = useQuery({
    queryKey: queryKeys.inventoryItems(authToken, {
      isActive: "true",
      warehouseId,
    }),
    queryFn: () => fetchActiveInventoryCatalog(authToken, warehouseId),
    enabled: Boolean(authToken && (!requireWarehouse || warehouseId)),
  });

  const warehousesQuery = useQuery({
    queryKey: queryKeys.inventoryWarehouses(authToken),
    queryFn: () => getInventoryWarehouses({}, authToken),
    enabled: Boolean(authToken),
  });

  return {
    items: itemsQuery.data ?? [],
    warehouses: warehousesQuery.data ?? [],
    isLoading: itemsQuery.isLoading || warehousesQuery.isLoading,
    isError: itemsQuery.isError || warehousesQuery.isError,
    refetch: async () => {
      await Promise.all([itemsQuery.refetch(), warehousesQuery.refetch()]);
    },
  };
}
