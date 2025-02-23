import { extractContentFromTags } from "../utils/parsers";
import { LLMService } from "../llm/llm-service";
import { depinScanProjectsTemplate } from "./templates";
import { APITool } from "./tool";
import { logger } from "../logger/winston";

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

type DepinScanMetricsParams = {
  isLatest?: boolean;
};

export class DePINScanMetricsTool extends APITool<DepinScanMetricsParams> {
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
      const response = await llmService.fastllm.generate(metrics);
      return response;
    } catch (error) {
      logger.error("DePINMetrics Error:", error);
      return `Error fetching DePIN metrics: ${error}`;
    }
  }

  async parseInput(
    input: string,
    llmService: LLMService,
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
      DEPIN_METRICS_URL + `${params.isLatest ? "?is_latest=true" : ""}`,
    );
    const metricsArray: DepinScanMetrics[] = await res.json();
    return JSON.stringify(metricsArray);
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
      const projects = await this.getRawData();
      const projectsArray: DepinScanProject[] = JSON.parse(projects);

      // Let the LLM extract relevant projects and fields based on the query
      const prompt = depinScanProjectsTemplate(input, projectsArray);

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
    const projects: DepinScanProject[] = await res.json();
    return JSON.stringify(projects);
  }
}
