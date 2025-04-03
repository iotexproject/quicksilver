import { describe, it, expect, beforeEach, vi } from 'vitest';

import { mockLLMService } from '../../__tests__/mocks';
import { LLMService } from '../../llm/llm-service';
import { DePINNinjaTool } from '../depinninja';

const llmServiceParams = {
  fastLLMModel: 'test-fast-provider',
  llmModel: 'test-provider',
};

describe('DePINNinjaTool', () => {
  let depinNinjaTool: DePINNinjaTool;
  const mockApiResponse = {
    totalRevenue: 782979.6476127392,
    breakDown: [
      { name: 'Aethir', revenue: 680756.7459258407 },
      { name: 'Akash', revenue: 9225.591787877442 },
      { name: 'Althea', revenue: 869.0518314077316 },
      { name: 'Geodnet', revenue: 10212.12825 },
      { name: 'Helium', revenue: 8437.07903 },
      { name: 'Hivemapper', revenue: 0.013639954581421533 },
      { name: 'IO.Net', revenue: 60544.25948581953 },
      { name: 'IoTeX', revenue: 3761.961453574896 },
      { name: 'Livepeer', revenue: 1731.4896685636832 },
      { name: 'PAAL AI', revenue: 0 },
      { name: 'Peaq', revenue: 4.071753188000441 },
      { name: 'Render', revenue: 6464.642691683564 },
      { name: 'ScPrime', revenue: 59.80948249124633 },
      { name: 'Virtual', revenue: 912.8026123377103 },
    ],
  };

  beforeEach(() => {
    const originalEnv = process.env.DEPINNINJA_API_KEY;
    process.env.DEPINNINJA_API_KEY = 'test-api-key';
    depinNinjaTool = new DePINNinjaTool();
    vi.stubGlobal('fetch', vi.fn());
    vi.mock('../../llm/llm-service', () => mockLLMService);
    process.env.DEPINNINJA_API_KEY = originalEnv;
  });

  it('should initialize with correct properties', () => {
    expect(depinNinjaTool.name).toBe('get_depin_revenue_by_date');
    expect(depinNinjaTool.description).toContain('Fetches total revenue breakdown');
    expect(depinNinjaTool.schema).toHaveLength(2);
    expect(depinNinjaTool.schema[0].name).toBe('get_depin_revenue_by_date');
  });

  describe('execute', () => {
    const executionOptions = {
      toolCallId: 'test-call-id',
      messages: [],
      llm: new LLMService(llmServiceParams),
    };

    it('should fetch revenue data for a specific date', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      } as Response);

      const originalEnv = process.env.DEPINNINJA_API_KEY;
      process.env.DEPINNINJA_API_KEY = 'test-api-key';
      const result = await depinNinjaTool.schema[0].tool.execute(
        {
          date: '2025-03-28',
        },
        executionOptions
      );
      process.env.DEPINNINJA_API_KEY = originalEnv;

      expect(result).toEqual({
        totalRevenue: 782979.6476127392,
        breakDown: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            revenue: expect.any(Number),
          }),
        ]),
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.depin.ninja/external-access/revenue/2025-03-28',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key',
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await depinNinjaTool.schema[0].tool.execute(
        {
          date: '2025-03-28',
        },
        executionOptions
      );

      expect(result).toBe('Error executing get_depin_revenue_by_date tool');
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await depinNinjaTool.schema[0].tool.execute(
        {
          date: '2025-03-28',
        },
        executionOptions
      );

      expect(result).toBe('Error executing get_depin_revenue_by_date tool');
    });

    it('should handle missing API key', () => {
      const originalEnv = process.env.DEPINNINJA_API_KEY;
      delete process.env.DEPINNINJA_API_KEY;
      expect(() => new DePINNinjaTool()).toThrow('DEPINNINJA_API_KEY environment variable is not set');
      process.env.DEPINNINJA_API_KEY = originalEnv;
    });
  });
});

describe('GetRevenueDataTool', () => {
  let depinNinjaTool: DePINNinjaTool;
  const executionOptions = {
    toolCallId: 'test-call-id',
    messages: [],
    llm: new LLMService(llmServiceParams),
  };
  const mockRevenueData = {
    page: 1,
    limit: 10,
    totalPages: 3,
    data: [
      {
        id: 89969,
        createdAt: '2025-02-01T00:21:29.009Z',
        updatedAt: '2025-02-01T00:21:29.009Z',
        arr: 1015120,
        mrr: 132828,
        normalizedRevenueFor30Days: 84593,
        projectId: 'oqhdss',
        name: 'IoTeX',
        category: 'BLOCKCHAIN_INFRA',
        chain: 'IOTEX',
        revenueData: [
          {
            date: '2024-10-01T00:00:00.000Z',
            revenue: 178.68417198474202,
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    const originalEnv = process.env.DEPINNINJA_API_KEY;
    process.env.DEPINNINJA_API_KEY = 'test-api-key';
    depinNinjaTool = new DePINNinjaTool();
    vi.stubGlobal('fetch', vi.fn());
    vi.mock('../../llm/llm-service', () => mockLLMService);
    process.env.DEPINNINJA_API_KEY = originalEnv;
  });

  describe('execute', () => {
    it("should use 'iotex' as default project name", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...mockRevenueData, totalPages: 3 }),
      } as Response);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRevenueData),
      } as Response);

      const result = await depinNinjaTool.schema[1].tool.execute({}, executionOptions);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.depin.ninja/external-access/revenue?page=1&limit=10&projectName=iotex',
        expect.any(Object)
      );
    });

    it('should fetch latest revenue data for a specified project', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...mockRevenueData, totalPages: 3 }),
      } as Response);

      const lastPageData = {
        ...mockRevenueData,
        page: 3,
        data: [
          {
            ...mockRevenueData.data[0],
            name: 'Akash',
            updatedAt: '2025-02-02T00:21:29.009Z',
          },
        ],
      };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(lastPageData),
      } as Response);

      const result = await depinNinjaTool.schema[1].tool.execute(
        {
          projectName: 'Akash',
        },
        executionOptions
      );

      expect(result).toEqual({
        project: lastPageData.data[0],
      });

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('projectName=Akash'), expect.any(Object));
    });

    it('should fetch latest revenue data for all projects', async () => {
      const mockMultipleProjects = {
        ...mockRevenueData,
        data: [
          mockRevenueData.data[0],
          {
            ...mockRevenueData.data[0],
            name: 'Akash',
            updatedAt: '2025-02-02T00:21:29.009Z',
          },
        ],
      };

      // Mock first call to get total pages
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...mockMultipleProjects, totalPages: 3 }),
      } as Response);

      // Mock second call to get last page
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMultipleProjects),
      } as Response);

      const result = await depinNinjaTool.schema[1].tool.execute({}, executionOptions);

      expect(result).toEqual({
        project: mockMultipleProjects.data[1],
      });

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.depin.ninja/external-access/revenue?page=1&limit=10&projectName=iotex',
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        'https://api.depin.ninja/external-access/revenue?page=3&limit=10&projectName=iotex',
        expect.any(Object)
      );
    });

    it('should include historical data when requested', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...mockRevenueData, totalPages: 1 }),
      } as Response);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRevenueData),
      } as Response);

      const result = await depinNinjaTool.schema[1].tool.execute(
        {
          projectName: 'IoTeX',
          getRevenueHistoricalData: true,
        },
        executionOptions
      );

      expect(result.project.revenueData).toBeDefined();
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('getRevenueHistoricalData=true'), expect.any(Object));
    });

    it('should handle API errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await depinNinjaTool.schema[1].tool.execute(
        {
          projectName: 'IoTeX',
        },
        executionOptions
      );

      expect(result).toBe('Error executing get_last_depin_revenue_data tool');
    });
  });
});
