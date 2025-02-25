import { z } from "zod";
import { tool } from "ai";

import { APITool } from "./tool";

export const DEPIN_METRICS_URL = "https://gateway1.iotex.io/depinscan/explorer";
export const DEPIN_PROJECTS_URL = "https://metrics-api.w3bstream.com/project";

const DepinScanMetricsSchema = z.object({
  date: z.string().describe("Date of the metrics measurement"),
  volume: z.string().describe("Trading volume"),
  total_projects: z.string().describe("Total number of DePIN projects"),
  market_cap: z.string().describe("Total market capitalization"),
  total_device: z.string().describe("Total number of connected devices"),
});

const DepinScanProjectSchema = z.object({
  project_name: z.string().describe("Name of the DePIN project"),
  slug: z.string().describe("URL-friendly identifier for the project"),
  token: z.string().describe("Project's token symbol"),
  description: z.string().describe("Project description"),
  layer_1: z
    .array(z.string())
    .describe("Blockchain networks the project operates on"),
  categories: z.array(z.string()).describe("Project categories"),
  market_cap: z.string().describe("Market capitalization of the project"),
  token_price: z.string().describe("Current token price"),
  total_devices: z.string().describe("Number of devices in the network"),
  avg_device_cost: z.string().describe("Average cost per device"),
  days_to_breakeven: z
    .string()
    .describe("Estimated days to break even on device investment"),
  estimated_daily_earnings: z
    .string()
    .describe("Estimated daily earnings per device"),
  chainid: z.string().describe("Primary blockchain network ID"),
  coingecko_id: z.string().describe("CoinGecko API identifier"),
  fully_diluted_valuation: z
    .string()
    .describe("Fully diluted valuation of the project"),
});

const GetMetricsToolSchema = {
  name: "get_depin_metrics",
  description: "Fetches Global DePINScan metrics for market analysis",
  parameters: z.object({
    isLatest: z
      .boolean()
      .default(true)
      .describe("Whether to fetch only the latest metrics or historical data"),
  }),
  execute: async (args: { isLatest: boolean }) => {
    const tool = new DePINScanMetricsTool();
    const metricsData = await tool.getRawData({ isLatest: args.isLatest });
    const metrics = z.array(DepinScanMetricsSchema).parse(metricsData);

    return {
      metrics: metrics.map((m) => ({
        date: m.date,
        volume: Number(m.volume).toLocaleString(),
        totalProjects: parseInt(m.total_projects),
        marketCap: Number(m.market_cap).toLocaleString(),
        totalDevices: Number(m.total_device).toLocaleString(),
      })),
    };
  },
};

const GetProjectsToolSchema = {
  name: "get_depin_projects",
  description: "Fetches DePINScan projects and their metrics",
  parameters: z.object({
    category: z.string().optional().describe("Filter projects by category"),
    minMarketCap: z.number().optional().describe("Minimum market cap filter"),
    minDevices: z
      .number()
      .optional()
      .describe("Minimum number of devices filter"),
  }),
  execute: async (args: {
    category?: string;
    minMarketCap?: number;
    minDevices?: number;
  }) => {
    const tool = new DePINScanProjectsTool();
    const projectsData = await tool.getRawData();
    const projects = z.array(DepinScanProjectSchema).parse(projectsData);

    let filteredProjects = projects;
    if (args.category) {
      filteredProjects = projects.filter((p) =>
        p.categories.includes(args.category!.toLowerCase())
      );
    }
    if (args.minMarketCap) {
      filteredProjects = filteredProjects.filter(
        (p) => Number(p.market_cap) >= args.minMarketCap!
      );
    }
    if (args.minDevices) {
      filteredProjects = filteredProjects.filter(
        (p) => Number(p.total_devices) >= args.minDevices!
      );
    }

    return {
      totalProjects: filteredProjects.length,
      projects: filteredProjects.map((p) => ({
        name: p.project_name,
        description: p.description,
        token: p.token,
        marketCap: Number(p.market_cap).toLocaleString(),
        tokenPrice: Number(p.token_price).toLocaleString(),
        totalDevices: Number(p.total_devices).toLocaleString(),
        avgDeviceCost: Number(p.avg_device_cost).toLocaleString(),
        estimatedDailyEarnings: Number(
          p.estimated_daily_earnings
        ).toLocaleString(),
        daysToBreakeven: Number(p.days_to_breakeven),
        categories: p.categories,
        layer1: p.layer_1,
      })),
    };
  },
};

type DepinScanMetricsParams = {
  isLatest?: boolean;
};

export class DePINScanMetricsTool extends APITool<DepinScanMetricsParams> {
  schema = [
    { name: GetMetricsToolSchema.name, tool: tool(GetMetricsToolSchema) },
  ];

  constructor() {
    super({
      name: GetMetricsToolSchema.name,
      description: GetMetricsToolSchema.description,
      baseUrl: DEPIN_METRICS_URL,
    });
  }

  async getRawData(
    params: DepinScanMetricsParams
  ): Promise<z.infer<typeof DepinScanMetricsSchema>[]> {
    const res = await fetch(
      DEPIN_METRICS_URL + `${params.isLatest ? "?is_latest=true" : ""}`
    );
    if (!res.ok) {
      throw new Error(`API request failed with status: ${res.status}`);
    }
    const metricsArray = await res.json();
    return z.array(DepinScanMetricsSchema).parse(metricsArray);
  }
}

export class DePINScanProjectsTool extends APITool<void> {
  schema = [
    { name: GetProjectsToolSchema.name, tool: tool(GetProjectsToolSchema) },
  ];

  constructor() {
    super({
      name: GetProjectsToolSchema.name,
      description: GetProjectsToolSchema.description,
      baseUrl: DEPIN_PROJECTS_URL,
    });
  }

  async getRawData(): Promise<z.infer<typeof DepinScanProjectSchema>[]> {
    const res = await fetch(DEPIN_PROJECTS_URL);
    if (!res.ok) {
      throw new Error(`API request failed with status: ${res.status}`);
    }
    const projects = await res.json();
    return z.array(DepinScanProjectSchema).parse(projects);
  }
}
