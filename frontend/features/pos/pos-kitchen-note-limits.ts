/** Max characters for order-level kitchen note on POS sales. */
export const POS_ORDER_NOTE_MAX = 80;

/** Max characters for per-item kitchen note on POS cart lines. */
export const POS_ITEM_KITCHEN_NOTE_MAX = 60;

/** Chars per line when pre-wrapping notes for 72mm thermal KOT slips. */
export const POS_KOT_NOTE_WRAP_CHARS = 22;

export function countKitchenNoteWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function kotOrderNoteSizeClass(text: string): string {
  const words = countKitchenNoteWords(text);
  if (words <= 10) return "order-note-text order-note-text--lg";
  if (words <= 20) return "order-note-text order-note-text--md";
  return "order-note-text order-note-text--sm";
}

export function kotLineNoteSizeClass(text: string): string {
  const words = countKitchenNoteWords(text);
  if (words <= 8) return "line-note line-note--lg";
  if (words <= 16) return "line-note line-note--md";
  return "line-note line-note--sm";
}

/** Pre-wrap note text so thermal printers keep long kitchen notes inside the slip width. */
export function wrapThermalKotNoteText(
  text: string,
  maxCharsPerLine = POS_KOT_NOTE_WRAP_CHARS,
): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const words = trimmed.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
    }
    if (word.length > maxCharsPerLine) {
      for (let i = 0; i < word.length; i += maxCharsPerLine) {
        lines.push(word.slice(i, i + maxCharsPerLine));
      }
      current = "";
    } else {
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.join("<br/>");
}

export function clampKitchenOrderNote(value: string): string {
  return value.slice(0, POS_ORDER_NOTE_MAX);
}

export function clampKitchenLineNote(value: string): string {
  return value.slice(0, POS_ITEM_KITCHEN_NOTE_MAX);
}
