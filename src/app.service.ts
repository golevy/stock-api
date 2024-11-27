import { Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  StockQuote,
  CompanyOverview,
  StockResponse,
  Stock,
} from './stock.interface';

@Injectable()
export class StockService {
  private readonly API_KEY = 'WEQGVELPMJ086QXP';
  private readonly BASE_URL = 'https://www.alphavantage.co/query';
  private readonly CACHE_TIME = 5 * 60 * 1000; // 5 minutes
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  private async withRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 2000,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.withRetry(fn, retries - 1, delay * 1.5);
    }
  }

  private getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TIME) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async getStockQuote(symbol: string): Promise<StockQuote> {
    const cacheKey = `quote_${symbol}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const fetchQuote = async () => {
      const response = await axios.get(this.BASE_URL, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol,
          apikey: this.API_KEY,
        },
        timeout: 5000,
      });

      const quote = response.data['Global Quote'];
      if (!quote || !quote['05. price']) {
        throw new Error(`Failed to get data for ${symbol}`);
      }

      const data: StockQuote = {
        symbol,
        price: parseFloat(quote['05. price']).toFixed(2),
        change: parseFloat(quote['09. change']).toFixed(2),
        changePercent: quote['10. change percent'].replace('%', '') + '%',
        volume: parseInt(quote['06. volume']),
        high: parseFloat(quote['03. high']).toFixed(2),
        low: parseFloat(quote['04. low']).toFixed(2),
        time: quote['07. latest trading day'],
      };

      this.setCache(cacheKey, data);
      return data;
    };

    return this.withRetry(fetchQuote);
  }

  private async getCompanyOverview(symbol: string): Promise<CompanyOverview> {
    const cacheKey = `overview_${symbol}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const fetchOverview = async () => {
      const response = await axios.get(this.BASE_URL, {
        params: {
          function: 'OVERVIEW',
          symbol,
          apikey: this.API_KEY,
        },
        timeout: 5000,
      });

      if (!response.data || !response.data.MarketCapitalization) {
        throw new Error(`Failed to get company info for ${symbol}`);
      }

      const data: CompanyOverview = {
        mktcap:
          (parseFloat(response.data.MarketCapitalization) / 1000000000).toFixed(
            2,
          ) + 'B',
        name: response.data.Name,
        industry: response.data.Industry,
        sector: response.data.Sector,
      };

      this.setCache(cacheKey, data);
      return data;
    };

    return this.withRetry(fetchOverview);
  }

  async getStocks(): Promise<StockResponse> {
    const symbols = ['MSFT', 'AAPL', 'NVDA', 'GOOG'];
    try {
      const stocks: Stock[] = [];

      for (const symbol of symbols) {
        try {
          const [quoteData, overviewData] = await Promise.all([
            this.getStockQuote(symbol),
            this.getCompanyOverview(symbol),
          ]);

          stocks.push({
            ...quoteData,
            ...overviewData,
          });

          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error processing ${symbol} data:`, error);

          const cachedQuote = this.getCache(`quote_${symbol}`);
          const cachedOverview = this.getCache(`overview_${symbol}`);

          if (cachedQuote && cachedOverview) {
            stocks.push({
              ...cachedQuote,
              ...cachedOverview,
              fromCache: true,
            });
          }
        }
      }

      if (stocks.length === 0) {
        throw new Error('No stock data retrieved');
      }

      stocks.sort((a, b) => {
        const mktcapA = parseFloat(a.mktcap);
        const mktcapB = parseFloat(b.mktcap);
        return mktcapB - mktcapA;
      });

      return {
        code: 0,
        message: 'success',
        data: {
          top1: stocks[0],
          msft: stocks.find((stock) => stock.symbol === 'MSFT') || null,
          stocks,
          timestamp: Date.now(),
          dataSource: 'Alpha Vantage',
        },
      };
    } catch (error) {
      console.error('Failed to fetch stock data:', error);
      return {
        code: -1,
        message: error.message || 'Failed to fetch stock data',
        data: null,
      };
    }
  }
}
