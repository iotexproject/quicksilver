import { z } from "zod";
import { tool } from "ai";

import { APITool } from "./tool";
import { logger } from "../logger/winston";

export const DEPIN_METRICS_URL = "https://gateway1.iotex.io/depinscan/explorer";
export const DEPIN_PROJECTS_URL = "https://metrics-api.w3bstream.com/project";

const DepinScanMetricsSchema = z.object({
  date: z.string().describe("Date of the metrics measurement"),
  volume: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Trading volume"),
  total_projects: z
    .union([z.string(), z.number()])
    .describe("Total number of DePIN projects"),
  market_cap: z
    .union([z.string(), z.number()])
    .describe("Total market capitalization"),
  total_device: z
    .union([z.string(), z.number()])
    .describe("Total number of connected devices"),
});

const DepinScanProjectSchema = z.object({
  project_name: z.string().describe("Name of the DePIN project"),
  slug: z.string().describe("URL-friendly identifier for the project"),
  token: z
    .string()
    .nullable()
    .optional()
    .default("")
    .describe("Project's token symbol"),
  description: z
    .string()
    .nullable()
    .optional()
    .default("")
    .describe("Project description"),
  layer_1: z
    .array(z.string())
    .nullable()
    .optional()
    .default([])
    .describe("Blockchain networks the project operates on"),
  categories: z
    .array(z.string())
    .nullable()
    .optional()
    .default([])
    .describe("Project categories"),
  market_cap: z
    .union([z.string(), z.number()])
    .nullable()
    .describe("Market capitalization of the project"),
  token_price: z
    .union([z.string(), z.number()])
    .nullable()
    .describe("Current token price"),
  total_devices: z
    .union([z.string(), z.number()])
    .describe("Number of devices in the network"),
  avg_device_cost: z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .default("")
    .describe("Average cost per device"),
  days_to_breakeven: z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .default("")
    .describe("Estimated days to break even on device investment"),
  estimated_daily_earnings: z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .default("")
    .describe("Estimated daily earnings per device"),
  chainid: z
    .string()
    .nullable()
    .optional()
    .default("")
    .describe("Primary blockchain network ID"),
  coingecko_id: z
    .string()
    .nullable()
    .optional()
    .default("")
    .describe("CoinGecko API identifier"),
  fully_diluted_valuation: z
    .union([z.string(), z.number()])
    .nullable()
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
    try {
      const tool = new DePINScanMetricsTool();
      const metricsData = await tool.getRawData({ isLatest: args.isLatest });
      const metrics = z.array(DepinScanMetricsSchema).parse(metricsData);

      return {
        metrics: metrics.map((m) => ({
          date: m.date,
          volume: m.volume ? Number(m.volume).toLocaleString() : "N/A",
          totalProjects: Number(m.total_projects || 0),
          marketCap: Number(m.market_cap || 0).toLocaleString(),
          totalDevices: Number(m.total_device || 0).toLocaleString(),
        })),
      };
    } catch (error) {
      logger.error("Error executing get_depin_metrics tool", error);
      return `Error executing get_depin_metrics tool`;
    }
  },
};

const GetProjectsToolSchema = {
  name: "get_depin_projects",
  description: "Fetches DePINScan projects and their metrics",
  parameters: z.object({
    category: z
      .enum([
        "Chain",
        "Server",
        "AI",
        "Wireless",
        "Compute",
        "Sensor",
        "Services",
        "Data",
        "Storage",
        "Cloud",
        "Bandwidth",
        "Mobile",
        "Other",
        "VPN",
        "dVPN",
        "DeWI",
        "Connections",
        "Search/Privacy",
        "Energy",
      ])
      .optional()
      .describe(
        "Filter projects by category. Must be one of the supported categories."
      ),
    layer1: z
      .string()
      .optional()
      .describe(
        "Filter projects by layer 1 blockchain. Can be any valid blockchain name."
      ),
    minMarketCap: z.number().optional().describe("Minimum market cap filter"),
    minDevices: z
      .number()
      .optional()
      .describe("Minimum number of devices filter"),
  }),
  execute: async (args: {
    category?: string;
    layer1?: string;
    minMarketCap?: number;
    minDevices?: number;
  }) => {
    try {
      const tool = new DePINScanProjectsTool();
      const projectsData = await tool.getRawData();
      const projects = z.array(DepinScanProjectSchema).parse(projectsData);

      let filteredProjects = projects;
      if (args.category) {
        filteredProjects = filteredProjects.filter((p) => {
          const lowerCaseCategory = args.category!.toLowerCase();
          return (
            p.categories?.some((c) => c.toLowerCase() === lowerCaseCategory) ??
            false
          );
        });
      }
      if (args.layer1) {
        filteredProjects = filteredProjects.filter((p) => {
          return p.layer_1?.includes(args.layer1!) ?? false;
        });
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
          description: p.description || "",
          token: p.token || "",
          marketCap: Number(p.market_cap || 0).toLocaleString(),
          tokenPrice: Number(p.token_price || 0).toLocaleString(),
          totalDevices: Number(p.total_devices || 0).toLocaleString(),
          avgDeviceCost: Number(p.avg_device_cost || 0).toLocaleString(),
          estimatedDailyEarnings: Number(
            p.estimated_daily_earnings || 0
          ).toLocaleString(),
          daysToBreakeven: Number(p.days_to_breakeven || 0),
          categories: p.categories || [],
          layer1: p.layer_1 || [],
        })),
      };
    } catch (error) {
      logger.error("Error executing get_depin_projects tool", error);
      return `Error executing get_depin_projects tool`;
    }
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
    return await res.json();
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
    return await res.json();
  }
}
