import { describe, it, beforeEach, expect } from "vitest";

import { APITool } from "../tool";

class TestAPITool extends APITool {
  async execute(input: string): Promise<string> {
    return `Executed with input: ${input}`;
  }
}

describe("APITool", () => {
  const name = "Test Tool";
  const description = "A test tool";
  const twitterAccount = "test-twitter-account";
  let tool: TestAPITool;

  beforeEach(() => {
    tool = new TestAPITool(name, description, twitterAccount);
  });

  it("should initialize with correct properties", () => {
    expect(tool.name).toBe(name);
    expect(tool.description).toBe(description);
    expect(tool.twitterAccount).toBe(twitterAccount);
  });

  it("should execute and return expected string", async () => {
    const input = "test input";
    const result = await tool.execute(input);
    expect(result).toBe("Executed with input: test input");
  });

  it("twitter account is optional", () => {
    const tool = new TestAPITool(name, description);
    expect(tool.twitterAccount).toBe("");
  });

  it("should serialize to JSON", () => {
    // shouldn't include apiKey
    expect(JSON.stringify(tool)).toEqual(
      JSON.stringify({
        name,
        description,
        twitterAccount,
      }),
    );
  });
});
