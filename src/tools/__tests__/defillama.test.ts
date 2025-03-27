import { mockLLMService } from "../../__tests__/mocks";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { DefiLlamaTool, DEFILLAMA_BASE_URL } from "../defillama";
import { LLMService } from "../../llm/llm-service";

const llmServiceParams = {
  fastLLMModel: "test-fast-provider",
  llmModel: "test-provider",
};

describe("DefiLlamaTool", () => {
  let defillamaTool: DefiLlamaTool;
  const mockDefillamaResponse = {
    coins: {
      "solana:CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump": {
        decimals: 6,
        symbol: "SENTAI",
        price: 0.00128129,
        timestamp: 1743055060,
        confidence: 0.99,
      },
    },
  };

  beforeEach(() => {
    defillamaTool = new DefiLlamaTool();
    vi.stubGlobal("fetch", vi.fn());
    vi.mock("../../llm/llm-service", () => mockLLMService);
  });

  it("should initialize with correct properties", () => {
    expect(defillamaTool.name).toBe("get_token_price");
    expect(defillamaTool.description).toContain(
      "Fetches token price from DefiLlama"
    );
    expect(defillamaTool.schema).toHaveLength(1);
    expect(defillamaTool.schema[0].name).toBe("get_token_price");
  });

  describe("execute", () => {
    const executionOptions = {
      toolCallId: "test-call-id",
      messages: [],
      llm: new LLMService(llmServiceParams),
    };

    beforeEach(() => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockDefillamaResponse),
      } as Response);
    });

    it("should fetch token price with default search width", async () => {
      const result = await defillamaTool.schema[0].tool.execute(
        {
          chain: "solana",
          address: "CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump",
          searchWidth: "4h",
        },
        executionOptions
      );

      if (typeof result === "string") {
        throw new Error("Expected result to be an object");
      }

      expect(result).toEqual({
        symbol: "SENTAI",
        price: 0.00128129,
        decimals: 6,
        timestamp: 1743055060,
        confidence: 0.99,
        chain: "solana",
        address: "CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump",
      });

      expect(fetch).toHaveBeenCalledWith(
        `${DEFILLAMA_BASE_URL}/prices/current/solana:CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump?searchWidth=4h`
      );
    });

    it("should handle custom search width", async () => {
      await defillamaTool.schema[0].tool.execute(
        {
          chain: "solana",
          address: "CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump",
          searchWidth: "6h",
        },
        executionOptions
      );

      expect(fetch).toHaveBeenCalledWith(
        `${DEFILLAMA_BASE_URL}/prices/current/solana:CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump?searchWidth=6h`
      );
    });

    it("should handle low confidence price data", async () => {
      const lowConfidenceResponse = {
        coins: {
          "solana:CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump": {
            decimals: 6,
            symbol: "SENTAI",
            price: 0.00128129,
            timestamp: 1743055060,
            confidence: 0.5,
          },
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(lowConfidenceResponse),
      } as Response);

      const result = await defillamaTool.schema[0].tool.execute(
        {
          chain: "solana",
          address: "CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump",
          searchWidth: "4h",
        },
        executionOptions
      );

      expect(result).toBe("Price data has low confidence (0.5)");
    });

    it("should handle token not found", async () => {
      const emptyResponse = {
        coins: {},
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(emptyResponse),
      } as Response);

      const result = await defillamaTool.schema[0].tool.execute(
        {
          chain: "solana",
          address: "nonexistent",
          searchWidth: "4h",
        },
        executionOptions
      );

      expect(result).toBe("No price data found for token on solana");
    });

    it("should handle API errors", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await defillamaTool.schema[0].tool.execute(
        {
          chain: "solana",
          address: "nonexistent",
          searchWidth: "4h",
        },
        executionOptions
      );

      expect(result).toBe("Error executing get_token_price tool");
    });
  });
});
