import { z } from "zod";
import { tool } from "ai";
import { APITool } from "./tool";
import { logger } from "../logger/winston";

export const DEFILLAMA_BASE_URL = "https://coins.llama.fi";
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
  .default("6h")
  .describe(
    "Time range on either side to find price data. Accepts candle notation: W (week), D (day), H (hour), M (minute). Examples: '4h', '1d', '30m'."
  );

const TokenIdentifierSchema = z
  .string()
  .describe(
    "Token identifier in format {chain}:{address} (e.g., 'ethereum:0x...') or for native tokens use coingecko:{chain} (e.g., 'coingecko:ethereum', 'coingecko:bitcoin')"
  );

const GetTokenPriceToolSchema = {
  name: "get_token_price",
  description:
    "Fetches token prices from DefiLlama using chain and token addresses in the format {chain}:{address}. If no token address and chain is provided, try get_cmc_token_map tool to retrieve the token available networks and addresses.",
  parameters: z.object({
    coins: z.array(TokenIdentifierSchema),
    searchWidth: SearchWidthParamSchema,
  }),
  execute: async (args: { coins: string[]; searchWidth?: string }) => {
    const tool = new DefiLlamaTool();
    return tool.executeCurrent(args);
  },
};

const GetHistoricalTokenPriceToolSchema = {
  name: "get_historical_token_price",
  description:
    "Fetches historical token prices from DefiLlama for specified tokens at a given timestamp",
  parameters: z.object({
    coins: z.array(TokenIdentifierSchema),
    timestamp: z
      .number()
      .describe("UNIX timestamp of time when you want historical prices"),
    searchWidth: SearchWidthParamSchema,
  }),
  execute: async (args: {
    coins: string[];
    timestamp: number;
    searchWidth?: string;
  }) => {
    const tool = new DefiLlamaTool();
    return tool.executeHistorical(args);
  },
};

const GetTokenPriceChartToolSchema = {
  name: "get_token_price_chart",
  description:
    "Fetches token price charts from DefiLlama with regular time intervals",
  parameters: z.object({
    coins: z.array(TokenIdentifierSchema),
    start: z
      .number()
      .describe(
        "UNIX timestamp of earliest data point requested. Use either start OR end, not both."
      ),
    end: z
      .number()
      .optional()
      .describe(
        "UNIX timestamp of latest data point requested. Note: If both start and end are provided, start will be used and end will be ignored."
      ),
    span: z
      .number()
      .optional()
      .describe("Number of data points to return, defaults to 0"),
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
    const tool = new DefiLlamaTool();
    return tool.executeChart(args);
  },
};

export class DefiLlamaTool extends APITool<{
  coins: string[];
  searchWidth?: string;
}> {
  schema = [
    { name: GetTokenPriceToolSchema.name, tool: tool(GetTokenPriceToolSchema) },
    {
      name: GetHistoricalTokenPriceToolSchema.name,
      tool: tool(GetHistoricalTokenPriceToolSchema),
    },
    {
      name: GetTokenPriceChartToolSchema.name,
      tool: tool(GetTokenPriceChartToolSchema),
    },
  ];

  constructor() {
    super({
      name: GetTokenPriceToolSchema.name,
      description: GetTokenPriceToolSchema.description,
      baseUrl: DEFILLAMA_BASE_URL,
    });
  }

  async executeCurrent(args: { coins: string[]; searchWidth?: string }) {
    return this.withErrorHandling("get_token_price", async () => {
      const parsedResponse = await this.getRawData(args);
      return this.parseResult(parsedResponse);
    });
  }

  async executeHistorical(args: {
    coins: string[];
    timestamp: number;
    searchWidth?: string;
  }) {
    return this.withErrorHandling("get_historical_token_price", async () => {
      const url = this.buildUrl("historical", args);
      const data = await this.fetchFromDefiLlama(url);
      const parsedResponse = DefiLlamaPriceResponseSchema.parse(data);
      return this.parseResult(parsedResponse);
    });
  }

  // Let's expose only current prices for external agents for now
  async getRawData(params: {
    coins: string[];
    searchWidth?: string;
  }): Promise<z.infer<typeof DefiLlamaPriceResponseSchema>> {
    const url = this.buildUrl("current", params);
    const data = await this.fetchFromDefiLlama(url);
    return DefiLlamaPriceResponseSchema.parse(data);
  }

  private parseResult<T extends z.infer<typeof DefiLlamaPriceResponseSchema>>(
    parsedResponse: T
  ) {
    const results = Object.entries(parsedResponse.coins).map(
      ([tokenKey, tokenData]) => {
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
      }
    );

    return { prices: results };
  }

  private async fetchFromDefiLlama(
    url: string
  ): Promise<z.infer<typeof DefiLlamaPriceResponseSchema>> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    return response.json();
  }

  private buildUrl(
    endpoint: "current" | "historical",
    params: {
      coins: string[];
      timestamp?: number;
      searchWidth?: string;
    }
  ): string {
    const searchWidth = params.searchWidth || "4h";
    const coinsString = params.coins.join(",");
    const timestampSegment = params.timestamp ? `/${params.timestamp}` : "";

    return `${DEFILLAMA_BASE_URL}/prices/${endpoint}${timestampSegment}/${coinsString}?searchWidth=${searchWidth}`;
  }

  private async withErrorHandling<T>(
    operation: string,
    action: () => Promise<T>
  ): Promise<T | string> {
    try {
      return await action();
    } catch (error) {
      logger.error(`Error executing ${operation}`, error);
      return `Error executing ${operation} tool`;
    }
  }

  async executeChart(args: {
    coins: string[];
    start: number;
    end?: number;
    span?: number;
    period?: string;
    searchWidth?: string;
  }) {
    return this.withErrorHandling("get_token_price_chart", async () => {
      // If both start and end are provided, prioritize start and ignore end
      const params = { ...args };
      if (params.start && params.end) {
        params.end = undefined; // Ignore end if start is provided
      }

      const url = this.buildChartUrl(params);
      const data = await this.fetchFromDefiLlama(url);
      const parsedResponse = DefiLlamaChartResponseSchema.parse(data);

      const tokens = Object.entries(parsedResponse.coins).map(
        ([tokenKey, tokenData]) => {
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
        }
      );

      return { tokens };
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
    const coinsString = params.coins.join(",");

    const queryParams = new URLSearchParams();
    queryParams.append("start", params.start.toString());

    if (params.end) {
      queryParams.append("end", params.end.toString());
    }

    if (params.span) {
      queryParams.append("span", params.span.toString());
    }

    if (params.period) {
      queryParams.append("period", params.period);
    }

    if (params.searchWidth) {
      queryParams.append("searchWidth", params.searchWidth);
    }

    return `${DEFILLAMA_BASE_URL}/chart/${coinsString}?${queryParams.toString()}`;
  }
}
