import { describe, it, beforeEach, expect } from 'vitest';

import { APITool } from '../tool';

interface ToolInput {
  lat: number;
  lon: number;
}

class TestAPITool extends APITool<ToolInput> {
  async execute(input: string): Promise<string> {
    const parsedInput = await this.parseInput(input);
    return `Executed with input: ${JSON.stringify(parsedInput)}`;
  }

  async parseInput(_input: string): Promise<ToolInput> {
    return { lat: 0, lon: 0 };
  }

  async getRawData(params: ToolInput): Promise<string> {
    return `Raw data for input: ${JSON.stringify(params)}`;
  }
}

describe('APITool', () => {
  const name = 'Test Tool';
  const description = 'A test tool';
  const twitterAccount = 'test-twitter-account';
  const baseUrl = 'https://test-api.com';
  let tool: TestAPITool;

  beforeEach(() => {
    tool = new TestAPITool({
      name,
      description,
      baseUrl,
      twitterAccount,
    });
  });

  it('should initialize with correct properties', () => {
    expect(tool.name).toBe(name);
    expect(tool.description).toBe(description);
    expect(tool.twitterAccount).toBe(twitterAccount);
    expect(tool.baseUrl).toBe(baseUrl);
  });

  it('should execute and return expected string', async () => {
    const query = 'test input';
    const result = await tool.execute(query);
    expect(result).toBe('Executed with input: {"lat":0,"lon":0}');
  });

  it('twitter account is optional', () => {
    const tool = new TestAPITool({
      name,
      description,
      baseUrl,
    });
    expect(tool.twitterAccount).toBe('');
  });

  it("should receive a quiery, decide if it's aligned with the tool's input type, extract the input from the query in the correct format, and execute the tool with the input", async () => {
    const query = 'What is the weather in SF?';
    const result = await tool.parseInput(query);
    expect(result).toEqual({ lat: 0, lon: 0 });
  });

  it('should return raw data for input', async () => {
    const params = { lat: 37.7749, lon: -122.4194 };
    const result = await tool.getRawData(params);
    expect(result).toBe('Raw data for input: {"lat":37.7749,"lon":-122.4194}');
  });
});
