import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { ZodError } from 'zod';

import { NewsAPITool } from '../newsapi';

vi.mock('axios');

const baseUrl = 'https://newsapi.org/v2/top-headlines';

describe('NewsAPITool', () => {
  let tool: NewsAPITool;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    process.env.NEWSAPI_API_KEY = mockApiKey;
    tool = new NewsAPITool();
  });

  it('should initialize with correct properties', () => {
    expect(tool.name).toBe('get_headlines');
    expect(tool.description).toBe(
      "Fetches today's top headlines from News API. You can filter by country, category, and search keywords."
    );
    expect(tool.schema).toHaveLength(1);
    expect(tool.schema[0].name).toBe('get_headlines');
  });

  it('should throw error when API key is not set', () => {
    delete process.env.NEWSAPI_API_KEY;
    expect(() => new NewsAPITool()).toThrow('Please set the NEWSAPI_API_KEY environment variable.');
  });

  describe('getRawData', () => {
    const mockNewsData = {
      status: 'ok',
      totalResults: 2,
      articles: [
        {
          source: { name: 'Test Source 1' },
          title: 'Test Title 1',
          url: 'https://test1.com',
          description: 'Test Description 1',
          publishedAt: '2024-03-20T12:00:00Z',
          urlToImage: 'https://test1.com/image.jpg',
          content: 'Test Content 1',
        },
        {
          source: { name: 'Test Source 2' },
          title: 'Test Title 2',
          url: 'https://test2.com',
          description: 'Test Description 2',
          publishedAt: '2024-03-20T13:00:00Z',
          urlToImage: 'https://test2.com/image.jpg',
          content: 'Test Content 2',
        },
      ],
    };

    it('should handle successful API response', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockNewsData });

      const result = await tool.getRawData({});

      expect(result).toEqual(mockNewsData);
      expect(axios.get).toHaveBeenCalledWith(`${baseUrl}?country=us&apiKey=${mockApiKey}`);
    });

    it('should handle successful API response with category', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockNewsData });

      const result = await tool.getRawData({ category: 'technology' });

      expect(result).toEqual(mockNewsData);
      expect(axios.get).toHaveBeenCalledWith(`${baseUrl}?country=us&apiKey=${mockApiKey}&category=technology`);
    });

    it('should handle successful API response with search query', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockNewsData });

      const result = await tool.getRawData({ q: 'test search' });

      expect(result).toEqual(mockNewsData);
      expect(axios.get).toHaveBeenCalledWith(`${baseUrl}?country=us&apiKey=${mockApiKey}&q=test+search`);
    });

    it('should throw error for invalid category', async () => {
      await expect(tool.getRawData({ category: 'invalid-category' })).rejects.toThrow(ZodError);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      vi.mocked(axios.get).mockRejectedValueOnce(networkError);

      await expect(tool.getRawData({})).rejects.toThrow('Network error');
    });
  });
});
