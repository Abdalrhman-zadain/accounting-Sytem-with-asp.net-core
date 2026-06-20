"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { KitchenDeltaLine } from "@/features/pos/pos-kitchen-print-delta";
import { loadPosPrinterConfig } from "@/features/pos/pos-printer-config";
import { printKitchenDelta, printKitchenNewOrder } from "@/features/pos/pos-print-service";
import type { PosLineModifiersPayload } from "@/features/pos/pos-addon-types";
import { getPosKitchenOrders } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { KitchenOrder, PosSale } from "@/types/api";

type KitchenOrderPrintItem = KitchenOrder["items"][number] & {
  salesInvoiceLineId?: string | null;
};

function kitchenInvoicePrintKey(salesInvoiceId: string): string {
  return `invoice:${salesInvoiceId}`;
}

function kitchenLinePrintKey(lineId: string): string {
  return `line:${lineId}`;
}

function isKitchenInvoiceMarkedPrinted(
  knownIds: ReadonlySet<string>,
  salesInvoiceId: string | null | undefined,
): boolean {
  return Boolean(salesInvoiceId && knownIds.has(kitchenInvoicePrintKey(salesInvoiceId)));
}

function markKitchenInvoicePrinted(knownIds: Set<string>, salesInvoiceId: string): void {
  knownIds.add(kitchenInvoicePrintKey(salesInvoiceId));
}

export type KitchenCartLinePrintRef = {
  salesInvoiceLineId?: string | null;
  kitchenSentAt?: string | null;
};

export function markKitchenLinesFromCartInSet(
  knownIds: Set<string>,
  lines: KitchenCartLinePrintRef[],
): void {
  for (const line of lines) {
    if (!line.kitchenSentAt) {
      continue;
    }
    const lineId = line.salesInvoiceLineId?.trim();
    if (lineId) {
      knownIds.add(kitchenLinePrintKey(lineId));
    }
  }
}

function kitchenItemPrintKeys(item: KitchenOrderPrintItem): string[] {
  const keys = [item.id];
  if (item.salesInvoiceLineId) {
    keys.push(`line:${item.salesInvoiceLineId}`);
  }
  return keys;
}

function isKitchenItemPrinted(
  knownIds: ReadonlySet<string>,
  item: KitchenOrderPrintItem,
): boolean {
  return kitchenItemPrintKeys(item).some((key) => knownIds.has(key));
}

function markKitchenItemPrinted(knownIds: Set<string>, item: KitchenOrderPrintItem): void {
  for (const key of kitchenItemPrintKeys(item)) {
    knownIds.add(key);
  }
}

function isKitchenOrderOpenForPrinting(order: KitchenOrder): boolean {
  const status = order.salesInvoice?.posOperationalStatus;
  return !status || (status !== "COMPLETED" && status !== "REFUNDED");
}

const HUB_CHANNEL_NAME = "pos-kitchen-print-hub";
const POLL_INTERVAL_MS = 3000;
const LEADER_HEARTBEAT_MS = 1000;
const LEADER_STALE_MS = 2500;
/** Items newer than this still print when the register tab opens after a waiter send. */
const RECENT_KITCHEN_ITEM_MS = 5 * 60 * 1000;
const PRINTED_IDS_STORAGE_KEY = "pos.kitchen-print-hub.printed-ids";

function resolveKitchenLineId(item: KitchenOrderPrintItem): string {
  return item.salesInvoiceLineId ?? item.id;
}

function loadPersistedPrintedIds(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const raw = window.sessionStorage.getItem(PRINTED_IDS_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const ids = JSON.parse(raw) as string[];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function persistPrintedIds(ids: ReadonlySet<string>) {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(PRINTED_IDS_STORAGE_KEY, JSON.stringify([...ids]));
}

export function primePrintedKitchenItemIds(
  orders: KitchenOrder[],
  knownIds: Set<string>,
  nowMs = Date.now(),
): void {
  for (const order of orders) {
    for (const item of order.items) {
      const createdAt = new Date(item.createdAt).getTime();
      if (nowMs - createdAt > RECENT_KITCHEN_ITEM_MS) {
        markKitchenItemPrinted(knownIds, item as KitchenOrderPrintItem);
      }
    }
  }
}

export function collectKitchenOrderItemIds(orders: KitchenOrder[]): string[] {
  return orders.flatMap((order) => order.items.map((item) => item.id));
}

export function isKitchenOrderFirstPrint(
  knownIds: ReadonlySet<string>,
  order: KitchenOrder,
): boolean {
  return !order.items.some((item) =>
    isKitchenItemPrinted(knownIds, item as KitchenOrderPrintItem),
  );
}

export function findUnprintedKitchenItems(
  knownIds: ReadonlySet<string>,
  orders: KitchenOrder[],
): Array<{ order: KitchenOrder; items: KitchenOrder["items"] }> {
  const groups: Array<{ order: KitchenOrder; items: KitchenOrder["items"] }> = [];

  for (const order of orders) {
    if (!isKitchenOrderOpenForPrinting(order)) {
      continue;
    }
    if (isKitchenInvoiceMarkedPrinted(knownIds, order.salesInvoiceId)) {
      continue;
    }
    const items = order.items.filter(
      (item) => !isKitchenItemPrinted(knownIds, item as KitchenOrderPrintItem),
    );
    if (items.length > 0) {
      groups.push({ order, items });
    }
  }

  return groups;
}

export function kitchenOrderToSaleStub(order: KitchenOrder): PosSale {
  return {
    reference: order.orderNumber,
    table: order.tableName ? { tableNumber: order.tableName } : null,
    waiter: order.waiterName ? { name: order.waiterName } : null,
    description: order.notes ?? null,
    lines: order.items.map((item, index) => ({
      id: resolveKitchenLineId(item as KitchenOrderPrintItem),
      lineNumber: index + 1,
      itemId: item.itemId,
      itemName: item.itemName,
      description: item.notes || item.itemName,
      quantity: item.quantity,
      modifiers: item.modifiers,
      kitchenSentAt: item.createdAt,
    })),
  } as PosSale;
}

export function kitchenItemsToDeltaLines(items: KitchenOrder["items"]): KitchenDeltaLine[] {
  return items.map((item) => ({
    lineId: resolveKitchenLineId(item as KitchenOrderPrintItem),
    itemId: item.itemId,
    name: item.itemName,
    qty: Number(item.quantity) || 0,
    modifiers: (item.modifiers as PosLineModifiersPayload | null | undefined) ?? null,
    lineNote: item.notes ?? undefined,
  }));
}

function createTabId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function useKitchenPrintHubLeader(enabled: boolean): boolean {
  const [isLeader, setIsLeader] = useState(() => typeof BroadcastChannel === "undefined");
  const tabIdRef = useRef(createTabId());
  const lastPeerHeartbeatRef = useRef(0);

  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === "undefined") {
      setIsLeader(true);
      return;
    }

    const channel = new BroadcastChannel(HUB_CHANNEL_NAME);
    const tabId = tabIdRef.current;

    const onMessage = (event: MessageEvent<{ type?: string; tabId?: string }>) => {
      const data = event.data;
      if (!data || data.tabId === tabId) {
        return;
      }
      if (data.type === "heartbeat") {
        lastPeerHeartbeatRef.current = Date.now();
        setIsLeader(false);
      }
    };

    channel.addEventListener("message", onMessage);

    const heartbeatTimer = window.setInterval(() => {
      const peerIsActive = Date.now() - lastPeerHeartbeatRef.current < LEADER_STALE_MS;
      if (!peerIsActive) {
        setIsLeader(true);
        channel.postMessage({ type: "heartbeat", tabId });
        return;
      }
      setIsLeader(false);
    }, LEADER_HEARTBEAT_MS);

    return () => {
      window.clearInterval(heartbeatTimer);
      channel.removeEventListener("message", onMessage);
      channel.close();
    };
  }, [enabled]);

  return isLeader;
}

export type UseKitchenPrintHubOptions = {
  enabled: boolean;
  token: string | null;
  language: string;
  onPrintError?: (message: string) => void;
};

export type KitchenPrintHubController = {
  markKitchenOrderItemsPrinted: (itemIds: string[]) => void;
  markKitchenOrderItemsPrintedForSale: (salesInvoiceId: string) => void;
  markKitchenInvoiceFullyPrinted: (salesInvoiceId: string) => void;
  markKitchenLinesFromCart: (salesInvoiceId: string, lines: KitchenCartLinePrintRef[]) => void;
};

export function useKitchenPrintHub({
  enabled,
  token,
  language,
  onPrintError,
}: UseKitchenPrintHubOptions): KitchenPrintHubController {
  const printedIdsRef = useRef(loadPersistedPrintedIds());
  const primedRef = useRef(false);
  const printingRef = useRef(false);
  const latestOrdersRef = useRef<KitchenOrder[]>([]);
  const isLeader = useKitchenPrintHubLeader(enabled);

  const ordersQuery = useQuery({
    queryKey: queryKeys.posKitchenOrders(token),
    queryFn: () => getPosKitchenOrders(token),
    enabled: Boolean(enabled && token && isLeader),
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const markKitchenOrderItemsPrinted = useCallback((itemIds: string[]) => {
    for (const id of itemIds) {
      printedIdsRef.current.add(id);
      const item = latestOrdersRef.current
        .flatMap((order) => order.items)
        .find((row) => row.id === id);
      if (item) {
        markKitchenItemPrinted(printedIdsRef.current, item as KitchenOrderPrintItem);
      }
    }
    persistPrintedIds(printedIdsRef.current);
  }, []);

  const markKitchenInvoiceFullyPrinted = useCallback((salesInvoiceId: string) => {
    markKitchenInvoicePrinted(printedIdsRef.current, salesInvoiceId);
    persistPrintedIds(printedIdsRef.current);
  }, []);

  const markKitchenLinesFromCart = useCallback(
    (salesInvoiceId: string, lines: KitchenCartLinePrintRef[]) => {
      markKitchenInvoicePrinted(printedIdsRef.current, salesInvoiceId);
      markKitchenLinesFromCartInSet(printedIdsRef.current, lines);
      persistPrintedIds(printedIdsRef.current);
    },
    [],
  );

  const markKitchenOrderItemsPrintedForSale = useCallback(
    (salesInvoiceId: string) => {
      markKitchenInvoicePrinted(printedIdsRef.current, salesInvoiceId);
      const order = latestOrdersRef.current.find(
        (row) => row.salesInvoiceId === salesInvoiceId,
      );
      if (order) {
        for (const item of order.items) {
          markKitchenItemPrinted(printedIdsRef.current, item as KitchenOrderPrintItem);
        }
      }
      persistPrintedIds(printedIdsRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!enabled || !isLeader || !ordersQuery.data) {
      return;
    }

    latestOrdersRef.current = ordersQuery.data;

    if (!primedRef.current) {
      primePrintedKitchenItemIds(ordersQuery.data, printedIdsRef.current);
      persistPrintedIds(printedIdsRef.current);
      primedRef.current = true;
    }

    const config = loadPosPrinterConfig();
    if (!config.autoPrintKotOnSend || !config.kitchenPrintHubEnabled) {
      return;
    }

    const groups = findUnprintedKitchenItems(printedIdsRef.current, ordersQuery.data);
    if (groups.length === 0 || printingRef.current) {
      return;
    }

    printingRef.current = true;
    void (async () => {
      try {
        for (const group of groups) {
          const isFirstSend = isKitchenOrderFirstPrint(printedIdsRef.current, group.order);
          for (const item of group.items) {
            markKitchenItemPrinted(printedIdsRef.current, item as KitchenOrderPrintItem);
          }
          const saleStub = kitchenOrderToSaleStub(group.order);
          const deltaLines = kitchenItemsToDeltaLines(group.items);
          if (isFirstSend) {
            await printKitchenNewOrder(saleStub, deltaLines, language);
          } else {
            await printKitchenDelta(saleStub, deltaLines, language);
          }
        }
      } catch (error) {
        for (const group of groups) {
          for (const item of group.items) {
            for (const key of kitchenItemPrintKeys(item as KitchenOrderPrintItem)) {
              printedIdsRef.current.delete(key);
            }
          }
        }
        onPrintError?.(error instanceof Error ? error.message : String(error));
      } finally {
        printingRef.current = false;
      }
    })();
  }, [enabled, isLeader, language, onPrintError, ordersQuery.data]);

  return {
    markKitchenOrderItemsPrinted,
    markKitchenOrderItemsPrintedForSale,
    markKitchenInvoiceFullyPrinted,
    markKitchenLinesFromCart,
  };
}
