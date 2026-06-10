"use client";

import { useQuery } from "@tanstack/react-query";

import { getPosMarketCatalog } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { InventoryItem } from "@/types/api";

export function usePosMarketCatalog(
  token: string | null | undefined,
  salesRepId?: string | null,
) {
  const repId = salesRepId?.trim() || undefined;

  const itemsQuery = useQuery({
    queryKey: queryKeys.posMarketCatalog(token ?? null, repId ?? null),
    queryFn: () => getPosMarketCatalog(repId!, token),
    enabled: Boolean(token && repId),
  });

  return {
    items: (itemsQuery.data ?? []) as InventoryItem[],
    warehouses: [] as const,
    isLoading: itemsQuery.isLoading,
    isError: itemsQuery.isError,
    refetch: async () => {
      await itemsQuery.refetch();
    },
  };
}
