export interface StockQuote {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  volume: number;
  high: string;
  low: string;
  time: string;
}

export interface CompanyOverview {
  mktcap: string;
  name: string;
  industry: string;
  sector: string;
}

export interface Stock extends StockQuote, CompanyOverview {
  fromCache?: boolean;
}

export interface StockResponse {
  code: number;
  message: string;
  data: {
    top1: Stock;
    msft: Stock | null;
    stocks: Stock[];
    timestamp: number;
    dataSource: string;
  } | null;
}
