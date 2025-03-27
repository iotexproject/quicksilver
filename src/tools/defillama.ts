import { z } from "zod";
import { tool } from "ai";
import { APITool } from "./tool";
import { logger } from "../logger/winston";

export const DEFILLAMA_BASE_URL = "https://coins.llama.fi";

const DefiLlamaPriceResponseSchema = z.object({
  coins: z.record(
    z.string(),
    z.object({
      decimals: z.number(),
      symbol: z.string(),
      price: z.number(),
      timestamp: z.number(),
      confidence: z.number(),
    })
  ),
});

const GetTokenPriceToolSchema = {
  name: "get_token_price",
  description:
    "Fetches token price from DefiLlama using chain and token address in the format {chain}:{address}. If no token address and chain is provided, try get_cmc_token_map tool to retrieve the token available networks and addresses.",
  parameters: z.object({
    chain: z
      .string()
      .describe("Token chain (e.g., 'ethereum', 'solana', 'bsc')"),
    address: z.string().describe("Token address on the chain"),
    searchWidth: z
      .string()
      .optional()
      .default("4h")
      .describe("Time range on either side to find price data"),
  }),
  execute: async (args: {
    chain: string;
    address: string;
    searchWidth?: string;
  }) => {
    const tool = new DefiLlamaTool();
    return tool.execute(args);
  },
};

export class DefiLlamaTool extends APITool<{
  chain: string;
  address: string;
  searchWidth?: string;
}> {
  schema = [
    { name: GetTokenPriceToolSchema.name, tool: tool(GetTokenPriceToolSchema) },
  ];

  constructor() {
    super({
      name: GetTokenPriceToolSchema.name,
      description: GetTokenPriceToolSchema.description,
      baseUrl: DEFILLAMA_BASE_URL,
    });
  }

  async execute(args: {
    chain: string;
    address: string;
    searchWidth?: string;
  }) {
    try {
      const parsedResponse = await this.getRawData(args);

      const tokenKey = `${args.chain}:${args.address}`;
      const tokenData = parsedResponse.coins[tokenKey];

      if (!tokenData) {
        return `No price data found for token on ${args.chain}`;
      }

      // Only return data if confidence is high enough (e.g., > 0.8)
      if (tokenData.confidence < 0.8) {
        return `Price data has low confidence (${tokenData.confidence})`;
      }

      return {
        symbol: tokenData.symbol,
        price: tokenData.price,
        decimals: tokenData.decimals,
        timestamp: tokenData.timestamp,
        confidence: tokenData.confidence,
        chain: args.chain,
        address: args.address,
      };
    } catch (error) {
      logger.error("Error executing get_token_price tool", error);
      return `Error executing get_token_price tool`;
    }
  }

  async getRawData(params: {
    chain: string;
    address: string;
    searchWidth?: string;
  }): Promise<z.infer<typeof DefiLlamaPriceResponseSchema>> {
    const response = await fetch(
      `${DEFILLAMA_BASE_URL}/prices/current/${params.chain}:${params.address}?searchWidth=${params.searchWidth || "4h"}`
    );

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const data = await response.json();
    return DefiLlamaPriceResponseSchema.parse(data);
  }
}
