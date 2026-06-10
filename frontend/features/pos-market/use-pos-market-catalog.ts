"use client";

import { useMemo } from "react";

import { usePosCatalog } from "@/features/pos-shared";

const MARKET_ITEM_CODE_PREFIX = "MKT-";
const MARKET_GROUP_PREFIX = "MARKET-";

export function usePosMarketCatalog(
  token: string | null | undefined,
  sessionWarehouseId?: string | null,
) {
  const catalog = usePosCatalog(token, {
    warehouseId: sessionWarehouseId,
    requireWarehouse: true,
  });

  const items = useMemo(
    () =>
      catalog.items.filter(
        (item) =>
          item.code.startsWith(MARKET_ITEM_CODE_PREFIX) ||
          item.itemGroup?.code?.startsWith(MARKET_GROUP_PREFIX),
      ),
    [catalog.items],
  );

  return {
    ...catalog,
    items,
  };
}
