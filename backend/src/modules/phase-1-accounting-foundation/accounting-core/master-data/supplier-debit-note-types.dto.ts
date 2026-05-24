import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

const EFFECTS = ['FINANCIAL_ONLY', 'FINANCIAL_INVENTORY', 'TAX_ONLY'] as const;
const LINKED_INVOICE_REQUIREMENTS = ['REQUIRED', 'OPTIONAL'] as const;

export class CreateSupplierDebitNoteTypeDto {
  @IsString()
  @Length(1, 64)
  code!: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsString()
  @IsIn(EFFECTS)
  effect!: (typeof EFFECTS)[number];

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

export class UpdateSupplierDebitNoteTypeDto {
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
  @IsIn(EFFECTS)
  effect?: (typeof EFFECTS)[number];

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
