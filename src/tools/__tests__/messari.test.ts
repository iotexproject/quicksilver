import { describe, it, expect, beforeEach, vi } from 'vitest';

import { logger } from '../../logger/winston';
import { MessariTool } from '../messari';

vi.mock('global', () => ({
  fetch: vi.fn(),
}));

vi.mock('../../logger/winston', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('MessariTool', () => {
  let tool: MessariTool;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    process.env.MESSARI_API_KEY = mockApiKey;
    tool = new MessariTool();
    vi.clearAllMocks();
  });

  it('should initialize with correct properties', () => {
    expect(tool.name).toBe('MessariCopilot');
    expect(tool.description).toContain('Tool for generating contextual crypto responses');
    expect(tool.schema).toHaveLength(1);
    expect(tool.schema[0].name).toBe('messari_copilot');
  });

  it('should throw error when API key is not set', () => {
    delete process.env.MESSARI_API_KEY;
    expect(() => new MessariTool()).toThrow('Missing MESSARI_API_KEY environment variable');
  });

  describe('getCopilotResponse', () => {
    const mockMessages = [
      {
        role: 'user' as const,
        content: "Tell me about Bitcoin's market cap",
      },
    ];

    const mockResponse = {
      choices: [
        {
          message: {
            content: "Bitcoin's market cap is...",
          },
        },
      ],
    };

    it('should handle successful API response', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      global.fetch = mockFetch;

      const result = await tool.getCopilotResponse({
        messages: mockMessages,
        verbosity: 'balanced',
        response_format: 'markdown',
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith('https://api.messari.io/ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'x-messari-api-key': mockApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: mockMessages,
          verbosity: 'balanced',
          response_format: 'markdown',
        }),
      });
    });

    it('should handle API error response', async () => {
      const errorMessage = 'API Error';
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve(errorMessage),
      });

      global.fetch = mockFetch;

      await expect(
        tool.getCopilotResponse({
          messages: mockMessages,
        })
      ).rejects.toThrow(`Messari API error: ${errorMessage}`);
    });

    it('should use default values for optional parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      global.fetch = mockFetch;

      await tool.getCopilotResponse({
        messages: mockMessages,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.messari.io/ai/v1/chat/completions',
        expect.objectContaining({
          body: expect.stringContaining('"verbosity":"balanced"'),
        })
      );
    });
  });

  describe('getRawData', () => {
    it('should delegate to getCopilotResponse', async () => {
      const mockMessages = [
        {
          role: 'user' as const,
          content: 'Test message',
        },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Test response',
            },
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      global.fetch = mockFetch;

      const result = await tool.getRawData({
        messages: mockMessages,
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('execute', () => {
    const mockInput = {
      messages: [
        {
          role: 'user' as const,
          content: 'Test message',
        },
      ],
      verbosity: 'balanced' as const,
      response_format: 'markdown' as const,
    };
    const executionOptions = {
      toolCallId: 'test-tool-call-id',
      messages: mockInput.messages,
    };

    const mockResponse = {
      choices: [
        {
          message: {
            content: 'Test response',
          },
        },
      ],
    };

    it('should successfully execute the tool', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      global.fetch = mockFetch;

      const result = await tool.schema[0].tool.execute(mockInput, executionOptions);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith('https://api.messari.io/ai/v1/chat/completions', expect.any(Object));
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle errors and log them', async () => {
      const mockError = new Error('API Error');
      const mockFetch = vi.fn().mockRejectedValueOnce(mockError);

      global.fetch = mockFetch;

      const result = await tool.schema[0].tool.execute(mockInput, executionOptions);

      expect(result).toBe('Error executing messari_copilot tool');
      expect(logger.error).toHaveBeenCalledWith('Error executing messari_copilot tool', mockError);
      expect(mockFetch).toHaveBeenCalledWith('https://api.messari.io/ai/v1/chat/completions', expect.any(Object));
    });
  });
});
