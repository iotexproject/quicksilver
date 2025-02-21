import { describe, expect, it, vi, beforeEach, Mock } from 'vitest';
import { NuclearOutagesTool } from '../gov';
import { LLMService } from '../../services/llm-service';

describe('NuclearOutagesTool', () => {
  let nuclearTool: NuclearOutagesTool;
  let mockLLMService: LLMService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    // Setup environment variables
    process.env.EIA_API_KEY = mockApiKey;

    // Mock fetch
    global.fetch = vi.fn();

    // Initialize tool
    nuclearTool = new NuclearOutagesTool();

    // Setup mock LLM service
    const generateMock = vi.fn() as Mock;
    mockLLMService = {
      fastLLMProvider: 'test-provider',
      llmProvider: 'test-provider',
      fastllm: {
        generate: generateMock,
      },
      llm: {
        generate: vi.fn(),
      },
      initLLM: vi.fn(),
    } as unknown as LLMService;
  });

  describe('constructor', () => {
    it('should throw error if API key is missing', () => {
      delete process.env.EIA_API_KEY;
      expect(() => new NuclearOutagesTool()).toThrow('Missing EIA_API_KEY environment variable');
    });

    it('should initialize with API key', () => {
      expect(() => new NuclearOutagesTool()).not.toThrow();
    });
  });

  describe('parseInput', () => {
    it('should parse valid date range', async () => {
      const input = 'show nuclear outages from 2024-01-01 to 2024-02-01';
      (mockLLMService.fastllm.generate as Mock).mockResolvedValueOnce(
        '<response>{"start": "2024-01-01", "end": "2024-02-01"}</response>',
      );

      const result = await nuclearTool.parseInput(input, mockLLMService);
      expect(result).toEqual({
        start: '2024-01-01',
        end: '2024-02-01',
      });
    });

    it('should default to last 7 days if no dates provided', async () => {
      const input = 'show current nuclear outages';
      (mockLLMService.fastllm.generate as Mock).mockResolvedValueOnce('invalid response');

      const result = await nuclearTool.parseInput(input, mockLLMService);
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      expect(result.start).toBe(sevenDaysAgo.toISOString().split('T')[0]);
      expect(result.end).toBe(today.toISOString().split('T')[0]);
    });

    it('should adjust future end date to current date', async () => {
      const input = 'show nuclear outages until 2026-01-01';
      const futureDate = '2026-01-01';
      const today = new Date().toISOString().split('T')[0];
      
      (mockLLMService.fastllm.generate as Mock).mockResolvedValueOnce(
        `<response>{"start": "2024-01-01", "end": "${futureDate}"}</response>`,
      );

      const result = await nuclearTool.parseInput(input, mockLLMService);
      expect(result.end).toBe(today);
    });

    it('should adjust invalid date range (end before start)', async () => {
      const input = 'show nuclear outages from 2024-02-01 to 2024-01-01';
      (mockLLMService.fastllm.generate as Mock).mockResolvedValueOnce(
        '<response>{"start": "2024-02-01", "end": "2024-01-01"}</response>',
      );

      const result = await nuclearTool.parseInput(input, mockLLMService);
      expect(new Date(result.start).getTime()).toBeLessThan(new Date(result.end).getTime());
    });
  });

  describe('execute', () => {
    const mockOutageData = [
      {
        period: '2024-02-01',
        outage: '3184.126',
        capacity: '99094.6',
        percentOutage: '3.21',
        'outage-units': 'megawatts',
        'capacity-units': 'megawatts',
        'percentOutage-units': 'percent',
      },
    ];

    it('should fetch and format nuclear outage data', async () => {
      const input = 'show nuclear outages for last week';
      
      // Mock date parsing
      (mockLLMService.fastllm.generate as Mock)
        .mockResolvedValueOnce('<response>{"start": "2024-02-01", "end": "2024-02-07"}</response>')
        .mockResolvedValueOnce('Nuclear outage summary for the period...');

      // Mock API response
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: {
            data: mockOutageData,
          },
        }),
      });

      const result = await nuclearTool.execute(input, mockLLMService);
      expect(result).toContain('Nuclear outage summary');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.eia.gov/v2/nuclear-outages/us-nuclear-outages/data'),
        expect.any(Object),
      );
    });

    it('should handle API errors', async () => {
      const input = 'show nuclear outages for last week';
      
      // Mock date parsing
      (mockLLMService.fastllm.generate as Mock).mockResolvedValueOnce(
        '<response>{"start": "2024-02-01", "end": "2024-02-07"}</response>',
      );

      // Mock API error
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await nuclearTool.execute(input, mockLLMService);
      expect(result).toContain('Error fetching nuclear outage data');
    });

    it('should handle parsing errors', async () => {
      const input = 'show nuclear outages for last week';
      
      // Mock parsing error
      (mockLLMService.fastllm.generate as Mock).mockRejectedValueOnce(
        new Error('Failed to parse dates'),
      );

      const result = await nuclearTool.execute(input, mockLLMService);
      expect(result).toContain('Error fetching nuclear outage data');
    });
  });
}); 