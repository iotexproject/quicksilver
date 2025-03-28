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

// Shared parameter schema for search width
const SearchWidthParamSchema = z
  .string()
  .optional()
  .default("4h")
  .describe(
    "Time range on either side to find price data, defaults to 6 hours"
  );

// Shared parameter schema for token identifier format
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
}
