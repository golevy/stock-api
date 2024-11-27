import { Module } from '@nestjs/common';
import { StockController } from './app.controller';
import { StockService } from './app.service';

@Module({
  imports: [],
  controllers: [StockController],
  providers: [StockService],
})
export class AppModule {}
