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
      "Fetches token prices from DefiLlama"
    );
    expect(defillamaTool.schema).toHaveLength(2);
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
          coins: ["solana:CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump"],
          searchWidth: "4h",
        },
        executionOptions
      );

      if (typeof result === "string") {
        throw new Error("Expected result to be an object");
      }

      expect(result).toEqual({
        prices: [
          {
            symbol: "SENTAI",
            price: 0.00128129,
            decimals: 6,
            timestamp: 1743055060,
            confidence: 0.99,
            token: "solana:CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump",
          },
        ],
      });

      expect(fetch).toHaveBeenCalledWith(
        `${DEFILLAMA_BASE_URL}/prices/current/solana:CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump?searchWidth=4h`
      );
    });

    it("should handle custom search width", async () => {
      await defillamaTool.schema[0].tool.execute(
        {
          coins: ["solana:CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump"],
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
          coins: ["solana:CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump"],
          searchWidth: "4h",
        },
        executionOptions
      );

      expect(result).toEqual({
        prices: [
          {
            token: "solana:CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump",
            error: "Price data has low confidence (0.5)",
          },
        ],
      });
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
          coins: ["solana:nonexistent"],
          searchWidth: "4h",
        },
        executionOptions
      );

      expect(result).toEqual({
        prices: [],
      });
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

    it("should fetch multiple token prices", async () => {
      const multiTokenResponse = {
        coins: {
          "solana:CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump": {
            decimals: 6,
            symbol: "SENTAI",
            price: 0.00128129,
            timestamp: 1743055060,
            confidence: 0.99,
          },
          "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1": {
            decimals: 18,
            symbol: "EURS",
            price: 1.112034,
            timestamp: 1743055060,
            confidence: 0.95,
          },
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(multiTokenResponse),
      } as Response);

      const result = await defillamaTool.schema[0].tool.execute(
        {
          coins: [
            "solana:CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump",
            "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1",
          ],
          searchWidth: "4h",
        },
        executionOptions
      );

      expect(result).toEqual({
        prices: [
          {
            token: "solana:CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump",
            symbol: "SENTAI",
            price: 0.00128129,
            decimals: 6,
            timestamp: 1743055060,
            confidence: 0.99,
          },
          {
            token: "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1",
            symbol: "EURS",
            price: 1.112034,
            decimals: 18,
            timestamp: 1743055060,
            confidence: 0.95,
          },
        ],
      });

      expect(fetch).toHaveBeenCalledWith(
        `${DEFILLAMA_BASE_URL}/prices/current/solana:CXPLyc3EX8WySgEXLbjhuA7vy8EKQokVJYQuJm2jpump,ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1?searchWidth=4h`
      );
    });
  });

  describe("executeHistorical", () => {
    const executionOptions = {
      toolCallId: "test-call-id",
      messages: [],
      llm: new LLMService(llmServiceParams),
    };

    it("should fetch historical token prices", async () => {
      const historicalResponse = {
        coins: {
          "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1": {
            decimals: 18,
            symbol: "EURS",
            price: 1.112034,
            timestamp: 1648680149,
            confidence: 0.99,
          },
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(historicalResponse),
      } as Response);

      const result = await defillamaTool.schema[1].tool.execute(
        {
          coins: ["ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1"],
          timestamp: 1648680149,
          searchWidth: "4h",
        },
        executionOptions
      );

      expect(result).toEqual({
        prices: [
          {
            token: "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1",
            symbol: "EURS",
            price: 1.112034,
            decimals: 18,
            timestamp: 1648680149,
            confidence: 0.99,
          },
        ],
      });

      expect(fetch).toHaveBeenCalledWith(
        `${DEFILLAMA_BASE_URL}/prices/historical/1648680149/ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1?searchWidth=4h`
      );
    });

    it("should fetch multiple historical token prices", async () => {
      const historicalMultiResponse = {
        coins: {
          "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1": {
            decimals: 18,
            symbol: "EURS",
            price: 1.112034,
            timestamp: 1648680149,
            confidence: 0.99,
          },
          "ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": {
            decimals: 18,
            symbol: "WETH",
            price: 3386.02,
            timestamp: 1648680149,
            confidence: 0.95,
          },
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(historicalMultiResponse),
      } as Response);

      const result = await defillamaTool.schema[1].tool.execute(
        {
          coins: [
            "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1",
            "ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          ],
          timestamp: 1648680149,
          searchWidth: "4h",
        },
        executionOptions
      );

      expect(result).toEqual({
        prices: [
          {
            token: "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1",
            symbol: "EURS",
            price: 1.112034,
            decimals: 18,
            timestamp: 1648680149,
            confidence: 0.99,
          },
          {
            token: "ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            symbol: "WETH",
            price: 3386.02,
            decimals: 18,
            timestamp: 1648680149,
            confidence: 0.95,
          },
        ],
      });
    });

    it("should handle API errors", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await defillamaTool.schema[1].tool.execute(
        {
          coins: ["ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1"],
          timestamp: 1648680149,
          searchWidth: "4h",
        },
        executionOptions
      );

      expect(result).toBe("Error executing get_historical_token_price tool");
    });
  });
});
