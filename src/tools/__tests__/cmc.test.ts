import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { mockLLMService } from '../../__tests__/mocks';
import { LLMService } from '../../llm/llm-service';
import { CMCBaseTool, CMC_BASE_URL } from '../cmc';

const llmServiceParams = {
  fastLLMModel: 'test-fast-provider',
  llmModel: 'test-provider',
};

type ListingStatus = 'active' | 'inactive' | 'untracked';
type AuxField = 'platform' | 'first_historical_data' | 'last_historical_data' | 'is_active' | 'status';

describe('CMCBaseTool', () => {
  let cmcTool: CMCBaseTool;
  const mockTokenMapResponse = {
    data: [
      {
        id: 1,
        rank: 1,
        name: 'Bitcoin',
        symbol: 'BTC',
        slug: 'bitcoin',
        platform: null,
        first_historical_data: '2013-04-28T00:00:00.000Z',
        last_historical_data: '2024-03-20T00:00:00.000Z',
        is_active: 1,
        status: 1,
      },
      {
        id: 1027,
        rank: 2,
        name: 'Ethereum',
        symbol: 'ETH',
        slug: 'ethereum',
        platform: null,
        first_historical_data: '2015-08-07T00:00:00.000Z',
        last_historical_data: '2024-03-20T00:00:00.000Z',
        is_active: 1,
        status: 1,
      },
      {
        id: 825,
        rank: 3,
        name: 'Tether USDt',
        symbol: 'USDT',
        slug: 'tether',
        platform: {
          id: 1,
          name: 'Ethereum',
          symbol: 'ETH',
          slug: 'ethereum',
          token_address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        },
        first_historical_data: '2015-02-25T00:00:00.000Z',
        last_historical_data: '2024-03-20T00:00:00.000Z',
        is_active: 1,
        status: 1,
      },
    ],
    status: {
      timestamp: '2024-03-20T12:00:00.000Z',
      error_code: 0,
      error_message: null,
      elapsed: 10,
      credit_count: 1,
      notice: null,
    },
  };

  const defaultParams = {
    start: 1,
    limit: 100,
    sort: 'id' as const,
    listingStatus: 'active' as ListingStatus,
    aux: ['platform', 'first_historical_data', 'last_historical_data', 'is_active'] as AuxField[],
  };

  const originalEnv = process.env.CMC_API_KEY;

  beforeEach(() => {
    process.env.CMC_API_KEY = 'test-api-key';
    cmcTool = new CMCBaseTool();
    vi.stubGlobal('fetch', vi.fn());
    vi.mock('../../llm/llm-service', () => mockLLMService);
  });

  afterEach(() => {
    process.env.CMC_API_KEY = originalEnv;
  });

  it('should initialize with correct properties', () => {
    expect(cmcTool.name).toBe('get_cmc_token_map');
    expect(cmcTool.description).toContain('Fetches token mapping data from CoinMarketCap');
    expect(cmcTool.schema).toHaveLength(2);
    expect(cmcTool.schema[0].name).toBe('get_cmc_token_map');
  });

  describe('getRawData', () => {
    it('should fetch and validate token map data', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenMapResponse),
      } as Response);

      const result = await cmcTool.getRawData(defaultParams);
      expect(result).toEqual(mockTokenMapResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${CMC_BASE_URL}/cryptocurrency/map`),
        expect.objectContaining({
          headers: {
            'X-CMC_PRO_API_KEY': 'test-api-key',
          },
        })
      );
    });

    it('should handle custom parameters', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenMapResponse),
      } as Response);

      const params = {
        ...defaultParams,
        start: 10,
        limit: 50,
        sort: 'cmc_rank' as const,
        listingStatus: ['active', 'untracked'] as ListingStatus[],
        aux: ['platform', 'first_historical_data', 'last_historical_data', 'is_active', 'status'] as AuxField[],
      };

      await cmcTool.getRawData(params);

      expect(fetch).toHaveBeenCalledWith(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?start=10&limit=50&sort=cmc_rank&listing_status=active%2Cuntracked&aux=platform%2Cfirst_historical_data%2Clast_historical_data%2Cis_active%2Cstatus',
        expect.objectContaining({
          headers: {
            'X-CMC_PRO_API_KEY': 'test-api-key',
          },
        })
      );
    });

    it('should handle symbol parameter', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenMapResponse),
      } as Response);

      const params = {
        ...defaultParams,
        symbol: 'BTC,ETH,USDT',
      };

      await cmcTool.getRawData(params);

      expect(fetch).toHaveBeenCalledWith(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?start=1&limit=100&sort=id&listing_status=active&aux=platform%2Cfirst_historical_data%2Clast_historical_data%2Cis_active&symbol=BTC%2CETH%2CUSDT',
        expect.objectContaining({
          headers: {
            'X-CMC_PRO_API_KEY': 'test-api-key',
          },
        })
      );
    });

    it('should throw error when API key is not set', () => {
      delete process.env.CMC_API_KEY;
      expect(() => new CMCBaseTool()).toThrow('CMC_API_KEY environment variable is required');
    });

    it('should handle API errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      await expect(cmcTool.getRawData(defaultParams)).rejects.toThrow('API request failed with status: 401');
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(cmcTool.getRawData(defaultParams)).rejects.toThrow('Network error');
    });
  });

  describe('execute', () => {
    const executionOptions = {
      toolCallId: 'test-call-id',
      messages: [],
      llm: new LLMService(llmServiceParams),
    };

    beforeEach(() => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenMapResponse),
      } as Response);
    });

    it('should return transformed token data', async () => {
      const result = await cmcTool.schema[0].tool.execute(defaultParams, executionOptions);

      if (typeof result === 'string') {
        throw new Error('Expected result to be an object');
      }

      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0]).toEqual({
        id: 1,
        rank: 1,
        name: 'Bitcoin',
        symbol: 'BTC',
        slug: 'bitcoin',
        platform: null,
        firstHistoricalData: '2013-04-28T00:00:00.000Z',
        lastHistoricalData: '2024-03-20T00:00:00.000Z',
        isActive: true,
        status: 1,
      });

      expect(result.tokens[2]).toEqual({
        id: 825,
        rank: 3,
        name: 'Tether USDt',
        symbol: 'USDT',
        slug: 'tether',
        platform: {
          id: 1,
          name: 'Ethereum',
          symbol: 'ETH',
          slug: 'ethereum',
          tokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        },
        firstHistoricalData: '2015-02-25T00:00:00.000Z',
        lastHistoricalData: '2024-03-20T00:00:00.000Z',
        isActive: true,
        status: 1,
      });

      expect(result.metadata).toEqual({
        timestamp: '2024-03-20T12:00:00.000Z',
        errorCode: 0,
        errorMessage: null,
        elapsed: 10,
        creditCount: 1,
        notice: null,
      });
    });

    it('should handle tokens without platform data', async () => {
      const responseWithoutPlatform = {
        ...mockTokenMapResponse,
        data: [
          {
            ...mockTokenMapResponse.data[0],
            platform: null,
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseWithoutPlatform),
      } as Response);

      const result = await cmcTool.schema[0].tool.execute(defaultParams, executionOptions);

      if (typeof result === 'string') {
        throw new Error('Expected result to be an object');
      }

      expect(result.tokens[0].platform).toBeNull();
    });
  });

  describe('getMetadataV2', () => {
    const executionOptions = {
      toolCallId: 'test-call-id',
      messages: [],
      llm: new LLMService(llmServiceParams),
    };
    const mockMetadataResponse = {
      status: {
        timestamp: '2024-03-20T12:00:00.000Z',
        error_code: 0,
        error_message: null,
        elapsed: 10,
        credit_count: 1,
        notice: null,
      },
      data: {
        BTC: {
          id: 1,
          name: 'Bitcoin',
          symbol: 'BTC',
          category: 'coin',
          description: 'Bitcoin description',
          slug: 'bitcoin',
          logo: 'https://example.com/btc.png',
          subreddit: 'bitcoin',
          notice: '',
          tags: ['store-of-value'],
          'tag-names': ['Store of Value'],
          'tag-groups': ['CATEGORY'],
          urls: {
            website: ['https://bitcoin.org'],
            twitter: ['https://twitter.com/bitcoin'],
          },
          platform: null,
          date_added: '2013-04-28T00:00:00.000Z',
          twitter_username: 'bitcoin',
          is_hidden: 0,
        },
      },
    };

    it('should fetch and validate metadata v2 data', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetadataResponse),
      } as Response);

      const result = await cmcTool.schema[1].tool.execute({ id: '1' }, executionOptions);

      if (typeof result === 'string') {
        throw new Error('Expected result to be an object');
      }

      expect(result.metadata).toEqual({
        timestamp: '2024-03-20T12:00:00.000Z',
        errorCode: 0,
        errorMessage: null,
        elapsed: 10,
        creditCount: 1,
        notice: null,
      });

      expect(result.tokens.BTC).toEqual({
        id: 1,
        name: 'Bitcoin',
        symbol: 'BTC',
        category: 'coin',
        description: 'Bitcoin description',
        slug: 'bitcoin',
        logo: 'https://example.com/btc.png',
        subreddit: 'bitcoin',
        notice: '',
        tags: ['store-of-value'],
        'tag-names': ['Store of Value'],
        'tag-groups': ['CATEGORY'],
        urls: {
          website: ['https://bitcoin.org'],
          twitter: ['https://twitter.com/bitcoin'],
        },
        platform: null,
        date_added: '2013-04-28T00:00:00.000Z',
        twitter_username: 'bitcoin',
        is_hidden: 0,
      });
    });
  });
});
