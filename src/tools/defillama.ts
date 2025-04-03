import { tool } from 'ai';
import { z } from 'zod';

import { APITool } from './tool';
import { logger } from '../logger/winston';

export const DEFILLAMA_BASE_URL = 'https://coins.llama.fi';
const MIN_CONFIDENCE = 0.8;

const TokenDataSchema = z.object({
  decimals: z.number().optional(),
  symbol: z.string(),
  price: z.number(),
  timestamp: z.number(),
  confidence: z.number(),
});

const DefiLlamaPriceResponseSchema = z.object({
  coins: z.record(z.string(), TokenDataSchema),
});

const PricePointSchema = z.object({
  timestamp: z.number(),
  price: z.number(),
});

const DefiLlamaChartResponseSchema = z.object({
  coins: z.record(
    z.string(),
    z.object({
      symbol: z.string(),
      confidence: z.number(),
      decimals: z.number().optional(),
      prices: z.array(PricePointSchema),
    })
  ),
});

const SearchWidthParamSchema = z
  .string()
  .optional()
  .default('6h')
  .describe(
    "Time range on either side to find price data. Accepts candle notation: W (week), D (day), H (hour), M (minute). Examples: '4h', '1d', '30m'."
  );

const TokenIdentifierSchema = z
  .string()
  .describe(
    "Token identifier in format {chain}:{address} (e.g., 'ethereum:0x...') or for native tokens use coingecko:{chain} (e.g., 'coingecko:ethereum', 'coingecko:bitcoin')"
  );

const GetTokenPriceToolSchema = {
  name: 'get_token_price',
  description:
    'Fetches token prices from DefiLlama using chain and token addresses in the format {chain}:{address}. If no token address and chain is provided, try get_cmc_token_map tool to retrieve the token available networks and addresses.',
  parameters: z.object({
    coins: z.array(TokenIdentifierSchema),
    searchWidth: SearchWidthParamSchema,
  }),
  execute: async (args: { coins: string[]; searchWidth?: string }) => {
    const tool = new CurrentPriceExecutor();
    return tool.execute(args);
  },
};

const GetHistoricalTokenPriceToolSchema = {
  name: 'get_historical_token_price',
  description: 'Fetches historical token prices from DefiLlama for specified tokens at a given timestamp',
  parameters: z.object({
    coins: z.array(TokenIdentifierSchema),
    timestamp: z.number().describe('UNIX timestamp of time when you want historical prices'),
    searchWidth: SearchWidthParamSchema,
  }),
  execute: async (args: { coins: string[]; timestamp: number; searchWidth?: string }) => {
    const tool = new HistoricalPriceExecutor();
    return tool.execute(args);
  },
};

const GetTokenPriceChartToolSchema = {
  name: 'get_token_price_chart',
  description: 'Fetches token price charts from DefiLlama with regular time intervals',
  parameters: z.object({
    coins: z.array(TokenIdentifierSchema),
    start: z.number().describe('UNIX timestamp of earliest data point requested. Use either start OR end, not both.'),
    end: z
      .number()
      .optional()
      .describe(
        'UNIX timestamp of latest data point requested. Note: If both start and end are provided, start will be used and end will be ignored.'
      ),
    span: z.number().optional().describe('Number of data points to return, defaults to 0'),
    period: z
      .string()
      .optional()
      .describe(
        "DIFFERENT from searchWidth: Time interval between data points (sampling frequency). Defaults to 24 hours. Examples: '1d', '12h'."
      ),
    searchWidth: z
      .string()
      .optional()
      .describe(
        "DIFFERENT from period: Buffer time around each data point to find price. Defaults to 10% of period. Examples: '600' (seconds), '1h'."
      ),
  }),
  execute: async (args: {
    coins: string[];
    start: number;
    end?: number;
    span?: number;
    period?: string;
    searchWidth?: string;
  }) => {
    const tool = new ChartExecutor();
    return tool.execute(args);
  },
};

const DefiLlamaPercentageResponseSchema = z.object({
  coins: z.record(z.string(), z.number()),
});

const GetTokenPricePercentageChangeToolSchema = {
  name: 'get_token_price_percentage_change',
  description: 'Fetches percentage change in token prices over specified time period',
  parameters: z.object({
    coins: z.array(TokenIdentifierSchema),
    timestamp: z.number().optional().describe('UNIX timestamp of reference point, defaults to current time'),
    lookForward: z
      .boolean()
      .optional()
      .default(false)
      .describe('Whether to look forward from timestamp (true) or backward (false)'),
    period: z
      .string()
      .optional()
      .describe("Time period for percentage calculation. Examples: '1d', '3w', '1m'. Defaults to 24 hours."),
  }),
  execute: async (args: { coins: string[]; timestamp?: number; lookForward?: boolean; period?: string }) => {
    const tool = new PercentageExecutor();
    return tool.execute(args);
  },
};

abstract class DefiLlamaExecutor {
  protected async fetchFromDefiLlama(url: string): Promise<any> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    return response.json();
  }

  protected async withErrorHandling<T>(operation: string, action: () => Promise<T>): Promise<T | string> {
    try {
      return await action();
    } catch (error) {
      logger.error(`Error executing ${operation}`, error);
      return `Error executing ${operation} tool`;
    }
  }

  abstract execute(args: any): Promise<any>;
}

class CurrentPriceExecutor extends DefiLlamaExecutor {
  async execute(args: { coins: string[]; searchWidth?: string }) {
    return this.withErrorHandling('get_token_price', async () => {
      const url = this.buildUrl(args);
      const data = await this.fetchFromDefiLlama(url);
      const parsedResponse = DefiLlamaPriceResponseSchema.parse(data);
      return this.parseResult(parsedResponse);
    });
  }

  private buildUrl(params: { coins: string[]; searchWidth?: string }): string {
    const searchWidth = params.searchWidth || '4h';
    const coinsString = params.coins.join(',');
    return `${DEFILLAMA_BASE_URL}/prices/current/${coinsString}?searchWidth=${searchWidth}`;
  }

  private parseResult(parsedResponse: z.infer<typeof DefiLlamaPriceResponseSchema>) {
    const results = Object.entries(parsedResponse.coins).map(([tokenKey, tokenData]) => {
      if (tokenData.confidence < MIN_CONFIDENCE) {
        return {
          token: tokenKey,
          error: `Price data has low confidence (${tokenData.confidence})`,
        };
      }

      return {
        token: tokenKey,
        symbol: tokenData.symbol,
        price: tokenData.price,
        decimals: tokenData.decimals,
        timestamp: tokenData.timestamp,
        confidence: tokenData.confidence,
      };
    });

    return { prices: results };
  }
}

class HistoricalPriceExecutor extends DefiLlamaExecutor {
  async execute(args: { coins: string[]; timestamp: number; searchWidth?: string }) {
    return this.withErrorHandling('get_historical_token_price', async () => {
      const url = this.buildUrl(args);
      const data = await this.fetchFromDefiLlama(url);
      const parsedResponse = DefiLlamaPriceResponseSchema.parse(data);
      return this.parseResult(parsedResponse);
    });
  }

  private buildUrl(params: { coins: string[]; timestamp?: number; searchWidth?: string }) {
    const searchWidth = params.searchWidth || '4h';
    const coinsString = params.coins.join(',');
    const timestampSegment = params.timestamp ? `/${params.timestamp}` : '';
    return `${DEFILLAMA_BASE_URL}/prices/historical${timestampSegment}/${coinsString}?searchWidth=${searchWidth}`;
  }

  private parseResult(parsedResponse: z.infer<typeof DefiLlamaPriceResponseSchema>) {
    const results = Object.entries(parsedResponse.coins).map(([tokenKey, tokenData]) => {
      if (tokenData.confidence < MIN_CONFIDENCE) {
        return {
          token: tokenKey,
          error: `Price data has low confidence (${tokenData.confidence})`,
        };
      }

      return {
        token: tokenKey,
        symbol: tokenData.symbol,
        price: tokenData.price,
        decimals: tokenData.decimals,
        timestamp: tokenData.timestamp,
        confidence: tokenData.confidence,
      };
    });

    return { prices: results };
  }
}

class ChartExecutor extends DefiLlamaExecutor {
  async execute(args: {
    coins: string[];
    start: number;
    end?: number;
    span?: number;
    period?: string;
    searchWidth?: string;
  }) {
    return this.withErrorHandling('get_token_price_chart', async () => {
      const params = { ...args };
      if (params.start && params.end) {
        params.end = undefined; // Ignore end if start is provided
      }

      const url = this.buildChartUrl(params);
      const data = await this.fetchFromDefiLlama(url);
      const parsedResponse = DefiLlamaChartResponseSchema.parse(data);
      const tokens = this.parseResult(parsedResponse);

      return { tokens };
    });
  }

  private parseResult(parsedResponse: {
    coins: Record<
      string,
      {
        symbol: string;
        confidence: number;
        prices: { price: number; timestamp: number }[];
        decimals?: number | undefined;
      }
    >;
  }) {
    return Object.entries(parsedResponse.coins).map(([tokenKey, tokenData]) => {
      const result: any = {
        token: tokenKey,
        symbol: tokenData.symbol,
        confidence: tokenData.confidence,
        prices: tokenData.prices,
      };

      if (tokenData.decimals !== undefined) {
        result.decimals = tokenData.decimals;
      }

      if (tokenData.confidence < MIN_CONFIDENCE) {
        result.error = `Price data has low confidence (${tokenData.confidence})`;
      }

      return result;
    });
  }

  private buildChartUrl(params: {
    coins: string[];
    start: number;
    end?: number;
    span?: number;
    period?: string;
    searchWidth?: string;
  }): string {
    const coinsString = params.coins.join(',');

    const queryParams = new URLSearchParams();
    queryParams.append('start', params.start.toString());

    if (params.end) {
      queryParams.append('end', params.end.toString());
    }

    if (params.span) {
      queryParams.append('span', params.span.toString());
    }

    if (params.period) {
      queryParams.append('period', params.period);
    }

    if (params.searchWidth) {
      queryParams.append('searchWidth', params.searchWidth);
    }

    return `${DEFILLAMA_BASE_URL}/chart/${coinsString}?${queryParams.toString()}`;
  }
}

class PercentageExecutor extends DefiLlamaExecutor {
  async execute(args: { coins: string[]; timestamp?: number; lookForward?: boolean; period?: string }) {
    return this.withErrorHandling('get_token_price_percentage_change', async () => {
      const url = this.buildPercentageUrl(args);
      const response = await this.fetchFromDefiLlama(url);
      const parsedResponse = DefiLlamaPercentageResponseSchema.parse(response);
      const changes = this.parseResult(parsedResponse);

      return { changes };
    });
  }

  private parseResult(parsedResponse: { coins: Record<string, number> }) {
    return Object.entries(parsedResponse.coins).map(([token, percentageChange]) => ({
      token,
      percentageChange,
    }));
  }

  private buildPercentageUrl(params: {
    coins: string[];
    timestamp?: number;
    lookForward?: boolean;
    period?: string;
  }): string {
    const coinsString = params.coins.join(',');

    const queryParams = new URLSearchParams();

    if (params.timestamp) {
      queryParams.append('timestamp', params.timestamp.toString());
    }

    if (params.lookForward !== undefined) {
      queryParams.append('lookForward', params.lookForward.toString());
    }

    if (params.period) {
      queryParams.append('period', params.period);
    }

    const queryString = queryParams.toString();
    return `${DEFILLAMA_BASE_URL}/percentage/${coinsString}${queryString ? '?' + queryString : ''}`;
  }
}

export class DefiLlamaTool extends APITool<{
  coins: string[];
  searchWidth?: string;
}> {
  private static readonly currentExecutor = new CurrentPriceExecutor();

  schema = [
    {
      name: GetTokenPriceToolSchema.name,
      tool: tool(GetTokenPriceToolSchema),
    },
    {
      name: GetHistoricalTokenPriceToolSchema.name,
      tool: tool(GetHistoricalTokenPriceToolSchema),
    },
    {
      name: GetTokenPriceChartToolSchema.name,
      tool: tool(GetTokenPriceChartToolSchema),
    },
    {
      name: GetTokenPricePercentageChangeToolSchema.name,
      tool: tool(GetTokenPricePercentageChangeToolSchema),
    },
  ];

  constructor() {
    super({
      name: GetTokenPriceToolSchema.name,
      description: GetTokenPriceToolSchema.description,
      baseUrl: DEFILLAMA_BASE_URL,
    });
  }

  async getRawData(params: { coins: string[]; searchWidth?: string }) {
    return DefiLlamaTool.currentExecutor.execute(params);
  }
}
