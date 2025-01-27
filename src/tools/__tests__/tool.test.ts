import { describe, it, beforeEach, expect } from "vitest";

import { APITool } from "../tool";

interface ToolInput {
  lat: number;
  lon: number;
}

class TestAPITool extends APITool<ToolInput> {
  async execute(input: string): Promise<string> {
    const parsedInput = await this.parseInput(input);
    return `Executed with input: ${JSON.stringify(parsedInput)}`;
  }

  async parseInput(input: string): Promise<ToolInput> {
    return { lat: 0, lon: 0 };
  }
}

describe("APITool", () => {
  const name = "Test Tool";
  const description = "A test tool";
  const output = "test-output";
  const twitterAccount = "test-twitter-account";
  const baseUrl = "https://test-api.com";
  let tool: TestAPITool;

  beforeEach(() => {
    tool = new TestAPITool({
      name,
      description,
      output,
      baseUrl,
      twitterAccount,
    });
  });

  it("should initialize with correct properties", () => {
    expect(tool.name).toBe(name);
    expect(tool.description).toBe(description);
    expect(tool.output).toBe(output);
    expect(tool.twitterAccount).toBe(twitterAccount);
    expect(tool.baseUrl).toBe(baseUrl);
  });

  it("should execute and return expected string", async () => {
    const query = "test input";
    const result = await tool.execute(query);
    expect(result).toBe('Executed with input: {"lat":0,"lon":0}');
  });

  it("twitter account is optional", () => {
    const tool = new TestAPITool({
      name,
      description,
      output,
      baseUrl,
    });
    expect(tool.twitterAccount).toBe("");
  });

  it("should receive a quiery, decide if it's aligned with the tool's input type, extract the input from the query in the correct format, and execute the tool with the input", async () => {
    const query = "What is the weather in SF?";
    const result = await tool.parseInput(query);
    expect(result).toEqual({ lat: 0, lon: 0 });
  });
});
