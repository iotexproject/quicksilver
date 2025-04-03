import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NuclearOutagesTool } from '../gov';
import { ZodError } from 'zod';

describe('NuclearOutagesTool', () => {
  let nuclearTool: NuclearOutagesTool;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    // Setup environment variables
    process.env.EIA_API_KEY = mockApiKey;

    // Mock fetch
    global.fetch = vi.fn();

    // Initialize tool
    nuclearTool = new NuclearOutagesTool();
  });

  describe('constructor', () => {
    it('should throw error if API key is missing', () => {
      delete process.env.EIA_API_KEY;
      expect(() => new NuclearOutagesTool()).toThrow('Missing EIA_API_KEY environment variable');
    });

    it('should initialize with correct properties', () => {
      expect(nuclearTool.name).toBe('get_nuclear_outages');
      expect(nuclearTool.description).toBe(
        'Fetches nuclear power plant outage data in the United States for a specified date range'
      );
      expect(nuclearTool.schema).toHaveLength(1);
      expect(nuclearTool.schema[0].name).toBe('get_nuclear_outages');
    });
  });

  describe('getRawData', () => {
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

    it('should fetch and validate nuclear outage data', async () => {
      const dateRange = {
        start: '2024-02-01',
        end: '2024-02-07',
      };

      // Mock API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: {
            data: mockOutageData,
          },
        }),
      });

      const result = await nuclearTool.getRawData(dateRange);
      expect(result).toEqual(mockOutageData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.eia.gov/v2/nuclear-outages/us-nuclear-outages/data'),
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      const dateRange = {
        start: '2024-02-01',
        end: '2024-02-07',
      };

      // Mock API error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(nuclearTool.getRawData(dateRange)).rejects.toThrow('API request failed with status: 404');
    });

    it('should validate date range input', async () => {
      const invalidDateRange = {
        start: 'invalid-date',
        end: '2024-02-07',
      };

      await expect(nuclearTool.getRawData(invalidDateRange)).rejects.toThrow(ZodError);
    });

    it('should adjust future end date to current date', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const dateRange = {
        start: '2024-02-01',
        end: futureDateStr,
      };

      // Mock API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: {
            data: mockOutageData,
          },
        }),
      });

      await nuclearTool.getRawData(dateRange);

      // Verify the API was called with today's date instead of the future date
      const today = new Date().toISOString().split('T')[0];
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(`end=${today}`), expect.any(Object));
    });
  });
});
