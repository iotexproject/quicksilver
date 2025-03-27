import { z } from "zod";
import { tool } from "ai";

import { APITool } from "./tool";
import { logger } from "../logger/winston";

export const CMC_BASE_URL = "https://pro-api.coinmarketcap.com/v1";

const CMCPlatformSchema = z.object({
  id: z.number().describe("Platform ID"),
  name: z.string().describe("Platform name"),
  symbol: z.string().describe("Platform symbol"),
  slug: z.string().describe("Platform slug"),
  token_address: z.string().describe("Token address on the platform"),
});

const CMCResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.number().describe("CoinMarketCap ID"),
      rank: z.number().describe("Token rank"),
      name: z.string().describe("Token name"),
      symbol: z.string().describe("Token symbol"),
      slug: z.string().describe("Token slug"),
      platform: CMCPlatformSchema.nullable().describe("Platform information"),
      first_historical_data: z
        .string()
        .nullable()
        .optional()
        .describe("First historical data timestamp"),
      last_historical_data: z
        .string()
        .nullable()
        .optional()
        .describe("Last historical data timestamp"),
      is_active: z.number().optional().describe("Whether the token is active"),
      status: z.string().nullable().optional().describe("Token status"),
    })
  ),
  status: z.object({
    timestamp: z.string().describe("Response timestamp"),
    error_code: z.number().describe("Error code if any"),
    error_message: z.string().nullable().describe("Error message if any"),
    elapsed: z.number().describe("Request processing time"),
    credit_count: z.number().describe("API credit count used"),
    notice: z.string().nullable().describe("Additional notice if any"),
  }),
});

const GetTokenMapToolSchema = {
  name: "get_cmc_token_map",
  description:
    "Fetches token mapping data from CoinMarketCap with symbol, network and address information",
  parameters: z.object({
    start: z
      .number()
      .min(1)
      .default(1)
      .describe("Starting point for pagination (1-based index)"),
    limit: z
      .number()
      .min(1)
      .max(5000)
      .default(100)
      .describe("Number of results to return (1-5000)"),
    sort: z
      .enum(["id", "cmc_rank"])
      .default("id")
      .describe("Field to sort the list of cryptocurrencies by"),
    listingStatus: z
      .union([
        z.enum(["active", "inactive", "untracked"]),
        z.array(z.enum(["active", "inactive", "untracked"])),
      ])
      .default("active")
      .describe(
        "Filter by listing status. Can be a single value or comma-separated list"
      ),
    symbol: z
      .string()
      .optional()
      .describe(
        "Comma-separated list of cryptocurrency symbols to return CoinMarketCap IDs for. If provided, other options will be ignored."
      ),
    aux: z
      .array(
        z.enum([
          "platform",
          "first_historical_data",
          "last_historical_data",
          "is_active",
          "status",
        ])
      )
      .default([
        "platform",
        "first_historical_data",
        "last_historical_data",
        "is_active",
      ])
      .describe("Supplemental data fields to include in response"),
  }),
  execute: async (args: {
    start?: number;
    limit?: number;
    sort?: "id" | "cmc_rank";
    listingStatus?: string | string[];
    symbol?: string;
    aux?: string[];
  }) => {
    try {
      const tool = new CMCBaseTool();
      const response = await tool.getRawData(args);
      const parsedResponse = CMCResponseSchema.parse(response);

      return {
        tokens: parsedResponse.data.map((token) => ({
          id: token.id,
          rank: token.rank,
          name: token.name,
          symbol: token.symbol,
          slug: token.slug,
          platform: token.platform
            ? {
                id: token.platform.id,
                name: token.platform.name,
                symbol: token.platform.symbol,
                slug: token.platform.slug,
                tokenAddress: token.platform.token_address,
              }
            : null,
          firstHistoricalData: token.first_historical_data,
          lastHistoricalData: token.last_historical_data,
          isActive: token.is_active === 1,
          status: token.status,
        })),
        metadata: {
          timestamp: parsedResponse.status.timestamp,
          errorCode: parsedResponse.status.error_code,
          errorMessage: parsedResponse.status.error_message,
          elapsed: parsedResponse.status.elapsed,
          creditCount: parsedResponse.status.credit_count,
          notice: parsedResponse.status.notice,
        },
      };
    } catch (error) {
      logger.error("Error executing get_cmc_token_map tool", error);
      return `Error executing get_cmc_token_map tool`;
    }
  },
};

type CMCBaseParams = {
  start?: number;
  limit?: number;
  sort?: "id" | "cmc_rank";
  listingStatus?: string | string[];
  symbol?: string;
  aux?: string[];
};

export class CMCBaseTool extends APITool<CMCBaseParams> {
  schema = [
    { name: GetTokenMapToolSchema.name, tool: tool(GetTokenMapToolSchema) },
  ];

  constructor() {
    super({
      name: GetTokenMapToolSchema.name,
      description: GetTokenMapToolSchema.description,
      baseUrl: CMC_BASE_URL,
    });
  }

  async getRawData(
    params: CMCBaseParams
  ): Promise<z.infer<typeof CMCResponseSchema>> {
    const queryParams = new URLSearchParams({
      start: (params.start || 1).toString(),
      limit: (params.limit || 100).toString(),
      sort: params.sort || "id",
      listing_status: Array.isArray(params.listingStatus)
        ? params.listingStatus.join(",")
        : params.listingStatus || "active",
      aux: (params.aux || ["platform"]).join(","),
    });

    if (params.symbol) {
      queryParams.set("symbol", params.symbol);
    }

    const res = await fetch(
      `${CMC_BASE_URL}/cryptocurrency/map?${queryParams.toString()}`,
      {
        headers: {
          "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY || "",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`API request failed with status: ${res.status}`);
    }

    return await res.json();
  }
}
