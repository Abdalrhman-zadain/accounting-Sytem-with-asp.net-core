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
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import {
  MAX_AMOUNT,
  MAX_QUANTITY,
} from '../../../../common/validation/decimal-limits';

import {
  PosPaymentMethod,
  PosRefundMethod,
  OrderType,
  DeliveryStatus,
  DeliveryCollectionMethod,
  TableStatus,
  KitchenStatus,
} from "../../../../generated/prisma";
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

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  orderNotes?: string;
}

export class CancelTableReservationDto {
  @IsOptional()
  @IsString()
  @Length(0, 255)
  reason?: string;
}

export class UpdateTableReservationDto {
  @IsOptional()
  @IsString()
  @Length(0, 255)
  notes?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  orderNotes?: string;

  @IsOptional()
  @IsString()
  @IsIn(["UNKNOWN", "ARRIVED", "NO_SHOW"])
  attendanceStatus?: "UNKNOWN" | "ARRIVED" | "NO_SHOW";
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
  @Max(MAX_AMOUNT)
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
  @Max(MAX_AMOUNT)
  actualCash!: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  notes?: string;
}

export class PosPaymentDto {
  @IsOptional()
  @IsString()
  bankCashAccountId?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(MAX_AMOUNT)
  amount!: number;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  reference?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
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
  @Max(MAX_AMOUNT)
  serviceChargeAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
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

  @IsOptional()
  @IsEnum(DeliveryCollectionMethod)
  deliveryCollectionMethod?: DeliveryCollectionMethod;

  @IsOptional()
  @IsString()
  reservationId?: string;
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

export class DeliveryCompanyMappingDto {
  @IsString()
  id!: string;

  @IsString()
  receivableAccountId!: string;

  @IsOptional()
  @IsString()
  commissionAccountId?: string;

  @IsOptional()
  @IsString()
  serviceFeeAccountId?: string;
}

export class UpdatePosSettingsDto {
  @IsOptional()
  @IsIn(["BY_INVOICE", "BY_SESSION"])
  postingMode?: "BY_INVOICE" | "BY_SESSION";

  @IsOptional()
  @IsBoolean()
  cogsPostingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  taxFreeEnabled?: boolean;

  @IsOptional()
  @IsString()
  cashAccountId?: string;

  @IsOptional()
  @IsString()
  cardAccountId?: string;

  @IsOptional()
  @IsString()
  cliqAccountId?: string;

  @IsOptional()
  @IsString()
  walletAccountId?: string;

  @IsOptional()
  @IsString()
  bankTransferAccountId?: string;

  @IsOptional()
  @IsString()
  salesRevenueAccountId?: string;

  @IsOptional()
  @IsString()
  outputVatAccountId?: string;

  @IsOptional()
  @IsString()
  salesDiscountAccountId?: string;

  @IsOptional()
  @IsString()
  salesReturnsAccountId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryCompanyMappingDto)
  deliveryCompanies?: DeliveryCompanyMappingDto[];
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
  @Max(MAX_QUANTITY)
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
  @Max(MAX_AMOUNT)
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
  @Max(MAX_QUANTITY)
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
  @Max(MAX_AMOUNT)
  serviceChargeAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_AMOUNT)
  deliveryFeeAmount?: number;

  @IsString()
  reason!: string;
}

export class CorrectPaymentMethodDto {
  @IsEnum(PosPaymentMethod)
  paymentMethod!: PosPaymentMethod;

  @IsOptional()
  @IsString()
  deliveryCompanyId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  reference?: string;

  @IsString()
  @Length(1, 255)
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

export class UpdateDeliveryCompanyStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

export class DeliveryCompanySettlementPreviewDto {
  @IsString()
  deliveryCompanyId!: string;

  @IsDateString()
  periodFrom!: string;

  @IsDateString()
  periodTo!: string;
}

export class CreateDeliveryCompanySettlementDto extends DeliveryCompanySettlementPreviewDto {
  @IsDateString()
  settlementDate!: string;

  @IsString()
  bankCashAccountId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  statementReference?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  statementAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  commissionAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  serviceFeeAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  refundAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  adjustmentAmount!: number;

  @IsOptional()
  @IsString()
  differenceReason?: string;

  @IsOptional()
  @IsString()
  differenceAccountId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  differenceNotes?: string;

  @IsOptional()
  @IsString()
  statementAttachmentUrl?: string;

  @IsOptional()
  @IsString()
  bankReceiptAttachmentUrl?: string;

  @IsArray()
  @IsString({ each: true })
  salesInvoiceIds!: string[];
}
