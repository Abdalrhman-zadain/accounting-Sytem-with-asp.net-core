import type { PosLineModifiersPayload } from "@/features/pos/pos-addon-types";
import type { PosSale } from "@/types/api";

export type KitchenLineSnapshot = {
  lineId: string;
  itemId: string;
  name: string;
  qty: number;
  unitCode?: string | null;
  kitchenSentAt: string | null;
  modifiers?: PosLineModifiersPayload | null;
  lineNote?: string;
};

export type KitchenDeltaLine = {
  lineId?: string;
  itemId: string;
  name: string;
  qty: number;
  unitCode?: string | null;
  modifiers?: PosLineModifiersPayload | null;
  lineNote?: string;
};

export type KitchenPrintDiff = {
  additions: KitchenDeltaLine[];
  voids: KitchenDeltaLine[];
  qtyDecreases: KitchenDeltaLine[];
};

type SnapshotLineInput = {
  salesInvoiceLineId?: string | null;
  clientLineId?: string | null;
  itemId: string;
  name: string;
  quantity: number;
  unitCode?: string | null;
  kitchenSentAt?: string | null;
  modifiers?: PosLineModifiersPayload | null;
  lineNote?: string | null;
  description?: string | null;
  itemName?: string | null;
};

export function kitchenLineKey(line: {
  salesInvoiceLineId?: string | null;
  clientLineId?: string | null;
  itemId: string;
}): string {
  return line.salesInvoiceLineId ?? line.clientLineId ?? line.itemId;
}

export function captureKitchenLineSnapshot(lines: SnapshotLineInput[]): KitchenLineSnapshot[] {
  return lines.map((line) => ({
    lineId: kitchenLineKey(line),
    itemId: line.itemId,
    name: line.name || line.itemName || line.description || "—",
    qty: Number(line.quantity) || 0,
    unitCode: line.unitCode ?? null,
    kitchenSentAt: line.kitchenSentAt ?? null,
    modifiers: line.modifiers ?? null,
    lineNote: line.lineNote ?? undefined,
  }));
}

export function captureKitchenLineSnapshotFromSale(sale: PosSale): KitchenLineSnapshot[] {
  return captureKitchenLineSnapshot(
    sale.lines.map((line) => ({
      salesInvoiceLineId: line.id,
      itemId: line.itemId ?? "",
      name: line.itemName ?? line.description ?? "—",
      quantity: Number(line.quantity),
      unitCode: line.item?.unitOfMeasure ?? null,
      kitchenSentAt: line.kitchenSentAt ?? null,
      modifiers: line.modifiers ?? null,
      description: line.description ?? null,
      itemName: line.itemName ?? null,
    })),
  );
}

function toDeltaLine(snapshot: KitchenLineSnapshot, qty: number): KitchenDeltaLine {
  return {
    lineId: snapshot.lineId,
    itemId: snapshot.itemId,
    name: snapshot.name,
    qty,
    unitCode: snapshot.unitCode ?? null,
    modifiers: snapshot.modifiers ?? null,
    lineNote: snapshot.lineNote,
  };
}

export function diffKitchenSnapshots(
  before: KitchenLineSnapshot[],
  after: KitchenLineSnapshot[],
): KitchenPrintDiff {
  const beforeById = new Map(before.map((line) => [line.lineId, line]));
  const afterById = new Map(after.map((line) => [line.lineId, line]));

  const additions: KitchenDeltaLine[] = [];
  const voids: KitchenDeltaLine[] = [];
  const qtyDecreases: KitchenDeltaLine[] = [];

  for (const afterLine of after) {
    const beforeLine = beforeById.get(afterLine.lineId);
    if (!beforeLine) {
      if (afterLine.kitchenSentAt && afterLine.qty > 0) {
        additions.push(toDeltaLine(afterLine, afterLine.qty));
      }
      continue;
    }

    const wasSent = Boolean(beforeLine.kitchenSentAt);
    const isSent = Boolean(afterLine.kitchenSentAt);

    if (!wasSent && isSent && afterLine.qty > 0) {
      additions.push(toDeltaLine(afterLine, afterLine.qty));
    } else if (wasSent && isSent) {
      if (afterLine.qty > beforeLine.qty + 0.0001) {
        additions.push(toDeltaLine(afterLine, afterLine.qty - beforeLine.qty));
      } else if (beforeLine.qty > afterLine.qty + 0.0001) {
        qtyDecreases.push(toDeltaLine(beforeLine, beforeLine.qty - afterLine.qty));
      }
    }
  }

  for (const beforeLine of before) {
    if (!beforeLine.kitchenSentAt) {
      continue;
    }
    const afterLine = afterById.get(beforeLine.lineId);
    if (!afterLine) {
      voids.push(toDeltaLine(beforeLine, beforeLine.qty));
    }
  }

  return { additions, voids, qtyDecreases };
}

export function hasKitchenPrintDiff(diff: KitchenPrintDiff): boolean {
  return (
    diff.additions.length > 0 || diff.voids.length > 0 || diff.qtyDecreases.length > 0
  );
}

/** True when no line had been sent to the kitchen before this print batch. */
export function isFirstKitchenSend(before: KitchenLineSnapshot[]): boolean {
  return !before.some((line) => line.kitchenSentAt);
}

export function unsentKitchenLines(snapshot: KitchenLineSnapshot[]): KitchenLineSnapshot[] {
  return snapshot.filter((line) => !line.kitchenSentAt && line.qty > 0);
}

export type CartKitchenSnapshotInput = {
  salesInvoiceLineId?: string | null;
  clientLineId?: string | null;
  itemId: string;
  name: string;
  quantity: number;
  unit?: string | null;
  kitchenSentAt?: string | null;
  modifiers?: PosLineModifiersPayload | null;
  lineNote?: string | null;
};

export function captureKitchenLineSnapshotFromCart(
  lines: CartKitchenSnapshotInput[],
): KitchenLineSnapshot[] {
  return captureKitchenLineSnapshot(
    lines.map((line) => ({
      salesInvoiceLineId: line.salesInvoiceLineId,
      clientLineId: line.clientLineId,
      itemId: line.itemId,
      name: line.name,
      quantity: line.quantity,
      unitCode: line.unit ?? null,
      kitchenSentAt: line.kitchenSentAt,
      modifiers: line.modifiers,
      lineNote: line.lineNote,
    })),
  );
}
