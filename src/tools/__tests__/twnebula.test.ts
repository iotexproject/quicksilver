import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { ZodError } from 'zod';

import { ThirdWebTool } from '../thirdWeb';

vi.mock('axios');

const baseUrl = 'https://nebula-api.thirdweb.com/chat';

describe('ThirdWebTool', () => {
  let tool: ThirdWebTool;
  const mockSecretKey = 'test-secret-key';
  const mockSessionId = 'test-session-id';

  beforeEach(() => {
    process.env.THIRDWEB_SECRET_KEY = mockSecretKey;
    process.env.THIRDWEB_SESSION_ID = mockSessionId;
    tool = new ThirdWebTool();
  });

  it('should initialize with correct properties', () => {
    expect(tool.name).toBe('ask_thirdweb');
    expect(tool.description).toContain('Retrieve smart contract details');
    expect(tool.schema).toHaveLength(1);
    expect(tool.schema[0].name).toBe('ask_thirdweb');
  });

  it('should throw error when secret key is not set', () => {
    delete process.env.THIRDWEB_SECRET_KEY;
    process.env.THIRDWEB_SESSION_ID = mockSessionId;
    expect(() => new ThirdWebTool()).toThrow('Please set the THIRDWEB_SECRET_KEY environment variable.');
  });

  it('should throw error when session ID is not set', () => {
    process.env.THIRDWEB_SECRET_KEY = mockSecretKey;
    delete process.env.THIRDWEB_SESSION_ID;
    expect(() => new ThirdWebTool()).toThrow('Please set the THIRDWEB_SESSION_ID environment variable.');
  });

  describe('getRawData', () => {
    const mockNebulaResponse = {
      message: 'This is a test response from Nebula',
      actions: [
        {
          session_id: 'test-session-id',
          request_id: 'test-request-id',
          type: 'init',
          source: 'nebula',
          data: 'Test data',
        },
      ],
      session_id: 'test-session-id',
      request_id: 'test-request-id',
    };

    it('should handle successful API response', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({ data: mockNebulaResponse });

      const result = await tool.getRawData({ message: 'Test question about blockchain' });

      expect(result).toEqual(mockNebulaResponse);
      expect(axios.post).toHaveBeenCalledWith(
        baseUrl,
        {
          message: 'Test question about blockchain',
          stream: false,
          session_id: mockSessionId,
        },
        {
          headers: {
            'x-secret-key': mockSecretKey,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );
    });

    it('should throw error for empty message', async () => {
      await expect(tool.getRawData({ message: '' })).rejects.toEqual(
        new ZodError([
          {
            code: 'too_small',
            minimum: 20,
            type: 'string',
            inclusive: true,
            exact: false,
            message: 'String must contain at least 20 character(s)',
            path: ['message'],
          },
        ])
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      vi.mocked(axios.post).mockRejectedValueOnce(networkError);

      await expect(tool.getRawData({ message: 'Test question about blockchain' })).rejects.toThrow('Network error');
    });
  });
});
