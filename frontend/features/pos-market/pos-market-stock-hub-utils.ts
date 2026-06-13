import type { MarketStockLocation, MarketStockOverview } from "@/types/api";
import type { TranslationKey } from "@/lib/i18n";

export type LocationKey = `${MarketStockLocation["type"]}:${string}`;

export type TransferKind = "load" | "unload" | "rep-transfer" | "wh-transfer";

export function locationKey(location: Pick<MarketStockLocation, "type" | "id">): LocationKey {
  return `${location.type}:${location.id}`;
}

export function parseLocationKey(
  key: string,
): { type: MarketStockLocation["type"]; id: string } | null {
  const [type, id] = key.split(":");
  if ((type === "warehouse" || type === "rep") && id) {
    return { type, id };
  }
  return null;
}

export function resolveTransferKind(
  from: { type: MarketStockLocation["type"]; id: string },
  to: { type: MarketStockLocation["type"]; id: string },
): TransferKind | null {
  if (from.type === "warehouse" && to.type === "rep") return "load";
  if (from.type === "rep" && to.type === "warehouse") return "unload";
  if (from.type === "rep" && to.type === "rep") return "rep-transfer";
  if (from.type === "warehouse" && to.type === "warehouse") return "wh-transfer";
  return null;
}

export function buildBalanceMap(overview: MarketStockOverview | undefined) {
  const map = new Map<string, number>();
  if (!overview) return map;
  for (const row of overview.balances) {
    map.set(`${row.locationType}:${row.locationId}:${row.itemId}`, row.onHandQuantity);
  }
  return map;
}

export function locationLabel(
  location: MarketStockLocation,
  t: (key: TranslationKey) => string,
) {
  const prefix =
    location.type === "warehouse"
      ? t("posMarket.stockHub.locationWarehouse")
      : t("posMarket.stockHub.locationRep");
  return `${prefix}: ${location.name}`;
}
