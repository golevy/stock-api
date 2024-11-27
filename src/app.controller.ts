import { Controller, Get } from '@nestjs/common';
import { StockService } from './app.service';
import { StockResponse } from './stock.interface';

@Controller('stocks')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  async getStocks(): Promise<StockResponse> {
    return this.stockService.getStocks();
  }
}
