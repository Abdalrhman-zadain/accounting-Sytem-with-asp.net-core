import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

const CREDIT_NOTE_TYPE_EFFECTS = [
  'FINANCIAL_ONLY',
  'FINANCIAL_INVENTORY',
  'TAX_ONLY',
] as const;

const LINKED_INVOICE_REQUIREMENTS = ['REQUIRED', 'OPTIONAL'] as const;

export class CreateCreditNoteTypeDto {
  @IsString()
  @Length(1, 64)
  code!: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsString()
  @IsIn(CREDIT_NOTE_TYPE_EFFECTS)
  effect!: (typeof CREDIT_NOTE_TYPE_EFFECTS)[number];

  @IsString()
  @IsIn(LINKED_INVOICE_REQUIREMENTS)
  linkedInvoiceRequirement!: (typeof LINKED_INVOICE_REQUIREMENTS)[number];

  @Type(() => Boolean)
  @IsBoolean()
  affectsInventory!: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  allowsTaxAdjustment!: boolean;

  @IsString()
  defaultAccountId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  helperText?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCreditNoteTypeDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(CREDIT_NOTE_TYPE_EFFECTS)
  effect?: (typeof CREDIT_NOTE_TYPE_EFFECTS)[number];

  @IsOptional()
  @IsString()
  @IsIn(LINKED_INVOICE_REQUIREMENTS)
  linkedInvoiceRequirement?: (typeof LINKED_INVOICE_REQUIREMENTS)[number];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  affectsInventory?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  allowsTaxAdjustment?: boolean;

  @IsOptional()
  @IsString()
  defaultAccountId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  helperText?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
