import { tool } from 'ai';
import { z } from 'zod';

import { APITool } from './tool';
import { logger } from '../logger/winston';

export const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';

const CMCPlatformSchema = z.object({
  id: z.union([z.number(), z.string()]).describe('Platform ID'),
  name: z.string().describe('Platform name'),
  symbol: z.string().describe('Platform symbol'),
  slug: z.string().describe('Platform slug'),
  token_address: z.string().describe('Token address on the platform'),
});

const CMCResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.number().describe('CoinMarketCap ID'),
      rank: z.number().describe('Token rank'),
      name: z.string().describe('Token name'),
      symbol: z.string().describe('Token symbol'),
      slug: z.string().describe('Token slug'),
      platform: CMCPlatformSchema.nullable().describe('Platform information'),
      first_historical_data: z.string().nullable().optional().describe('First historical data timestamp'),
      last_historical_data: z.string().nullable().optional().describe('Last historical data timestamp'),
      is_active: z.number().optional().describe('Whether the token is active'),
      status: z.number().nullable().optional().describe('Token status'),
    })
  ),
  status: z.object({
    timestamp: z.string().describe('Response timestamp'),
    error_code: z.number().describe('Error code if any'),
    error_message: z.string().nullable().describe('Error message if any'),
    elapsed: z.number().describe('Request processing time'),
    credit_count: z.number().describe('API credit count used'),
    notice: z.string().nullable().describe('Additional notice if any'),
  }),
});

const CMCMetadataV2Schema = z.object({
  data: z.record(
    z.object({
      id: z.number().describe('CoinMarketCap ID'),
      name: z.string().describe('Token name'),
      symbol: z.string().describe('Token symbol'),
      category: z.string().describe('Token category'),
      description: z.string().describe('Token description'),
      slug: z.string().describe('Token slug'),
      logo: z.string().optional().describe('Token logo URL'),
      subreddit: z.string().optional().describe('Token subreddit'),
      notice: z.string().optional().describe('Token notice'),
      tags: z.array(z.string()).optional().describe('Token tags'),
      'tag-names': z.array(z.string()).optional().describe('Token tag names'),
      'tag-groups': z.array(z.string()).optional().describe('Token tag groups'),
      urls: z
        .object({
          website: z.array(z.string()).optional(),
          twitter: z.array(z.string()).optional(),
          message_board: z.array(z.string()).optional(),
          chat: z.array(z.string()).optional(),
          facebook: z.array(z.string()).optional(),
          explorer: z.array(z.string()).optional(),
          reddit: z.array(z.string()).optional(),
          technical_doc: z.array(z.string()).optional(),
          source_code: z.array(z.string()).optional(),
          announcement: z.array(z.string()).optional(),
        })
        .optional(),
      platform: CMCPlatformSchema.nullable().optional(),
      date_added: z.string().optional(),
      twitter_username: z.string().optional(),
      is_hidden: z.number().optional(),
    })
  ),
  status: z.object({
    timestamp: z.string(),
    error_code: z.number(),
    error_message: z.string().nullable(),
    elapsed: z.number(),
    credit_count: z.number(),
    notice: z.string().nullable(),
  }),
});

const GetTokenMapToolSchema = {
  name: 'get_cmc_token_map',
  description:
    'Fetches token mapping data from CoinMarketCap. Returns available platforms for a token (with chain and address)',
  parameters: z.object({
    start: z.number().min(1).default(1).describe('Starting point for pagination (1-based index)'),
    limit: z.number().min(1).max(5000).default(100).describe('Number of results to return (1-5000)'),
    sort: z.enum(['id', 'cmc_rank']).default('id').describe('Field to sort the list of cryptocurrencies by'),
    listingStatus: z
      .union([z.enum(['active', 'inactive', 'untracked']), z.array(z.enum(['active', 'inactive', 'untracked']))])
      .default('active')
      .describe('Filter by listing status. Can be a single value or comma-separated list'),
    symbol: z
      .string()
      .optional()
      .describe(
        'Comma-separated list of cryptocurrency symbols to return CoinMarketCap IDs for. If provided, other options will be ignored.'
      ),
    aux: z
      .array(z.enum(['platform', 'first_historical_data', 'last_historical_data', 'is_active', 'status']))
      .default(['platform', 'first_historical_data', 'last_historical_data', 'is_active'])
      .describe('Supplemental data fields to include in response'),
  }),
  execute: async (args: {
    start?: number;
    limit?: number;
    sort?: 'id' | 'cmc_rank';
    listingStatus?: string | string[];
    symbol?: string;
    aux?: string[];
  }) => {
    try {
      const tool = new CMCBaseTool();
      const response = await tool.getRawData(args);
      const parsedResponse = CMCResponseSchema.parse(response);

      return {
        tokens: parsedResponse.data.map(token => ({
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
      logger.error('Error executing get_cmc_token_map tool', error);
      return `Error executing get_cmc_token_map tool`;
    }
  },
};

const GetMetadataV2ToolSchema = {
  name: 'get_cmc_metadata_v2',
  description:
    'Fetches detailed metadata for cryptocurrencies including logo, description, website URLs, and social links.\n' +
    "If you don't know the token id, use get_cmc_token_map tool to get the token id first.",
  parameters: z.object({
    id: z.string().optional().describe('Comma-separated CoinMarketCap cryptocurrency IDs'),
    address: z.string().optional().describe('Contract address'),
    skip_invalid: z.boolean().optional().default(false),
    aux: z
      .string()
      .optional()
      .default('urls,logo,description,tags,platform,date_added,notice')
      .describe('Only include necessary fields to reduce response size. Can be a single value or comma-separated list'),
  }),
  execute: async (args: {
    id?: string;
    slug?: string;
    symbol?: string;
    address?: string;
    skip_invalid?: boolean;
    aux?: string;
  }) => {
    try {
      const tool = new CMCBaseTool();
      const response = await tool.getMetadataV2(args);
      const parsedResponse = CMCMetadataV2Schema.parse(response);

      return {
        tokens: Object.fromEntries(Object.entries(parsedResponse.data).map(([symbol, tokens]) => [symbol, tokens])),
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
      logger.error('Error executing get_cmc_metadata_v2 tool', error);
      return `Error executing get_cmc_metadata_v2 tool`;
    }
  },
};

type CMCBaseParams = {
  start?: number;
  limit?: number;
  sort?: 'id' | 'cmc_rank';
  listingStatus?: string | string[];
  symbol?: string;
  aux?: string[];
};

export class CMCBaseTool extends APITool<CMCBaseParams> {
  schema = [
    { name: GetTokenMapToolSchema.name, tool: tool(GetTokenMapToolSchema) },
    { name: GetMetadataV2ToolSchema.name, tool: tool(GetMetadataV2ToolSchema) },
  ];

  constructor() {
    super({
      name: GetTokenMapToolSchema.name,
      description: GetTokenMapToolSchema.description,
      baseUrl: CMC_BASE_URL,
    });
    if (!process.env.CMC_API_KEY) {
      throw new Error('CMC_API_KEY environment variable is required');
    }
  }

  async getRawData(params: CMCBaseParams): Promise<z.infer<typeof CMCResponseSchema>> {
    const queryParams = new URLSearchParams({
      start: (params.start || 1).toString(),
      limit: (params.limit || 100).toString(),
      sort: params.sort || 'id',
      listing_status: Array.isArray(params.listingStatus)
        ? params.listingStatus.join(',')
        : params.listingStatus || 'active',
      aux: (params.aux || ['platform']).join(','),
    });

    if (params.symbol) {
      queryParams.set('symbol', params.symbol);
    }

    const res = await fetch(`${CMC_BASE_URL}/cryptocurrency/map?${queryParams.toString()}`, {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY || '',
      },
    });

    if (!res.ok) {
      throw new Error(`API request failed with status: ${res.status}`);
    }

    return await res.json();
  }

  async getMetadataV2(params: {
    id?: string;
    slug?: string;
    symbol?: string;
    address?: string;
    skip_invalid?: boolean;
    aux?: string;
  }) {
    const queryParams = new URLSearchParams();

    if (params.id) queryParams.set('id', params.id);
    if (params.slug) queryParams.set('slug', params.slug);
    if (params.symbol) queryParams.set('symbol', params.symbol);
    if (params.address) queryParams.set('address', params.address);
    if (params.skip_invalid) queryParams.set('skip_invalid', 'true');
    if (params.aux) queryParams.set('aux', params.aux);

    const res = await fetch(`${CMC_BASE_URL}/cryptocurrency/info?${queryParams.toString()}`, {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY || '',
      },
    });

    if (!res.ok) {
      throw new Error(`API request failed with status: ${res.status}`);
    }

    return await res.json();
  }
}
