import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrenciesService } from './currencies.service';

@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly service: CurrenciesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(
    @Body()
    dto: {
      code: string;
      name?: string;
      nameAr?: string;
      symbol?: string;
      decimalPlaces?: number;
      isBase?: boolean;
    },
  ) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    dto: {
      code?: string;
      name?: string;
      nameAr?: string;
      symbol?: string;
      decimalPlaces?: number;
      isActive?: boolean;
      isBase?: boolean;
    },
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
