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

export class PurchaseInvoiceLineDto {
  @IsOptional()
  @IsString()
  itemId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  itemName?: string;

  @IsString()
  @Length(1, 255)
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  @Max(MAX_QUANTITY)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_AMOUNT)
  unitPrice!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_AMOUNT)
  discountAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_AMOUNT)
  taxAmount!: number;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsString()
  accountId!: string;
}

export class CreatePurchaseInvoiceDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsDateString()
  invoiceDate!: string;

  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsString()
  @Length(1, 8)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsString()
  sourcePurchaseOrderId?: string;

  @IsOptional()
  @IsString()
  sourcePurchaseRequestId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseInvoiceLineDto)
  lines!: PurchaseInvoiceLineDto[];
}

export class UpdatePurchaseInvoiceDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  reference?: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 8)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsString()
  sourcePurchaseOrderId?: string;

  @IsOptional()
  @IsString()
  sourcePurchaseRequestId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseInvoiceLineDto)
  lines?: PurchaseInvoiceLineDto[];
}
