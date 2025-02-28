import { mockLLMService } from "../../__tests__/mocks";

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DePINScanMetricsTool,
  DePINScanProjectsTool,
  DEPIN_METRICS_URL,
  DEPIN_PROJECTS_URL,
} from "../depinscan";
import { LLMService } from "../../llm/llm-service";
import { logger } from "../../logger/winston";
import { ZodError } from "zod";

const llmServiceParams = {
  fastLLMModel: "test-fast-provider",
  llmModel: "test-provider",
};

describe("DePINMetricsTool", () => {
  let metricsTool: DePINScanMetricsTool;

  const setupMockLLM = (secondResponse: string) => {
    // @ts-ignore no need to mock private methods
    vi.mocked(LLMService).mockImplementation(() => ({
      fastllm: {
        generate: vi
          .fn()
          .mockResolvedValueOnce('<response>{"isLatest": false}</response>')
          .mockResolvedValueOnce(secondResponse),
      },
    }));
  };

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
    const mockMetrics = [
      {
        date: "2025-01-27",
        volume: "9749741266.623559",
        market_cap: "26543784050.341797273197",
        total_device: "20273355",
        total_projects: "310",
      },
      {
        date: "2025-01-26",
        volume: "6696675220.806737",
        market_cap: "27740603007.22298408133",
        total_device: "20273355",
        total_projects: "310",
      },
    ];

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

      await expect(metricsTool.getRawData({})).rejects.toThrow(
        "Network error"
      );
    });
  });
});

describe("DePINProjectsTool", () => {
  let projectsTool: DePINScanProjectsTool;
  let mockLLMService: { fastllm: { generate: any } };

  beforeEach(() => {
    projectsTool = new DePINScanProjectsTool();
    vi.stubGlobal("fetch", vi.fn());

    // Mock LLM service
    mockLLMService = {
      fastllm: {
        generate: vi.fn(),
      },
    };
  });

  it("should initialize with correct properties", () => {
    expect(projectsTool.name).toBe("get_depin_projects");
    expect(projectsTool.description).toBe(
      "Fetches DePINScan projects and their metrics"
    );
    expect(projectsTool.schema).toHaveLength(1);
    expect(projectsTool.schema[0].name).toBe("get_depin_projects");
  });

  describe("getRawData", () => {
    const mockProjects = [
      {
        project_name: "Project 1",
        market_cap: "500000000",
        token_price: "1.5",
        total_devices: "20000",
        categories: ["IoT", "Mining"],
        slug: "project-1",
        token: "PRJ1",
        description: "Test project 1",
        layer_1: ["Ethereum"],
        avg_device_cost: "500",
        days_to_breakeven: "100",
        estimated_daily_earnings: "5",
        chainid: "1",
        coingecko_id: "project-1",
        fully_diluted_valuation: "1000000000",
      },
    ];

    it("should fetch and validate projects data", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjects),
      } as Response);

      const result = await projectsTool.getRawData();
      expect(result).toEqual(mockProjects);
      expect(fetch).toHaveBeenCalledWith(DEPIN_PROJECTS_URL);
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

      await expect(projectsTool.getRawData()).rejects.toThrow(
        "Network error"
      );
    });
  });
});
