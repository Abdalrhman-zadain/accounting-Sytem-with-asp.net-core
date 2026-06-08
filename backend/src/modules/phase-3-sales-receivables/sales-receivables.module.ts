import { Module } from '@nestjs/common';

import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../phase-1-accounting-foundation/accounting-core/audit/audit.module';
import { BankCashTransactionsModule } from '../phase-2-bank-cash-management/bank-cash-transactions/bank-cash-transactions.module';
import { ChartOfAccountsModule } from '../phase-1-accounting-foundation/accounting-core/chart-of-accounts/chart-of-accounts.module';
import { JournalEntriesModule } from '../phase-1-accounting-foundation/accounting-core/journal-entries/journal-entries.module';
import { PostingLogicModule } from '../phase-1-accounting-foundation/accounting-core/posting-logic/posting-logic.module';
import { ReversalControlModule } from '../phase-1-accounting-foundation/accounting-core/reversal-control/reversal-control.module';
import { InventoryPostingModule } from '../phase-5-inventory-management/inventory/shared/inventory-posting.module';
import { PosController } from './pos/pos.controller';
import { PosTableController } from './pos/pos-table.controller';
import { PosKitchenController } from './pos/pos-kitchen.controller';
import { PosWaiterOrdersController } from './pos/pos-waiter-orders.controller';
import { PosAddonController } from './pos/pos-addon.controller';
import { PosAddonService } from './pos/pos-addon.service';
import { PosService } from './pos/pos.service';
import { SalesReceivablesController } from './sales-receivables.controller';
import { SalesReceivablesService } from './sales-receivables.service';

@Module({
  imports: [PrismaModule, AuditModule, BankCashTransactionsModule, ChartOfAccountsModule, JournalEntriesModule, PostingLogicModule, ReversalControlModule, InventoryPostingModule],
  controllers: [
    SalesReceivablesController,
    PosController,
    PosTableController,
    PosKitchenController,
    PosWaiterOrdersController,
    PosAddonController,
  ],
  providers: [SalesReceivablesService, PosService, PosAddonService],
  exports: [SalesReceivablesService, PosService, PosAddonService],
})
export class SalesReceivablesModule {}
