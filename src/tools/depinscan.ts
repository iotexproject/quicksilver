import { LLMService } from "../llm/llm-service";
import { depinScanProjectsTemplate } from "./templates";
import { APITool } from "./tool";

export const DEPIN_METRICS_URL = "https://gateway1.iotex.io/depinscan/explorer";
export const DEPIN_PROJECTS_URL = "https://metrics-api.w3bstream.com/project";

export type DepinScanMetrics = {
  date: string;
  volume: string;
  total_projects: string;
  market_cap: string;
  total_device: string;
};

export type DepinScanProject = {
  project_name: string;
  slug: string;
  token: string;
  description: string;
  layer_1: string[];
  categories: string[];
  market_cap: string;
  token_price: string;
  total_devices: string;
  avg_device_cost: string;
  days_to_breakeven: string;
  estimated_daily_earnings: string;
  chainid: string;
  coingecko_id: string;
  fully_diluted_valuation: string;
};

export class DePINScanMetricsTool extends APITool<void> {
  constructor() {
    super({
      name: "DePINScanMetrics",
      description:
        "Fetches Global DePINScan (Decentralized Physical Infrastructure) metrics",
      output: "volume, market_cap, total_device, total_projects",
      baseUrl: DEPIN_METRICS_URL,
    });
  }

  async execute(_: string): Promise<string> {
    try {
      const res = await fetch(DEPIN_METRICS_URL);
      const metricsArray: DepinScanMetrics[] = await res.json();

      // Get the latest metrics (first item in the array)
      return JSON.stringify(metricsArray);
    } catch (error) {
      console.error("DePINMetrics Error:", error);
      return `Error fetching DePIN metrics: ${error}`;
    }
  }

  async parseInput(_: any): Promise<void> {
    return;
  }
}

export class DePINScanProjectsTool extends APITool<void> {
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
      const projects = await this.fetchData();

      // Let the LLM extract relevant projects and fields based on the query
      const prompt = depinScanProjectsTemplate(input, projects);

      const response = await llmService.fastllm.generate(prompt);
      return response;
    } catch (error) {
      console.error("DePINProjects Error:", error);
      return `Error fetching DePIN projects: ${error}`;
    }
  }

  async fetchData(): Promise<DepinScanProject[]> {
    const res = await fetch(DEPIN_PROJECTS_URL);
    return await res.json();
  }

  async parseInput(_: any): Promise<void> {
    return;
  }
}
