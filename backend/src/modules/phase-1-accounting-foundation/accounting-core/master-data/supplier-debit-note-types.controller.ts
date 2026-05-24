import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateSupplierDebitNoteTypeDto,
  UpdateSupplierDebitNoteTypeDto,
} from './supplier-debit-note-types.dto';
import { SupplierDebitNoteTypesService } from './supplier-debit-note-types.service';

@Controller('supplier-debit-note-types')
export class SupplierDebitNoteTypesController {
  constructor(private readonly service: SupplierDebitNoteTypesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('active')
  listActive() {
    return this.service.listActive();
  }

  @Post()
  create(@Body() dto: CreateSupplierDebitNoteTypeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDebitNoteTypeDto) {
    return this.service.update(id, dto);
  }
}
