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
import {
  CreateRepCarLoadDto,
  CreateRepCarStocktakeDto,
  CreateRepCarTransferDto,
  CreateRepCarUnloadDto,
  UpdateRepCarLoadDto,
  UpdateRepCarStocktakeDto,
  UpdateRepCarTransferDto,
  UpdateRepCarUnloadDto,
} from "./rep-car-stock/dto/rep-car-stock.dto";
import { RepCarLoadService } from "./rep-car-stock/rep-car-load.service";
import { MarketStockOverviewService } from "./rep-car-stock/market-stock-overview.service";
import { RepCarStockService } from "./rep-car-stock/rep-car-stock.service";
import { RepCarStocktakeService } from "./rep-car-stock/rep-car-stocktake.service";
import { RepCarTransferService } from "./rep-car-stock/rep-car-transfer.service";
import { RepCarUnloadService } from "./rep-car-stock/rep-car-unload.service";

@Injectable()
export class PosMarketService {
  constructor(
    private readonly terminal: PosTerminalService,
    private readonly repCarStockService: RepCarStockService,
    private readonly repCarLoadService: RepCarLoadService,
    private readonly repCarUnloadService: RepCarUnloadService,
    private readonly repCarStocktakeService: RepCarStocktakeService,
    private readonly repCarTransferService: RepCarTransferService,
    private readonly marketStockOverviewService: MarketStockOverviewService,
  ) {}

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
    query: { salesRepId?: string; search?: string; balanceOnly?: boolean },
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

  getMarketReceivableStatement(
    customerId: string,
    query: { fromDate: string; toDate: string },
    user?: AuthorizedUser,
  ) {
    return this.terminal.getMarketReceivableStatement(customerId, query, user);
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
    return this.terminal.getMarketRepStatement(query, user);
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

  listMarketSalesReps() {
    return this.repCarStockService.listActiveSalesReps();
  }

  getMarketCatalog(salesRepId: string, user?: AuthorizedUser) {
    return this.repCarStockService.getMarketCatalog(salesRepId, user);
  }

  listRepCarStock(salesRepId: string, user?: AuthorizedUser) {
    return this.repCarStockService.listBalances(salesRepId, user);
  }

  listRepCarStockMovements(
    query: {
      salesRepId?: string;
      itemId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: string;
      limit?: string;
    },
    user?: AuthorizedUser,
  ) {
    return this.repCarStockService.listMovements(query, user);
  }

  listRepCarLoads(
    query: {
      status?: string;
      salesRepId?: string;
      warehouseId?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      page?: string;
      limit?: string;
    },
    user?: AuthorizedUser,
  ) {
    return this.repCarLoadService.list(query, user);
  }

  getRepCarLoad(id: string, user?: AuthorizedUser) {
    return this.repCarLoadService.getById(id, user);
  }

  createRepCarLoad(dto: CreateRepCarLoadDto, user?: AuthorizedUser) {
    return this.repCarLoadService.create(dto, user);
  }

  updateRepCarLoad(id: string, dto: UpdateRepCarLoadDto, user?: AuthorizedUser) {
    return this.repCarLoadService.update(id, dto, user);
  }

  postRepCarLoad(id: string, user?: AuthorizedUser) {
    return this.repCarLoadService.post(id, user);
  }

  cancelRepCarLoad(id: string, user?: AuthorizedUser) {
    return this.repCarLoadService.cancel(id, user);
  }

  reverseRepCarLoad(id: string, user?: AuthorizedUser) {
    return this.repCarLoadService.reverse(id, user);
  }

  getStockOverview(
    query: { search?: string; itemId?: string; hideZero?: string },
    user?: AuthorizedUser,
  ) {
    return this.marketStockOverviewService.getOverview(query, user);
  }

  listRepCarUnloads(
    query: {
      status?: string;
      salesRepId?: string;
      warehouseId?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      page?: string;
      limit?: string;
    },
    user?: AuthorizedUser,
  ) {
    return this.repCarUnloadService.list(query, user);
  }

  getRepCarUnload(id: string, user?: AuthorizedUser) {
    return this.repCarUnloadService.getById(id, user);
  }

  createRepCarUnload(dto: CreateRepCarUnloadDto, user?: AuthorizedUser) {
    return this.repCarUnloadService.create(dto, user);
  }

  updateRepCarUnload(id: string, dto: UpdateRepCarUnloadDto, user?: AuthorizedUser) {
    return this.repCarUnloadService.update(id, dto, user);
  }

  postRepCarUnload(id: string, user?: AuthorizedUser) {
    return this.repCarUnloadService.post(id, user);
  }

  cancelRepCarUnload(id: string, user?: AuthorizedUser) {
    return this.repCarUnloadService.cancel(id, user);
  }

  listRepCarTransfers(
    query: {
      status?: string;
      fromSalesRepId?: string;
      toSalesRepId?: string;
      salesRepId?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      page?: string;
      limit?: string;
    },
    user?: AuthorizedUser,
  ) {
    return this.repCarTransferService.list(query, user);
  }

  getRepCarTransfer(id: string, user?: AuthorizedUser) {
    return this.repCarTransferService.getById(id, user);
  }

  createRepCarTransfer(dto: CreateRepCarTransferDto, user?: AuthorizedUser) {
    return this.repCarTransferService.create(dto, user);
  }

  updateRepCarTransfer(id: string, dto: UpdateRepCarTransferDto, user?: AuthorizedUser) {
    return this.repCarTransferService.update(id, dto, user);
  }

  postRepCarTransfer(id: string, user?: AuthorizedUser) {
    return this.repCarTransferService.post(id, user);
  }

  cancelRepCarTransfer(id: string, user?: AuthorizedUser) {
    return this.repCarTransferService.cancel(id, user);
  }

  reverseRepCarTransfer(id: string, user?: AuthorizedUser) {
    return this.repCarTransferService.reverse(id, user);
  }

  listRepCarStocktakes(
    query: {
      status?: string;
      salesRepId?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      page?: string;
      limit?: string;
    },
    user?: AuthorizedUser,
  ) {
    return this.repCarStocktakeService.list(query, user);
  }

  getRepCarStocktake(id: string, user?: AuthorizedUser) {
    return this.repCarStocktakeService.getById(id, user);
  }

  createRepCarStocktake(dto: CreateRepCarStocktakeDto, user?: AuthorizedUser) {
    return this.repCarStocktakeService.create(dto, user);
  }

  updateRepCarStocktake(id: string, dto: UpdateRepCarStocktakeDto, user?: AuthorizedUser) {
    return this.repCarStocktakeService.update(id, dto, user);
  }

  postRepCarStocktake(id: string, user?: AuthorizedUser) {
    return this.repCarStocktakeService.post(id, user);
  }

  cancelRepCarStocktake(id: string, user?: AuthorizedUser) {
    return this.repCarStocktakeService.cancel(id, user);
  }
}
