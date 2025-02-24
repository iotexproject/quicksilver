import { z } from "zod";
import { tool } from "ai";

import { extractContentFromTags } from "../utils/parsers";
import { LLMService } from "../llm/llm-service";
import { depinScanProjectsTemplate } from "./templates";
import { APITool } from "./tool";
import { logger } from "../logger/winston";

export const DEPIN_METRICS_URL = "https://gateway1.iotex.io/depinscan/explorer";
export const DEPIN_PROJECTS_URL = "https://metrics-api.w3bstream.com/project";

// Zod Schemas
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
    const metrics = JSON.parse(metricsData);

    return {
      metrics: metrics.map((m: z.infer<typeof DepinScanMetricsSchema>) => ({
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
    const projects = JSON.parse(projectsData);

    let filteredProjects = projects;
    if (args.category) {
      filteredProjects = projects.filter(
        (p: z.infer<typeof DepinScanProjectSchema>) =>
          p.categories.includes(args.category!.toLowerCase())
      );
    }
    if (args.minMarketCap) {
      filteredProjects = filteredProjects.filter(
        (p: z.infer<typeof DepinScanProjectSchema>) =>
          Number(p.market_cap) >= args.minMarketCap!
      );
    }
    if (args.minDevices) {
      filteredProjects = filteredProjects.filter(
        (p: z.infer<typeof DepinScanProjectSchema>) =>
          Number(p.total_devices) >= args.minDevices!
      );
    }

    return {
      totalProjects: filteredProjects.length,
      projects: filteredProjects.map(
        (p: z.infer<typeof DepinScanProjectSchema>) => ({
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
        })
      ),
    };
  },
};

// Types
type DepinScanMetrics = z.infer<typeof DepinScanMetricsSchema>;
type DepinScanProject = z.infer<typeof DepinScanProjectSchema>;
type DepinScanMetricsParams = {
  isLatest?: boolean;
};

export class DePINScanMetricsTool extends APITool<DepinScanMetricsParams> {
  schema = [{ name: "get_depin_metrics", tool: tool(GetMetricsToolSchema) }];

  constructor() {
    super({
      name: "DePINScanMetrics",
      description:
        "Fetches Global DePINScan (Decentralized Physical Infrastructure) metrics",
      output: "volume, market_cap, total_device, total_projects",
      baseUrl: DEPIN_METRICS_URL,
    });
  }

  async execute(input: string, llmService: LLMService): Promise<string> {
    try {
      const params = await this.parseInput(input, llmService);
      const metrics = await this.getRawData(params);
      const validatedMetrics = z
        .array(DepinScanMetricsSchema)
        .parse(JSON.parse(metrics));
      const response = await llmService.fastllm.generate(
        JSON.stringify(validatedMetrics)
      );
      return response;
    } catch (error) {
      logger.error("DePINMetrics Error:", error);
      return `Error fetching DePIN metrics: ${error}`;
    }
  }

  async parseInput(
    input: string,
    llmService: LLMService
  ): Promise<DepinScanMetricsParams> {
    const prompt = `
    You are a helpful assistant that parses the user's query and returns the parameters for the DePINScanMetricsTool.
    The user's query is: ${input}
    The parameters are:
    - isLatest: boolean

    Your task is to identify if only the latest metrics (for the current day) are needed or more historical metrics are needed.
    Keep in mind:
    - Historical metrics can be helpful to understand the trends over time.
    - The user might be interested in the metrics for a specific date range.
    - If the user is interested in the latest metrics, return { isLatest: true }.
    - If the user is interested in historical metrics, return { isLatest: false }.
    - If impossible to determine, return { isLatest: true }.

    Output should be in <response> tags.

    <response>
    {
      "isLatest": true
    }
    </response>
    `;

    const response = await llmService.fastllm.generate(prompt);
    const extractedResponse = extractContentFromTags(response, "response");
    if (!extractedResponse) {
      return { isLatest: true };
    }
    return JSON.parse(extractedResponse);
  }

  async getRawData(params: DepinScanMetricsParams): Promise<string> {
    const res = await fetch(
      DEPIN_METRICS_URL + `${params.isLatest ? "?is_latest=true" : ""}`
    );
    const metricsArray = await res.json();
    // Validate the response data
    const validatedMetrics = z
      .array(DepinScanMetricsSchema)
      .parse(metricsArray);
    return JSON.stringify(validatedMetrics);
  }
}

export class DePINScanProjectsTool extends APITool<void> {
  schema = [{ name: "get_depin_projects", tool: tool(GetProjectsToolSchema) }];

  constructor() {
    super({
      name: "DePINScanProjects",
      description:
        "Fetches DePINScan (Decentralized Physical Infrastructure) projects metrics. You can ask about specific projects, categories, or metrics.",
      output:
        "Project details including: project name, description, market cap, token price, total devices, device cost, earnings, and categories",
      baseUrl: DEPIN_PROJECTS_URL,
    });
  }

  async execute(input: string, llmService: LLMService): Promise<string> {
    try {
      const projects = await this.getRawData();
      const validatedProjects = z
        .array(DepinScanProjectSchema)
        .parse(JSON.parse(projects));

      // Let the LLM extract relevant projects and fields based on the query
      const prompt = depinScanProjectsTemplate(input, validatedProjects);

      const response = await llmService.fastllm.generate(prompt);
      return response;
    } catch (error) {
      logger.error("DePINProjects Error:", error);
      return `Error fetching DePIN projects: ${error}`;
    }
  }

  async parseInput(_: any): Promise<void> {
    return;
  }

  async getRawData(): Promise<string> {
    const res = await fetch(DEPIN_PROJECTS_URL);
    const projects = await res.json();
    // Validate the response data
    // const validatedProjects = z.array(DepinScanProjectSchema).parse(projects);
    return JSON.stringify(projects);
  }
}
