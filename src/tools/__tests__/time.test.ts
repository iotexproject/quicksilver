import { describe, expect, it, beforeEach } from 'vitest';

import { TimestampConverterTool } from '../time';

describe('TimestampConverterTool', () => {
  let tool: TimestampConverterTool;

  beforeEach(() => {
    tool = new TimestampConverterTool();
  });

  describe('convertToISO', () => {
    it('should convert millisecond timestamp to ISO string', async () => {
      const timestamp = 1709251200000; // 2024-03-01T00:00:00.000Z
      const result = await tool.execute({ value: timestamp });

      expect(result).toBe('2024-03-01T00:00:00.000Z');
    });

    it('should convert second timestamp to ISO string', async () => {
      const timestamp = 1709251200; // 2024-03-01T00:00:00.000Z
      const result = await tool.execute({ value: timestamp });

      expect(result).toBe('2024-03-01T00:00:00.000Z');
    });
  });

  describe('convertFromISO', () => {
    it('should convert ISO string to millisecond timestamp', async () => {
      const isoString = '2024-03-01T00:00:00.000Z';
      const result = await tool.execute({
        value: isoString,
        targetUnit: 'ms',
      });

      expect(result).toBe('1709251200000');
    });

    it('should convert ISO string to second timestamp', async () => {
      const isoString = '2024-03-01T00:00:00.000Z';
      const result = await tool.execute({
        value: isoString,
        targetUnit: 'sec',
      });

      expect(result).toBe('1709251200');
    });

    it('should throw error when targetUnit is not provided for ISO string', async () => {
      const isoString = '2024-03-01T00:00:00.000Z';
      const result = await tool.execute({ value: isoString });

      expect(result).toBe('Error executing convert_timestamp tool');
    });
  });

  describe('error handling', () => {
    it('should handle invalid ISO string', async () => {
      const result = await tool.execute({
        value: 'invalid-iso-string',
        targetUnit: 'ms',
      });

      expect(result).toBe('Error executing convert_timestamp tool');
    });

    it('should handle invalid numeric timestamp', async () => {
      const result = await tool.execute({
        value: Number.MAX_SAFE_INTEGER + 1,
      });

      expect(result).toBe('Error executing convert_timestamp tool');
    });
  });
});
