import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from "class-validator";

import { PosRefundMethod, OrderType, DeliveryStatus, TableStatus, KitchenStatus } from "../../../../generated/prisma";
import { SalesLineDto } from "../../dto/sales-receivables.dto";

export class CreateTableReservationDto {
  @IsDateString()
  reservedFrom!: string;

  @IsDateString()
  reservedTo!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  notes?: string;
}

export class CancelTableReservationDto {
  @IsOptional()
  @IsString()
  @Length(0, 255)
  reason?: string;
}


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

  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @IsOptional()
  @IsString()
  tableId?: string;

  @IsOptional()
  @IsString()
  waiterId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  serviceChargeAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deliveryFeeAmount?: number;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsEnum(DeliveryStatus)
  deliveryStatus?: DeliveryStatus;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @IsOptional()
  @IsString()
  deliveryCompanyId?: string;
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

export class UpdatePosSettingsDto {
  @IsOptional()
  @IsIn(["BY_INVOICE", "BY_SESSION"])
  postingMode?: "BY_INVOICE" | "BY_SESSION";

  @IsOptional()
  @IsBoolean()
  cogsPostingEnabled?: boolean;
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

  @IsOptional()
  @IsString()
  decision?: string;

  @IsOptional()
  @IsString()
  reason?: string;
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

export class UpdateTableStatusDto {
  @IsEnum(TableStatus)
  status!: TableStatus;
}

export class UpdateTableWaiterDto {
  @IsOptional()
  @IsString()
  assignedWaiterId?: string;
}

export class UpdateKitchenOrderStatusDto {
  @IsEnum(KitchenStatus)
  status!: KitchenStatus;
}

export class UpdateKitchenOrderItemStatusDto {
  @IsEnum(KitchenStatus)
  status!: KitchenStatus;
}

export class TransferTableDto {
  @IsString()
  fromTableId!: string;

  @IsString()
  toTableId!: string;
}

export class MergeTablesDto {
  @IsArray()
  @IsString({ each: true })
  sourceTableIds!: string[];

  @IsString()
  targetTableId!: string;
}

export class SplitTableLineDto {
  @IsString()
  itemId!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;
}

export class SplitTableDto {
  @IsString()
  tableId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitTableLineDto)
  lines!: SplitTableLineDto[];
}

export class CorrectOrderTypeDto {
  @IsEnum(OrderType)
  orderType!: OrderType;

  @IsOptional()
  @IsString()
  tableId?: string;

  @IsOptional()
  @IsString()
  deliveryCompanyId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceChargeAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFeeAmount?: number;

  @IsString()
  reason!: string;
}

export class ReprintKotDto {
  @IsString()
  reason!: string;
}

export class CreateTableDto {
  @IsString()
  tableNumber!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  capacity!: number;
}
