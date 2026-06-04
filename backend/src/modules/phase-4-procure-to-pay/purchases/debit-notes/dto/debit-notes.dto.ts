import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  MAX_AMOUNT,
  MAX_QUANTITY,
} from '../../../../../common/validation/decimal-limits';

export class DebitNoteLineDto {
  @IsOptional()
  @IsString()
  purchaseInvoiceLineId?: string;

  @IsOptional()
  @IsString()
  itemId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  itemName?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  @Max(MAX_QUANTITY)
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_AMOUNT)
  unitPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_AMOUNT)
  amount!: number;

  @IsOptional()
  @IsString()
  discountAccountId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_AMOUNT)
  taxAmount!: number;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_AMOUNT)
  originalUnitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_AMOUNT)
  correctedUnitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_AMOUNT)
  originalTaxAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_AMOUNT)
  correctedTaxAmount?: number;

  @IsOptional()
  @Type(() => Boolean)
  returnToStock?: boolean;

  @IsOptional()
  @IsString()
  itemCondition?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @Length(1, 255)
  reason!: string;
}

export class CreateDebitNoteDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsDateString()
  noteDate!: string;

  @IsString()
  supplierId!: string;

  @IsString()
  supplierDebitNoteTypeId!: string;

  @IsOptional()
  @IsString()
  purchaseInvoiceId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 8)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DebitNoteLineDto)
  lines!: DebitNoteLineDto[];
}

export class UpdateDebitNoteDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsOptional()
  @IsDateString()
  noteDate?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  supplierDebitNoteTypeId?: string;

  @IsOptional()
  @IsString()
  purchaseInvoiceId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 8)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DebitNoteLineDto)
  lines?: DebitNoteLineDto[];
}
