import { Type } from "class-transformer";
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
} from "class-validator";

export {
  ClosePosSessionDto,
  CompletePosSaleDto,
  CreatePosReturnDto,
  HoldPosSaleDto,
  OpenPosSessionDto,
  PosPaymentDto,
  PosReturnLineDto,
  PosReturnPaymentDto,
  PosReverseAccountingDto,
  PosReviewDecisionDto,
  SavePosDraftDto,
  SetPosFavoriteItemsDto,
  UpdatePosSettingsDto,
  VoidPosSaleDto,
  CorrectPaymentMethodDto,
} from "../../pos/dto/pos.dto";

const MAX_AMOUNT = 999_999_999.99;

export class CollectMarketReceivableAllocationDto {
  @IsString()
  salesInvoiceId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(MAX_AMOUNT)
  amount!: number;
}

export class CollectMarketReceivablesDto {
  @IsString()
  customerId!: string;

  @IsDateString()
  receiptDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(MAX_AMOUNT)
  amount!: number;

  @IsString()
  bankCashAccountId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollectMarketReceivableAllocationDto)
  allocations?: CollectMarketReceivableAllocationDto[];
}

export class MarketReceivableStatementQueryDto {
  @IsDateString()
  fromDate!: string;

  @IsDateString()
  toDate!: string;
}
