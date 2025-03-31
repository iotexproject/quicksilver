import { mockLLMService } from "../../__tests__/mocks";

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DePINScanMetricsTool,
  DePINScanProjectsTool,
  DEPIN_METRICS_URL,
  DEPIN_PROJECTS_URL,
} from "../depinscan";
import { LLMService } from "../../llm/llm-service";

const llmServiceParams = {
  fastLLMModel: "test-fast-provider",
  llmModel: "test-provider",
};

describe("DePINMetricsTool", () => {
  let metricsTool: DePINScanMetricsTool;
  const mockMetrics = [
    {
      date: "2025-01-27",
      volume: 9749741266.623559,
      market_cap: "26543784050.341797273197",
      total_device: 20273355,
      total_projects: 310,
    },
    {
      date: "2025-01-26",
      volume: "6696675220.806737",
      market_cap: 27740603007.22298408133,
      total_device: "20273355",
      total_projects: "310",
    },
  ];

  beforeEach(() => {
    metricsTool = new DePINScanMetricsTool();
    vi.stubGlobal("fetch", vi.fn());
    vi.mock("../../llm/llm-service", () => mockLLMService);
  });

  it("should initialize with correct properties", () => {
    expect(metricsTool.name).toBe("get_depin_metrics");
    expect(metricsTool.description).toBe(
      "Fetches Global DePINScan metrics for market analysis"
    );
    expect(metricsTool.schema).toHaveLength(1);
    expect(metricsTool.schema[0].name).toBe("get_depin_metrics");
  });

  describe("getRawData", () => {
    it("should fetch and validate metrics data", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      const result = await metricsTool.getRawData({ isLatest: true });
      expect(result).toEqual(mockMetrics);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(DEPIN_METRICS_URL + "?is_latest=true")
      );
    });

    it("should handle API errors", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(metricsTool.getRawData({})).rejects.toThrow(
        "API request failed with status: 404"
      );
    });

    it("should handle network errors", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      await expect(metricsTool.getRawData({})).rejects.toThrow("Network error");
    });
  });
  describe("execute", () => {
    const executionOptions = {
      toolCallId: "test-call-id",
      messages: [],
      llm: new LLMService(llmServiceParams),
    };
    it("should handle latest metrics without volume field", async () => {
      const latestMetricsWithoutVolume = [
        {
          date: "2025-03-01",
          total_projects: "313",
          market_cap: "17926784780.719073689883",
          total_device: "21334450",
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(latestMetricsWithoutVolume),
      } as Response);

      const result = await metricsTool.schema[0].tool.execute(
        { isLatest: true },
        executionOptions
      );

      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0]).toEqual({
        date: "2025-03-01",
        volume: "N/A",
        totalProjects: 313,
        marketCap: "17,926,784,780.719",
        totalDevices: "21,334,450",
      });
    });
    it.skip("should handle real data (only latest metrics)", async () => {
      const originalFetch = global.fetch;
      vi.unstubAllGlobals();

      const response = await fetch(DEPIN_METRICS_URL + "?is_latest=true");
      const realData = await response.json();
      // Restore the mock
      global.fetch = originalFetch;
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(realData),
      } as Response);
      await metricsTool.schema[0].tool.execute(
        { isLatest: true },
        executionOptions
      );
    });
    it.skip("should handle real data (only latest metrics)", async () => {
      const originalFetch = global.fetch;
      vi.unstubAllGlobals();

      const response = await fetch(DEPIN_METRICS_URL);
      const realData = await response.json();
      // Restore the mock
      global.fetch = originalFetch;
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(realData),
      } as Response);
      await metricsTool.schema[0].tool.execute(
        { isLatest: false },
        executionOptions
      );
    });
    it("should handle both string and number formats in metrics", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      const result = await metricsTool.schema[0].tool.execute(
        { isLatest: false },
        executionOptions
      );

      expect(result.metrics).toHaveLength(2);
      expect(result.metrics[0]).toEqual({
        date: "2025-01-27",
        volume: "9,749,741,266.624",
        totalProjects: 310,
        marketCap: "26,543,784,050.342",
        totalDevices: "20,273,355",
      });

      expect(result.metrics[1]).toEqual({
        date: "2025-01-26",
        volume: "6,696,675,220.807",
        totalProjects: 310,
        marketCap: "27,740,603,007.223",
        totalDevices: "20,273,355",
      });
    });
  });
});

describe("DePINProjectsTool", () => {
  let projectsTool: DePINScanProjectsTool;

  const mockProjects = [
    {
      project_name: "Solana",
      slug: "solana",
      logo: "https://depinscan-prod.s3.us-east-1.amazonaws.com/next-s3-uploads/3160a9ec-42df-4f02-9db6-5aadc61323d8/solana.svg",
      description: "Solana is a general purpose layer 1 blockchain...",
      trusted_metric: true,
      token: "SOL",
      layer_1: ["Solana"],
      categories: ["Chain"],
      market_cap: "74109880918.67668",
      token_price: "146.07",
      total_devices: 0,
      network_status: "Mainnet",
      avg_device_cost: "",
      days_to_breakeven: "",
      estimated_daily_earnings: "",
      chainid: "",
      coingecko_id: "solana",
      fully_diluted_valuation: "87572333564",
    },
    {
      project_name: "Filecoin",
      slug: "filecoin",
      logo: "https://depinscan-prod.s3.amazonaws.com/depin/8d40ef7c502c0bf8d805fe7f561b8250.png",
      description: "Filecoin is a peer-to-peer network...",
      trusted_metric: false,
      token: "FIL",
      layer_1: ["Filecoin"],
      categories: ["Storage"],
      market_cap: null,
      token_price: null,
      total_devices: 1000,
      network_status: "Testnet",
      avg_device_cost: "500",
      days_to_breakeven: "30",
      estimated_daily_earnings: "16.67",
      chainid: "1",
      coingecko_id: null,
      fully_diluted_valuation: null,
    },
    {
      project_name: "IoTeX",
      slug: "iotex",
      logo: "https://example.com/iotex.png",
      description: "IoTeX network...",
      trusted_metric: true,
      token: "IOTX",
      layer_1: ["IoTeX"],
      categories: ["IoT", "Chain"],
      market_cap: "300000000",
      token_price: "0.025",
      total_devices: "5000",
      network_status: "Mainnet",
      avg_device_cost: "100",
      days_to_breakeven: "60",
      estimated_daily_earnings: "1.67",
      chainid: "4689",
      coingecko_id: "iotex",
      fully_diluted_valuation: "500000000",
    },
  ];

  beforeEach(() => {
    projectsTool = new DePINScanProjectsTool();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("should initialize with correct properties", () => {
    expect(projectsTool.name).toBe("get_depin_projects");
    expect(projectsTool.description).toContain("Fetches DePINScan projects");
    expect(projectsTool.schema).toHaveLength(1);
    expect(projectsTool.schema[0].name).toBe("get_depin_projects");
  });

  describe("getRawData", () => {
    it("should fetch and validate projects data", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjects),
      } as Response);

      const result = await projectsTool.getRawData();
      expect(result).toEqual(mockProjects);
      expect(fetch).toHaveBeenCalledWith(DEPIN_PROJECTS_URL);
    });

    it("should handle projects with null/empty values", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockProjects[1]]), // Use Filecoin which has null values
      } as Response);

      const result = await projectsTool.getRawData();
      expect(result[0].market_cap).toBeNull();
      expect(result[0].token_price).toBeNull();
      expect(result[0].fully_diluted_valuation).toBeNull();
    });

    it("should handle API errors", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(projectsTool.getRawData()).rejects.toThrow(
        "API request failed with status: 404"
      );
    });

    it("should handle network errors", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      await expect(projectsTool.getRawData()).rejects.toThrow("Network error");
    });
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
        json: () => Promise.resolve(mockProjects),
      } as Response);
    });

    it.skip("should handle real data and handle different filters", async () => {
      // Temporarily restore the real fetch for this test
      const originalFetch = global.fetch;
      vi.unstubAllGlobals();

      const response = await fetch(DEPIN_PROJECTS_URL);
      const realData = await response.json();
      // Restore the mock
      global.fetch = originalFetch;

      // Test with no filters
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(realData),
      } as Response);
      const noFilterResult = await projectsTool.schema[0].tool.execute(
        {},
        executionOptions
      );
      expect(noFilterResult.totalProjects).toBeGreaterThan(0);

      // Test with category filter
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(realData),
      } as Response);
      const categoryResult = await projectsTool.schema[0].tool.execute(
        { category: "Storage" },
        executionOptions
      );

      // Test with layer1 filter
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(realData),
      } as Response);
      const layer1Result = await projectsTool.schema[0].tool.execute(
        { layer1: "Ethereum" },
        executionOptions
      );

      // Test with market cap filter
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(realData),
      } as Response);
      const marketCapResult = await projectsTool.schema[0].tool.execute(
        { minMarketCap: 1000000 },
        executionOptions
      );

      // Test with devices filter
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(realData),
      } as Response);
      const devicesResult = await projectsTool.schema[0].tool.execute(
        { minDevices: 1000 },
        executionOptions
      );

      // Verify each filtered result has fewer or equal projects than the unfiltered result
      expect(categoryResult.totalProjects).toBeLessThanOrEqual(
        noFilterResult.totalProjects
      );
      expect(layer1Result.totalProjects).toBeLessThanOrEqual(
        noFilterResult.totalProjects
      );
      expect(marketCapResult.totalProjects).toBeLessThanOrEqual(
        noFilterResult.totalProjects
      );
      expect(devicesResult.totalProjects).toBeLessThanOrEqual(
        noFilterResult.totalProjects
      );
    }, 10000);

    it("should return all projects with transformed data", async () => {
      const result = await projectsTool.schema[0].tool.execute(
        {
          requireDescription: true,
        },
        executionOptions
      );

      expect(result.totalProjects).toBe(3);
      const solana = result.projects[0];
      expect(solana).toEqual({
        name: "Solana",
        description: "Solana is a general purpose layer 1 blockchain...",
        token: "SOL",
        marketCap: "74,109,880,918.677",
        tokenPrice: "146.07",
        totalDevices: "0",
        avgDeviceCost: "0",
        estimatedDailyEarnings: "0",
        daysToBreakeven: 0,
        categories: ["Chain"],
        layer1: ["Solana"],
      });
    });

    it("should filter projects by category case-insensitively", async () => {
      const result = await projectsTool.schema[0].tool.execute(
        { category: "Chain" },
        executionOptions
      );
      expect(result.totalProjects).toBe(2);
      expect(result.projects.map((p) => p.name)).toEqual(["Solana", "IoTeX"]);
    });

    it("should filter projects by minimum market cap", async () => {
      const result = await projectsTool.schema[0].tool.execute(
        { minMarketCap: 400000000 },
        executionOptions
      );
      expect(result.totalProjects).toBe(1);
      expect(result.projects.map((p) => p.name)).toEqual(["Solana"]);
    });

    it("should filter projects by minimum devices", async () => {
      const result = await projectsTool.schema[0].tool.execute(
        { minDevices: 1000 },
        executionOptions
      );
      expect(result.totalProjects).toBe(2);
      expect(result.projects.map((p) => p.name)).toEqual(["Filecoin", "IoTeX"]);
    });

    it("should filter projects by layer1", async () => {
      const result = await projectsTool.schema[0].tool.execute(
        { layer1: "Solana" },
        executionOptions
      );
      expect(result.totalProjects).toBe(1);
      expect(result.projects[0].name).toBe("Solana");
    });

    it("should combine layer1 filter with other filters", async () => {
      const result = await projectsTool.schema[0].tool.execute(
        {
          layer1: "IoTeX",
          minDevices: 1000,
        },
        executionOptions
      );
      expect(result.totalProjects).toBe(1);
      expect(result.projects[0].name).toBe("IoTeX");
    });

    it("should handle null values in number formatting", async () => {
      const filecoin = (
        await projectsTool.schema[0].tool.execute({}, executionOptions)
      ).projects.find((p) => p.name === "Filecoin");

      expect(filecoin).toBeDefined();
      expect(filecoin!.marketCap).toBe("0");
      expect(filecoin!.tokenPrice).toBe("0");
      expect(filecoin!.totalDevices).toBe("1,000");
      expect(filecoin!.avgDeviceCost).toBe("500");
    });

    it("should handle empty string values in number formatting", async () => {
      const solana = (
        await projectsTool.schema[0].tool.execute({}, executionOptions)
      ).projects.find((p) => p.name === "Solana");

      expect(solana).toBeDefined();
      expect(solana!.avgDeviceCost).toBe("0");
      expect(solana!.estimatedDailyEarnings).toBe("0");
      expect(solana!.daysToBreakeven).toBe(0);
    });

    it("should filter out projects with undefined token when requireToken is true", async () => {
      const mockProjectsWithNullToken = [
        { ...mockProjects[0], token: null },
        { ...mockProjects[1], token: undefined },
        { ...mockProjects[2] }, // has token
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectsWithNullToken),
      } as Response);

      const result = await projectsTool.schema[0].tool.execute(
        { requireToken: true },
        executionOptions
      );

      expect(result.totalProjects).toBe(1);
      expect(result.projects[0].name).toBe("IoTeX");
    });

    it("should filter projects by minimum token price", async () => {
      const result = await projectsTool.schema[0].tool.execute(
        { minTokenPrice: 1.0 },
        executionOptions
      );

      expect(result.totalProjects).toBe(1);
      expect(result.projects[0].name).toBe("Solana");
    });

    it("should filter projects by minimum estimated daily earnings", async () => {
      const result = await projectsTool.schema[0].tool.execute(
        { minDailyEarnings: 1.5 },
        executionOptions
      );

      expect(result.totalProjects).toBe(2);
      expect(result.projects.map((p) => p.name)).toEqual(["Filecoin", "IoTeX"]);
    });

    it("should filter projects by maximum days to breakeven", async () => {
      const result = await projectsTool.schema[0].tool.execute(
        { maxDaysToBreakeven: 50 },
        executionOptions
      );

      expect(result.totalProjects).toBe(1);
      expect(result.projects[0].name).toBe("Filecoin");
    });

    it("should combine multiple filters correctly", async () => {
      const result = await projectsTool.schema[0].tool.execute(
        {
          requireToken: true,
          minTokenPrice: 0.02,
          minDailyEarnings: 1.0,
          maxDaysToBreakeven: 100,
        },
        executionOptions
      );

      expect(result.totalProjects).toBe(1);
      expect(result.projects[0].name).toBe("IoTeX");
    });

    it("should exclude descriptions when requireDescription is false", async () => {
      const result = await projectsTool.schema[0].tool.execute(
        { requireDescription: false },
        executionOptions
      );

      expect(result.totalProjects).toBe(3);
      expect(result.projects[0]).not.toHaveProperty("description");
      expect(result.projects[1]).not.toHaveProperty("description");
      expect(result.projects[2]).not.toHaveProperty("description");
    });

    it("should include descriptions when requireDescription is true", async () => {
      const result = await projectsTool.schema[0].tool.execute(
        { requireDescription: true },
        executionOptions
      );

      expect(result.totalProjects).toBe(3);
      expect(result.projects[0].description).toBe(
        "Solana is a general purpose layer 1 blockchain..."
      );
      expect(result.projects[1].description).toBe(
        "Filecoin is a peer-to-peer network..."
      );
      expect(result.projects[2].description).toBe("IoTeX network...");
    });

    it("should exclude descriptions by default", async () => {
      const result = await projectsTool.schema[0].tool.execute(
        {},
        executionOptions
      );

      expect(result.totalProjects).toBe(3);
      expect(result.projects[0]).not.toHaveProperty("description");
      expect(result.projects[1]).not.toHaveProperty("description");
      expect(result.projects[2]).not.toHaveProperty("description");
    });

    describe("numeric filters", () => {
      const mockProjectsWithZeros = [
        {
          ...mockProjects[0],
          estimated_daily_earnings: "0",
          market_cap: "0",
          token_price: "0",
          total_devices: "0",
          days_to_breakeven: "0",
        },
        {
          ...mockProjects[1],
          estimated_daily_earnings: "10",
          market_cap: "1000000",
          token_price: "1.5",
          total_devices: "100",
          days_to_breakeven: "30",
        },
        {
          ...mockProjects[2],
          estimated_daily_earnings: null,
          market_cap: undefined,
          token_price: null,
          total_devices: "0",
          days_to_breakeven: undefined,
        },
      ];

      beforeEach(() => {
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockProjectsWithZeros),
        } as Response);
      });

      it("should filter out zero and null/undefined values for minDailyEarnings", async () => {
        const result = await projectsTool.schema[0].tool.execute(
          { minDailyEarnings: 0 },
          executionOptions
        );

        expect(result.totalProjects).toBe(1);
        expect(result.projects[0].name).toBe("Filecoin");
      });

      it("should filter out zero and null/undefined values for minMarketCap", async () => {
        const result = await projectsTool.schema[0].tool.execute(
          { minMarketCap: 0 },
          executionOptions
        );

        expect(result.totalProjects).toBe(1);
        expect(result.projects[0].name).toBe("Filecoin");
      });

      it("should filter out zero and null/undefined values for minTokenPrice", async () => {
        const result = await projectsTool.schema[0].tool.execute(
          { minTokenPrice: 0 },
          executionOptions
        );

        expect(result.totalProjects).toBe(1);
        expect(result.projects[0].name).toBe("Filecoin");
      });

      it("should filter out zero and null/undefined values for minDevices", async () => {
        const result = await projectsTool.schema[0].tool.execute(
          { minDevices: 0 },
          executionOptions
        );

        expect(result.totalProjects).toBe(1);
        expect(result.projects[0].name).toBe("Filecoin");
      });

      it("should filter out zero and null/undefined values for maxDaysToBreakeven", async () => {
        const result = await projectsTool.schema[0].tool.execute(
          { maxDaysToBreakeven: 100 },
          executionOptions
        );

        expect(result.totalProjects).toBe(1);
        expect(result.projects[0].name).toBe("Filecoin");
      });

      it("should combine multiple numeric filters correctly", async () => {
        const result = await projectsTool.schema[0].tool.execute(
          {
            minDailyEarnings: 0,
            minMarketCap: 0,
            minTokenPrice: 0,
            maxDaysToBreakeven: 100,
          },
          executionOptions
        );

        expect(result.totalProjects).toBe(1);
        expect(result.projects[0].name).toBe("Filecoin");
      });
    });
  });
});
