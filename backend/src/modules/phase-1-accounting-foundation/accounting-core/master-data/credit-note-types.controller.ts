import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../platform/auth/guards/jwt-auth.guard';
import { CreateCreditNoteTypeDto, UpdateCreditNoteTypeDto } from './credit-note-types.dto';
import { CreditNoteTypesService } from './credit-note-types.service';

@UseGuards(JwtAuthGuard)
@Controller('credit-note-types')
export class CreditNoteTypesController {
  constructor(private readonly service: CreditNoteTypesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('active')
  listActive() {
    return this.service.listActive();
  }

  @Post()
  create(@Body() dto: CreateCreditNoteTypeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCreditNoteTypeDto) {
    return this.service.update(id, dto);
  }
}
