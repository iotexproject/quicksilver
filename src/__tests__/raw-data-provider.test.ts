import { describe, it, expect, beforeEach } from "vitest";
import { RawDataProvider } from "../raw-data-provider";
import { APITool } from "../tools/tool";

class TestAPIToolWithRawData extends APITool<any> {
  async execute(_: string): Promise<string> {
    return "test";
  }

  async parseInput(_: string): Promise<any> {
    return {};
  }

  async getRawData(params: Record<string, any>): Promise<any> {
    return { raw: "data", params };
  }
}

describe("RawDataProvider", () => {
  let provider: RawDataProvider;
  let toolWithRawData: TestAPIToolWithRawData;

  beforeEach(() => {
    provider = new RawDataProvider();
    toolWithRawData = new TestAPIToolWithRawData({
      name: "TestToolWithRaw",
      description: "Test tool with raw data",
      output: "test-output",
      baseUrl: "https://test-api.com",
      twitterAccount: "test-twitter",
    });
  });

  it("should successfully process raw data from a tool that supports it", async () => {
    const params = { test: "param" };
    const result = await provider.process(toolWithRawData, params);

    expect(result).toEqual({
      raw: "data",
      params: { test: "param" },
    });
  });
});
