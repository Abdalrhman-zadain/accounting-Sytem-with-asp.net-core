import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from "class-validator";

import { PosRefundMethod } from "../../../../generated/prisma";
import { SalesLineDto } from "../../dto/sales-receivables.dto";

export class OpenPosSessionDto {
  @IsString()
  warehouseId!: string;

  @IsString()
  cashAccountId!: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  terminalName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  branchName?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingCash!: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  notes?: string;
}

export class ClosePosSessionDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  actualCash!: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  notes?: string;
}

export class PosPaymentDto {
  @IsString()
  bankCashAccountId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  reference?: string;
}

class PosSaleBaseDto {
  @IsString()
  sessionId!: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsString()
  @Length(1, 8)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesLineDto)
  lines!: SalesLineDto[];
}

export class HoldPosSaleDto extends PosSaleBaseDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosPaymentDto)
  payments?: PosPaymentDto[];
}

export class SavePosDraftDto extends PosSaleBaseDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosPaymentDto)
  payments?: PosPaymentDto[];
}

export class CompletePosSaleDto extends PosSaleBaseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosPaymentDto)
  payments!: PosPaymentDto[];
}

export class SetPosFavoriteItemsDto {
  @IsArray()
  @IsString({ each: true })
  itemIds!: string[];
}

export class VoidPosSaleDto {
  @IsOptional()
  @IsString()
  @Length(0, 255)
  reason?: string;
}

export class PosReviewDecisionDto {
  @IsOptional()
  @IsString()
  @Length(0, 255)
  notes?: string;
}

export class PosReverseAccountingDto {
  @IsOptional()
  @IsDateString()
  reversalDate?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}

export class PosReturnLineDto {
  @IsString()
  salesInvoiceLineId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity!: number;
}

export class PosReturnPaymentDto {
  @IsEnum(PosRefundMethod)
  refundMethod!: PosRefundMethod;

  @IsOptional()
  @IsString()
  bankCashAccountId?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  reference?: string;
}

export class CreatePosReturnDto {
  @IsString()
  salesInvoiceId!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  reason?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosReturnLineDto)
  lines!: PosReturnLineDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosReturnPaymentDto)
  payments!: PosReturnPaymentDto[];
}
