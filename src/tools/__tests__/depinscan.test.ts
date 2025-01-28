import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DePINScanMetricsTool,
  DePINScanProjectsTool,
  DEPIN_METRICS_URL,
  DEPIN_PROJECTS_URL,
} from "../depinscan";

describe("DePINMetricsTool", () => {
  let metricsTool: DePINScanMetricsTool;

  beforeEach(() => {
    metricsTool = new DePINScanMetricsTool();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("should initialize with correct properties", () => {
    expect(metricsTool.name).toBe("DePINScanMetrics");
    expect(metricsTool.description).toBe(
      "Fetches Global DePINScan (Decentralized Physical Infrastructure) metrics",
    );
  });

  it("should handle successful API response", async () => {
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

    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockMetrics),
      } as Response),
    );

    const result = await metricsTool.execute("");

    expect(result).toBe(JSON.stringify(mockMetrics));
  });

  it("should handle API error", async () => {
    const error = new Error("API Error");
    vi.mocked(fetch).mockRejectedValueOnce(error);

    const consoleSpy = vi.spyOn(console, "error");
    const result = await metricsTool.execute("");

    expect(result).toBe("Error fetching DePIN metrics: Error: API Error");
    expect(consoleSpy).toHaveBeenCalledWith("DePINMetrics Error:", error);
  });

  it("should make request to correct endpoint", async () => {
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve({}),
      } as Response),
    );

    await metricsTool.execute("");

    expect(fetch).toHaveBeenCalledWith(DEPIN_METRICS_URL);
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
    expect(projectsTool.name).toBe("DePINScanProjects");
    expect(projectsTool.description).toBe(
      "Fetches DePINScan (Decentralized Physical Infrastructure) projects metrics. You can ask about specific projects, categories, or metrics.",
    );
  });

  it("should handle successful API response and LLM processing", async () => {
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

    const mockLLMResponse = JSON.stringify({
      name: "Project 1",
      market_cap: "$500,000,000",
      categories: ["IoT", "Mining"],
    });

    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockProjects),
      } as Response),
    );

    mockLLMService.fastllm.generate.mockResolvedValueOnce(mockLLMResponse);

    const result = await projectsTool.execute(
      "Tell me about Project 1",
      mockLLMService as any,
    );

    expect(result).toBe(mockLLMResponse);
    expect(mockLLMService.fastllm.generate).toHaveBeenCalledWith(
      expect.stringContaining("Tell me about Project 1"),
    );
  });

  it("should handle API error", async () => {
    const error = new Error("API Error");
    vi.mocked(fetch).mockRejectedValueOnce(error);

    const consoleSpy = vi.spyOn(console, "error");
    const result = await projectsTool.execute("query", mockLLMService as any);

    expect(result).toBe("Error fetching DePIN projects: Error: API Error");
    expect(consoleSpy).toHaveBeenCalledWith("DePINProjects Error:", error);
  });

  it("should make request to correct endpoint", async () => {
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve([]),
      } as Response),
    );

    mockLLMService.fastllm.generate.mockResolvedValueOnce("{}");

    await projectsTool.execute("query", mockLLMService as any);

    expect(fetch).toHaveBeenCalledWith(DEPIN_PROJECTS_URL);
  });
});
