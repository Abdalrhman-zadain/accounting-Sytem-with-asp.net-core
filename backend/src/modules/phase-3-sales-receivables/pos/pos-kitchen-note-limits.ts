import { BadRequestException } from '@nestjs/common';

/** Max characters for order-level kitchen note on POS sales. */
export const POS_KITCHEN_ORDER_NOTE_MAX = 80;

/** Max characters for per-item kitchen note on POS cart lines. */
export const POS_KITCHEN_LINE_NOTE_MAX = 60;

type PosKitchenNoteInput = {
  description?: string | null;
  lines?: Array<{ description?: string | null }> | null;
};

export function assertPosKitchenNoteLimits(dto: PosKitchenNoteInput): void {
  const orderNote = dto.description?.trim() ?? '';
  if (orderNote.length > POS_KITCHEN_ORDER_NOTE_MAX) {
    throw new BadRequestException(
      `Order kitchen note must be at most ${POS_KITCHEN_ORDER_NOTE_MAX} characters.`,
    );
  }

  for (const [index, line] of (dto.lines ?? []).entries()) {
    const lineNote = line.description?.trim() ?? '';
    if (lineNote.length > POS_KITCHEN_LINE_NOTE_MAX) {
      throw new BadRequestException(
        `Kitchen note on line ${index + 1} must be at most ${POS_KITCHEN_LINE_NOTE_MAX} characters.`,
      );
    }
  }
}
