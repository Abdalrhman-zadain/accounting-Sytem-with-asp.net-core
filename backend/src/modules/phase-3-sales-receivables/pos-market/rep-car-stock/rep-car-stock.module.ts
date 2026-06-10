import { Module } from "@nestjs/common";

import { AuditModule } from "../../../phase-1-accounting-foundation/accounting-core/audit/audit.module";
import { ItemMasterModule } from "../../../phase-5-inventory-management/inventory/item-master/item-master.module";
import { InventoryPostingModule } from "../../../phase-5-inventory-management/inventory/shared/inventory-posting.module";
import { WarehousesModule } from "../../../phase-5-inventory-management/inventory/warehouses/warehouses.module";
import { RepCarLoadService } from "./rep-car-load.service";
import { RepCarStockService } from "./rep-car-stock.service";
import { RepCarStocktakeService } from "./rep-car-stocktake.service";

@Module({
  imports: [AuditModule, ItemMasterModule, WarehousesModule, InventoryPostingModule],
  providers: [RepCarStockService, RepCarLoadService, RepCarStocktakeService],
  exports: [RepCarStockService, RepCarLoadService, RepCarStocktakeService],
})
export class RepCarStockModule {}
