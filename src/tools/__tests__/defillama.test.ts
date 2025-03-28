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
    expect(defillamaTool.schema).toHaveLength(4);
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

  describe("executeChart", () => {
    const executionOptions = {
      toolCallId: "test-call-id",
      messages: [],
      llm: new LLMService(llmServiceParams),
    };

    it("should fetch chart data for a token", async () => {
      const chartResponse = {
        coins: {
          "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1": {
            symbol: "HUSD",
            confidence: 0.99,
            decimals: 8,
            prices: [
              { timestamp: 1664364295, price: 0.9935534119681249 },
              { timestamp: 1664537423, price: 0.9914483744619215 },
              { timestamp: 1664709926, price: 0.9885029770209419 },
            ],
          },
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(chartResponse),
      } as Response);

      const result = await defillamaTool.schema[2].tool.execute(
        {
          coins: ["ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1"],
          start: 1664364537,
          span: 3,
          period: "2d",
          searchWidth: "600",
        },
        executionOptions
      );

      expect(result).toEqual({
        tokens: [
          {
            token: "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1",
            symbol: "HUSD",
            decimals: 8,
            confidence: 0.99,
            prices: [
              { timestamp: 1664364295, price: 0.9935534119681249 },
              { timestamp: 1664537423, price: 0.9914483744619215 },
              { timestamp: 1664709926, price: 0.9885029770209419 },
            ],
          },
        ],
      });

      expect(fetch).toHaveBeenCalledWith(
        `${DEFILLAMA_BASE_URL}/chart/ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1?start=1664364537&span=3&period=2d&searchWidth=600`
      );
    });

    it("should fetch chart data for multiple tokens", async () => {
      const chartResponse = {
        coins: {
          "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1": {
            symbol: "HUSD",
            confidence: 0.99,
            decimals: 8,
            prices: [
              { timestamp: 1664364295, price: 0.9935534119681249 },
              { timestamp: 1664537423, price: 0.9914483744619215 },
            ],
          },
          "coingecko:ethereum": {
            symbol: "ETH",
            confidence: 0.99,
            prices: [
              { timestamp: 1664364547, price: 1294.8704281123682 },
              { timestamp: 1664537404, price: 1337.6638792936722 },
            ],
          },
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(chartResponse),
      } as Response);

      const result = await defillamaTool.schema[2].tool.execute(
        {
          coins: [
            "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1",
            "coingecko:ethereum",
          ],
          start: 1664364537,
          span: 2,
          period: "2d",
          searchWidth: "600",
        },
        executionOptions
      );

      expect(result).toEqual({
        tokens: [
          {
            token: "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1",
            symbol: "HUSD",
            decimals: 8,
            confidence: 0.99,
            prices: [
              { timestamp: 1664364295, price: 0.9935534119681249 },
              { timestamp: 1664537423, price: 0.9914483744619215 },
            ],
          },
          {
            token: "coingecko:ethereum",
            symbol: "ETH",
            confidence: 0.99,
            prices: [
              { timestamp: 1664364547, price: 1294.8704281123682 },
              { timestamp: 1664537404, price: 1337.6638792936722 },
            ],
          },
        ],
      });

      expect(fetch).toHaveBeenCalledWith(
        `${DEFILLAMA_BASE_URL}/chart/ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1,coingecko:ethereum?start=1664364537&span=2&period=2d&searchWidth=600`
      );
    });

    it("should handle optional end parameter", async () => {
      const chartResponse = {
        coins: {
          "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1": {
            symbol: "HUSD",
            confidence: 0.99,
            decimals: 8,
            prices: [
              { timestamp: 1664364295, price: 0.9935534119681249 },
              { timestamp: 1664537423, price: 0.9914483744619215 },
            ],
          },
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(chartResponse),
      } as Response);

      await defillamaTool.schema[2].tool.execute(
        {
          coins: ["ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1"],
          start: 1664364537,
          end: 1664537500,
          period: "2d",
          searchWidth: "600",
        },
        executionOptions
      );

      expect(fetch).toHaveBeenCalledWith(
        `${DEFILLAMA_BASE_URL}/chart/ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1?start=1664364537&period=2d&searchWidth=600`
      );
    });

    it("should handle default parameters", async () => {
      const chartResponse = {
        coins: {
          "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1": {
            symbol: "HUSD",
            confidence: 0.99,
            decimals: 8,
            prices: [{ timestamp: 1664364295, price: 0.9935534119681249 }],
          },
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(chartResponse),
      } as Response);

      await defillamaTool.schema[2].tool.execute(
        {
          coins: ["ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1"],
          start: 1664364537,
        },
        executionOptions
      );

      expect(fetch).toHaveBeenCalledWith(
        `${DEFILLAMA_BASE_URL}/chart/ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1?start=1664364537`
      );
    });

    it("should handle low confidence price data", async () => {
      const lowConfidenceResponse = {
        coins: {
          "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1": {
            symbol: "HUSD",
            confidence: 0.5,
            decimals: 8,
            prices: [{ timestamp: 1664364295, price: 0.9935534119681249 }],
          },
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(lowConfidenceResponse),
      } as Response);

      const result = await defillamaTool.schema[2].tool.execute(
        {
          coins: ["ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1"],
          start: 1664364537,
          period: "2d",
        },
        executionOptions
      );

      expect(result).toEqual({
        tokens: [
          {
            token: "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1",
            symbol: "HUSD",
            decimals: 8,
            confidence: 0.5,
            error: "Price data has low confidence (0.5)",
            prices: [{ timestamp: 1664364295, price: 0.9935534119681249 }],
          },
        ],
      });
    });

    it("should handle API errors", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await defillamaTool.schema[2].tool.execute(
        {
          coins: ["ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1"],
          start: 1664364537,
        },
        executionOptions
      );

      expect(result).toBe("Error executing get_token_price_chart tool");
    });

    it("should handle network errors", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      const result = await defillamaTool.schema[2].tool.execute(
        {
          coins: ["ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1"],
          start: 1664364537,
        },
        executionOptions
      );

      expect(result).toBe("Error executing get_token_price_chart tool");
    });
  });

  describe("executePercentage", () => {
    const executionOptions = {
      toolCallId: "test-call-id",
      messages: [],
      llm: new LLMService(llmServiceParams),
    };

    it("should fetch percentage change for tokens", async () => {
      const percentageResponse = {
        coins: {
          "coingecko:ethereum": -14.558151749299784,
          "ethereum:0xdB25f211AB05b1c97D595516F45794528a807ad8":
            -3.3519208785134125,
          "bsc:0x762539b45a1dcce3d36d080f74d1aed37844b878": -8.822041839808112,
          "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1":
            -0.2106898504109858,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(percentageResponse),
      } as Response);

      const result = await defillamaTool.schema[3].tool.execute(
        {
          coins: [
            "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1",
            "coingecko:ethereum",
            "bsc:0x762539b45a1dcce3d36d080f74d1aed37844b878",
            "ethereum:0xdB25f211AB05b1c97D595516F45794528a807ad8",
          ],
          timestamp: 1664364537,
          lookForward: false,
          period: "3w",
        },
        executionOptions
      );

      expect(result).toEqual({
        changes: [
          {
            token: "coingecko:ethereum",
            percentageChange: -14.558151749299784,
          },
          {
            token: "ethereum:0xdB25f211AB05b1c97D595516F45794528a807ad8",
            percentageChange: -3.3519208785134125,
          },
          {
            token: "bsc:0x762539b45a1dcce3d36d080f74d1aed37844b878",
            percentageChange: -8.822041839808112,
          },
          {
            token: "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1",
            percentageChange: -0.2106898504109858,
          },
        ],
      });

      expect(fetch).toHaveBeenCalledWith(
        `${DEFILLAMA_BASE_URL}/percentage/ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1,coingecko:ethereum,bsc:0x762539b45a1dcce3d36d080f74d1aed37844b878,ethereum:0xdB25f211AB05b1c97D595516F45794528a807ad8?timestamp=1664364537&lookForward=false&period=3w`
      );
    });

    it("should handle default parameters", async () => {
      const percentageResponse = {
        coins: {
          "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1":
            -0.2106898504109858,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(percentageResponse),
      } as Response);

      await defillamaTool.schema[3].tool.execute(
        {
          coins: ["ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1"],
        },
        executionOptions
      );

      expect(fetch).toHaveBeenCalledWith(
        `${DEFILLAMA_BASE_URL}/percentage/ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1`
      );
    });

    it("should handle lookForward parameter", async () => {
      const percentageResponse = {
        coins: {
          "ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1": 0.5,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(percentageResponse),
      } as Response);

      await defillamaTool.schema[3].tool.execute(
        {
          coins: ["ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1"],
          lookForward: true,
        },
        executionOptions
      );

      expect(fetch).toHaveBeenCalledWith(
        `${DEFILLAMA_BASE_URL}/percentage/ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1?lookForward=true`
      );
    });

    it("should handle missing tokens in response", async () => {
      const emptyResponse = {
        coins: {},
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(emptyResponse),
      } as Response);

      const result = await defillamaTool.schema[3].tool.execute(
        {
          coins: ["ethereum:0xnonexistent"],
        },
        executionOptions
      );

      expect(result).toEqual({
        changes: [],
      });
    });

    it("should handle API errors", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await defillamaTool.schema[3].tool.execute(
        {
          coins: ["ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1"],
        },
        executionOptions
      );

      expect(result).toBe(
        "Error executing get_token_price_percentage_change tool"
      );
    });

    it("should handle network errors", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      const result = await defillamaTool.schema[3].tool.execute(
        {
          coins: ["ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1"],
        },
        executionOptions
      );

      expect(result).toBe(
        "Error executing get_token_price_percentage_change tool"
      );
    });
  });
});
