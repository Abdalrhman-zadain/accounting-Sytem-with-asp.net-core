import { Injectable } from "@nestjs/common";

import type { AuthorizedUser } from "../../platform/auth/auth.types";
import { PosTerminalService } from "../pos-core/pos-terminal.service";
import {
  ClosePosSessionDto,
  CollectMarketReceivablesDto,
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
} from "./dto/pos-market.dto";

@Injectable()
export class PosMarketService {
  constructor(private readonly terminal: PosTerminalService) {}

  getHealth(user: AuthorizedUser) {
    return {
      product: "market",
      status: "ok",
      username: user.username,
      message: "Market POS API is ready.",
    };
  }

  getActiveSession(user?: AuthorizedUser) {
    return this.terminal.getActiveSession(user);
  }

  listDestinationMarkets(user?: AuthorizedUser) {
    return this.terminal.listDestinationMarkets(user);
  }

  listMarketReceivables(
    query: { salesRepId?: string; search?: string },
    user?: AuthorizedUser,
  ) {
    return this.terminal.listMarketReceivables(query, user);
  }

  listMarketReceivableInvoices(customerId: string, user?: AuthorizedUser) {
    return this.terminal.listMarketReceivableInvoices(customerId, user);
  }

  getMarketReceivableDetail(customerId: string, user?: AuthorizedUser) {
    return this.terminal.getMarketReceivableDetail(customerId, user);
  }

  listMarketReceivableSalesReps(user?: AuthorizedUser) {
    return this.terminal.listMarketReceivableSalesReps(user);
  }

  collectMarketReceivables(dto: CollectMarketReceivablesDto, user?: AuthorizedUser) {
    return this.terminal.collectMarketReceivables(dto, user);
  }

  getSettings(user?: AuthorizedUser) {
    return this.terminal.getSettings(user);
  }

  updateSettings(dto: UpdatePosSettingsDto, user?: AuthorizedUser) {
    return this.terminal.updateSettings(dto, user);
  }

  listFavoriteItemIds(user?: AuthorizedUser) {
    return this.terminal.listFavoriteItemIds(user);
  }

  setFavoriteItemIds(dto: SetPosFavoriteItemsDto, user?: AuthorizedUser) {
    return this.terminal.setFavoriteItemIds(dto, user);
  }

  listSessions(user?: AuthorizedUser) {
    return this.terminal.listSessions(user);
  }

  openSession(dto: OpenPosSessionDto, user?: AuthorizedUser) {
    return this.terminal.openSession(dto, user);
  }

  closeSession(id: string, dto: ClosePosSessionDto, user?: AuthorizedUser) {
    return this.terminal.closeSession(id, dto, user);
  }

  getSessionReport(id: string, user?: AuthorizedUser) {
    return this.terminal.getSessionReport(id, user);
  }

  listHeldSales(sessionId: string, user?: AuthorizedUser) {
    return this.terminal.listHeldSales(sessionId, user);
  }

  listDraftSales(sessionId: string, user?: AuthorizedUser) {
    return this.terminal.listDraftSales(sessionId, user);
  }

  listCompletedSales(user?: AuthorizedUser) {
    return this.terminal.listCompletedSales(user);
  }

  listPendingReview(user?: AuthorizedUser) {
    return this.terminal.listPendingReview(user);
  }

  getReportsOverview(user?: AuthorizedUser) {
    return this.terminal.getReportsOverview(user);
  }

  getSalesByPaymentMethodReport(user?: AuthorizedUser) {
    return this.terminal.getSalesByPaymentMethodReport(user);
  }

  getSalesByCashierReport(user?: AuthorizedUser) {
    return this.terminal.getSalesByCashierReport(user);
  }

  getSalesByBranchReport(user?: AuthorizedUser) {
    return this.terminal.getSalesByBranchReport(user);
  }

  getSalesByItemReport(user?: AuthorizedUser) {
    return this.terminal.getSalesByItemReport(user);
  }

  getInventoryImpactReport(user?: AuthorizedUser) {
    return this.terminal.getInventoryImpactReport(user);
  }

  getTaxSummaryReport(user?: AuthorizedUser) {
    return this.terminal.getTaxSummaryReport(user);
  }

  getTimeWindowReport(dto: { from: string; to: string }, user?: AuthorizedUser) {
    return this.terminal.getTimeWindowReport(dto, user);
  }

  listReturns(user?: AuthorizedUser) {
    return this.terminal.listReturns(user);
  }

  holdSale(dto: HoldPosSaleDto, user?: AuthorizedUser) {
    return this.terminal.holdSale(dto, user);
  }

  saveDraft(dto: SavePosDraftDto, user?: AuthorizedUser) {
    return this.terminal.saveDraft(dto, user);
  }

  completeSale(dto: CompletePosSaleDto, user?: AuthorizedUser) {
    return this.terminal.completeSale(dto, user);
  }

  voidSale(id: string, dto: VoidPosSaleDto, user?: AuthorizedUser) {
    return this.terminal.voidSale(id, dto, user);
  }

  approveAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    return this.terminal.approveAccounting(id, dto, user);
  }

  approveSessionAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    return this.terminal.approveSessionAccounting(id, dto, user);
  }

  rejectSessionAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    return this.terminal.rejectSessionAccounting(id, dto, user);
  }

  rejectAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    return this.terminal.rejectAccounting(id, dto, user);
  }

  reverseAccounting(id: string, dto: PosReverseAccountingDto, user?: AuthorizedUser) {
    return this.terminal.reverseAccounting(id, dto, user);
  }

  correctPaymentMethod(id: string, dto: CorrectPaymentMethodDto, user?: AuthorizedUser) {
    return this.terminal.correctPaymentMethod(id, dto, user);
  }

  reprintReceipt(id: string, user?: AuthorizedUser) {
    return this.terminal.reprintReceipt(id, user);
  }

  printSessionRollReport(
    id: string,
    printType: "SESSION_ROLL_REPORT" | "INVOICE_LIST_ROLL" | "ALL_RECEIPTS_ROLL",
    user?: AuthorizedUser,
  ) {
    return this.terminal.printSessionRollReport(id, printType, user);
  }

  createReturn(dto: CreatePosReturnDto, user?: AuthorizedUser) {
    return this.terminal.createReturn(dto, user);
  }

  approveReturnAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    return this.terminal.approveReturnAccounting(id, dto, user);
  }

  rejectReturnAccounting(id: string, dto: PosReviewDecisionDto, user?: AuthorizedUser) {
    return this.terminal.rejectReturnAccounting(id, dto, user);
  }

  reverseReturnAccounting(id: string, dto: PosReverseAccountingDto, user?: AuthorizedUser) {
    return this.terminal.reverseReturnAccounting(id, dto, user);
  }
}
