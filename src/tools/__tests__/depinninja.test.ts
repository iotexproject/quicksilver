import { mockLLMService } from "../../__tests__/mocks";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { DePINNinjaTool } from "../depinninja";
import { LLMService } from "../../llm/llm-service";

const llmServiceParams = {
  fastLLMModel: "test-fast-provider",
  llmModel: "test-provider",
};

describe("DePINNinjaTool", () => {
  let depinNinjaTool: DePINNinjaTool;
  const mockApiResponse = {
    totalRevenue: 782979.6476127392,
    breakDown: [
      { name: "Aethir", revenue: 680756.7459258407 },
      { name: "Akash", revenue: 9225.591787877442 },
      { name: "Althea", revenue: 869.0518314077316 },
      { name: "Geodnet", revenue: 10212.12825 },
      { name: "Helium", revenue: 8437.07903 },
      { name: "Hivemapper", revenue: 0.013639954581421533 },
      { name: "IO.Net", revenue: 60544.25948581953 },
      { name: "IoTeX", revenue: 3761.961453574896 },
      { name: "Livepeer", revenue: 1731.4896685636832 },
      { name: "PAAL AI", revenue: 0 },
      { name: "Peaq", revenue: 4.071753188000441 },
      { name: "Render", revenue: 6464.642691683564 },
      { name: "ScPrime", revenue: 59.80948249124633 },
      { name: "Virtual", revenue: 912.8026123377103 },
    ],
  };

  beforeEach(() => {
    const originalEnv = process.env.DEPINNINJA_API_KEY;
    process.env.DEPINNINJA_API_KEY = "test-api-key";
    depinNinjaTool = new DePINNinjaTool();
    vi.stubGlobal("fetch", vi.fn());
    vi.mock("../../llm/llm-service", () => mockLLMService);
    process.env.DEPINNINJA_API_KEY = originalEnv;
  });

  it("should initialize with correct properties", () => {
    expect(depinNinjaTool.name).toBe("get_depin_revenue");
    expect(depinNinjaTool.description).toContain("Fetches DePIN revenue data");
    expect(depinNinjaTool.schema).toHaveLength(1);
    expect(depinNinjaTool.schema[0].name).toBe("get_depin_revenue");
  });

  describe("execute", () => {
    const executionOptions = {
      toolCallId: "test-call-id",
      messages: [],
      llm: new LLMService(llmServiceParams),
    };

    it("should fetch revenue data for a specific date", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      } as Response);

      const originalEnv = process.env.DEPINNINJA_API_KEY;
      process.env.DEPINNINJA_API_KEY = "test-api-key";
      const result = await depinNinjaTool.schema[0].tool.execute(
        {
          date: "2025-03-28",
        },
        executionOptions
      );
      process.env.DEPINNINJA_API_KEY = originalEnv;

      expect(result).toEqual({
        totalRevenue: 782979.6476127392,
        breakDown: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            revenue: expect.any(Number),
          }),
        ]),
      });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.depin.ninja/external-access/revenue/2025-03-28",
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-api-key": "test-api-key",
          }),
        })
      );
    });

    it("should handle API errors", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await depinNinjaTool.schema[0].tool.execute(
        {
          date: "2025-03-28",
        },
        executionOptions
      );

      expect(result).toBe("Error executing get_depin_revenue tool");
    });

    it("should handle network errors", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      const result = await depinNinjaTool.schema[0].tool.execute(
        {
          date: "2025-03-28",
        },
        executionOptions
      );

      expect(result).toBe("Error executing get_depin_revenue tool");
    });

    it("should handle missing API key", () => {
      const originalEnv = process.env.DEPINNINJA_API_KEY;
      delete process.env.DEPINNINJA_API_KEY;
      expect(() => new DePINNinjaTool()).toThrow(
        "DEPINNINJA_API_KEY environment variable is not set"
      );
      process.env.DEPINNINJA_API_KEY = originalEnv;
    });
  });
});
