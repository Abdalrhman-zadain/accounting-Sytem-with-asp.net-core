import { Injectable } from "@nestjs/common";

import type { AuthorizedUser } from "../../platform/auth/auth.types";
import {
  ClosePosSessionDto,
  CompletePosSaleDto,
  CreatePosReturnDto,
  HoldPosSaleDto,
  OpenPosSessionDto,
  PosReverseAccountingDto,
  PosReviewDecisionDto,
  SavePosDraftDto,
  SetPosFavoriteItemsDto,
  UpdatePosSettingsDto,
  VoidPosSaleDto,
  CorrectPaymentMethodDto,
} from "../pos/dto/pos.dto";
import { PosService } from "../pos/pos.service";
import { PosProduct } from "./pos-terminal.types";

@Injectable()
export class PosTerminalService {
  private readonly product = PosProduct.MARKET;

  constructor(private readonly posService: PosService) {}

  getActiveSession(user?: AuthorizedUser) {
    return this.posService.getActiveSession(user, this.product);
  }

  listDestinationMarkets(user?: AuthorizedUser) {
    return this.posService.listDestinationMarkets(user, this.product);
  }

  listMarketReceivables(
    query: { salesRepId?: string; search?: string; balanceOnly?: boolean },
    user?: AuthorizedUser,
  ) {
    return this.posService.listMarketReceivables(user, query, this.product);
  }

  listMarketReceivableInvoices(customerId: string, user?: AuthorizedUser) {
    return this.posService.listMarketReceivableInvoices(customerId, user, this.product);
  }

  getMarketReceivableDetail(customerId: string, user?: AuthorizedUser) {
    return this.posService.getMarketReceivableDetail(customerId, user, this.product);
  }

  getMarketReceivableStatement(
    customerId: string,
    query: { fromDate: string; toDate: string },
    user?: AuthorizedUser,
  ) {
    return this.posService.getMarketReceivableStatement(customerId, query, user, this.product);
  }

  getMarketRepStatement(
    query: {
      salesRepId?: string;
      customerId?: string;
      fromDate: string;
      toDate: string;
      documentTypes?: string;
      paymentTypes?: string;
    },
    user?: AuthorizedUser,
  ) {
    return this.posService.getMarketRepStatement(query, user, this.product);
  }

  listMarketReceivableSalesReps(user?: AuthorizedUser) {
    return this.posService.listMarketReceivableSalesReps(user, this.product);
  }

  collectMarketReceivables(
    dto: {
      customerId: string;
      receiptDate: string;
      amount: number;
      bankCashAccountId: string;
      description?: string;
      allocations?: Array<{ salesInvoiceId: string; amount: number }>;
    },
    user?: AuthorizedUser,
  ) {
    return this.posService.collectMarketReceivables(dto, user, this.product);
  }

  getSettings(user?: AuthorizedUser) {
    return this.posService.getSettings(user, this.product);
  }

  updateSettings(dto: UpdatePosSettingsDto, user?: AuthorizedUser) {
    return this.posService.updateSettings(dto, user, this.product);
  }

  listFavoriteItemIds(user?: AuthorizedUser) {
    return this.posService.listFavoriteItemIds(user, this.product);
  }

  setFavoriteItemIds(dto: SetPosFavoriteItemsDto, user?: AuthorizedUser) {
    return this.posService.setFavoriteItemIds(dto, user, this.product);
  }

  listSessions(user?: AuthorizedUser) {
    return this.posService.listSessions(user, this.product);
  }

  openSession(dto: OpenPosSessionDto, user?: AuthorizedUser) {
    return this.posService.openSession(dto, user, this.product);
  }

  closeSession(id: string, dto: ClosePosSessionDto, user?: AuthorizedUser) {
    return this.posService.closeSession(id, dto, user, this.product);
  }

  getSessionReport(id: string, user?: AuthorizedUser) {
    return this.posService.getSessionReport(id, user, this.product);
  }

  listHeldSales(sessionId: string, user?: AuthorizedUser) {
    return this.posService.listHeldSales(sessionId, user, this.product);
  }

  listDraftSales(sessionId: string, user?: AuthorizedUser) {
    return this.posService.listDraftSales(sessionId, user, this.product);
  }

  listCompletedSales(user?: AuthorizedUser) {
    return this.posService.listCompletedSales(user, this.product);
  }

  listPendingReview(user?: AuthorizedUser) {
    return this.posService.listPendingReview(user, this.product);
  }

  getReportsOverview(user?: AuthorizedUser) {
    return this.posService.getReportsOverview(user, this.product);
  }

  getSalesByPaymentMethodReport(user?: AuthorizedUser) {
    return this.posService.getSalesByPaymentMethodReport(user, this.product);
  }

  getSalesByCashierReport(user?: AuthorizedUser) {
    return this.posService.getSalesByCashierReport(user, this.product);
  }

  getSalesByBranchReport(user?: AuthorizedUser) {
    return this.posService.getSalesByBranchReport(user, this.product);
  }

  getSalesByItemReport(user?: AuthorizedUser) {
    return this.posService.getSalesByItemReport(user, this.product);
  }

  getInventoryImpactReport(user?: AuthorizedUser) {
    return this.posService.getInventoryImpactReport(user, this.product);
  }

  getTaxSummaryReport(user?: AuthorizedUser) {
    return this.posService.getTaxSummaryReport(user, this.product);
  }

  getTimeWindowReport(dto: { from: string; to: string }, user?: AuthorizedUser) {
    return this.posService.getTimeWindowReport(dto, user, this.product);
  }

  listReturns(user?: AuthorizedUser) {
    return this.posService.listReturns(user, this.product);
  }

  holdSale(dto: HoldPosSaleDto, user?: AuthorizedUser) {
    return this.posService.holdSale(dto, user, this.product);
  }

  saveDraft(dto: SavePosDraftDto, user?: AuthorizedUser) {
    return this.posService.saveDraft(dto, user, this.product);
  }

  completeSale(dto: CompletePosSaleDto, user?: AuthorizedUser) {
    return this.posService.completeSale(dto, user, this.product);
  }

  voidSale(id: string, dto: VoidPosSaleDto, user?: AuthorizedUser) {
    return this.posService.voidSale(id, dto, user, this.product);
  }

  approveAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    return this.posService.approveAccounting(id, dto, user, this.product);
  }

  approveSessionAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    return this.posService.approveSessionAccounting(id, dto, user, this.product);
  }

  rejectSessionAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    return this.posService.rejectSessionAccounting(id, dto, user, this.product);
  }

  rejectAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    return this.posService.rejectAccounting(id, dto, user, this.product);
  }

  reverseAccounting(id: string, dto: PosReverseAccountingDto, user?: AuthorizedUser) {
    return this.posService.reverseAccounting(id, dto, user, this.product);
  }

  correctPaymentMethod(id: string, dto: CorrectPaymentMethodDto, user?: AuthorizedUser) {
    return this.posService.correctPaymentMethod(id, dto, user, this.product);
  }

  reprintReceipt(id: string, user?: AuthorizedUser) {
    return this.posService.reprintReceipt(id, user, this.product);
  }

  printSessionRollReport(
    id: string,
    printType: "SESSION_ROLL_REPORT" | "INVOICE_LIST_ROLL" | "ALL_RECEIPTS_ROLL",
    user?: AuthorizedUser,
  ) {
    return this.posService.printSessionRollReport(id, printType, user, this.product);
  }

  createReturn(dto: CreatePosReturnDto, user?: AuthorizedUser) {
    return this.posService.createReturn(dto, user, this.product);
  }

  approveReturnAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    return this.posService.approveReturnAccounting(id, dto, user, this.product);
  }

  rejectReturnAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    return this.posService.rejectReturnAccounting(id, dto, user, this.product);
  }

  reverseReturnAccounting(id: string, dto: PosReverseAccountingDto, user?: AuthorizedUser) {
    return this.posService.reverseReturnAccounting(id, dto, user, this.product);
  }
}
