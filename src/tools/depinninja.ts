import { z } from "zod";
import { tool } from "ai";
import { APITool } from "./tool";
import { logger } from "../logger/winston";

export const DEPINNINJA_BASE_URL = "https://api.depin.ninja";

const RevenueBreakdownSchema = z.object({
  name: z.string(),
  revenue: z.number(),
});

const RevenueResponseSchema = z.object({
  totalRevenue: z.number(),
  breakDown: z.array(RevenueBreakdownSchema),
});

const RevenueDataPointSchema = z.object({
  date: z.string(),
  revenue: z.number(),
});

const RevenueProjectSchema = z.object({
  id: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  arr: z.number(),
  mrr: z.number(),
  normalizedRevenueFor30Days: z.number(),
  projectId: z.string(),
  name: z.string(),
  category: z.string(),
  chain: z.string(),
  revenueData: z.array(RevenueDataPointSchema).optional(),
});

const RevenueDataResponseSchema = z.object({
  page: z.number(),
  totalPages: z.number(),
  limit: z.number(),
  data: z.array(RevenueProjectSchema),
});

const GetDePINRevenueByDateToolSchema = {
  name: "get_depin_revenue_by_date",
  description:
    "Fetches DePIN projects' revenue data in USD from DePIN Ninja API for a specific date",
  parameters: z.object({
    date: z.string().describe("Date in YYYY-MM-DD format"),
  }),
  execute: async (args: { date: string }) => {
    const tool = new RevenueExecutor();
    return tool.execute(args);
  },
};

const GetDePINRevenueDataToolSchema = {
  name: "get_depin_revenue_data",
  description:
    "Fetches latest DePIN project revenue data including: ARR (Annual Recurring Revenue)," +
    " MRR (Monthly Recurring Revenue), normalized revenue for last 30 days," +
    " and optional historical daily revenue data",
  parameters: z.object({
    projectName: z
      .string()
      .default("iotex")
      .describe("Project name to fetch data for (defaults to 'iotex')"),
    getRevenueHistoricalData: z
      .boolean()
      .optional()
      .describe(
        "Include historical daily revenue data in the response. Use only when historical" +
          " analysis is required as it significantly increases response size"
      ),
  }),
  execute: async (args: {
    projectName: string;
    getRevenueHistoricalData?: boolean;
  }) => {
    const tool = new RevenueDataExecutor();
    return tool.execute(args);
  },
};

abstract class BaseDepiNinjaExecutor {
  protected async fetchFromDePINNinja(url: string): Promise<any> {
    const response = await fetch(url, {
      headers: {
        "x-api-key": process.env.DEPINNINJA_API_KEY || "",
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    return response.json();
  }

  protected async withErrorHandling<T>(
    operation: string,
    action: () => Promise<T>
  ): Promise<T | string> {
    try {
      return await action();
    } catch (error) {
      logger.error(`Error executing ${operation}`, error);
      return `Error executing ${operation} tool`;
    }
  }

  abstract execute(args: any): Promise<any>;
}

class RevenueExecutor extends BaseDepiNinjaExecutor {
  async execute(args: { date: string }) {
    return this.withErrorHandling("get_depin_revenue_by_date", async () => {
      const url = this.buildUrl(args);
      const data = await this.fetchFromDePINNinja(url);
      const parsedResponse = RevenueResponseSchema.parse(data);
      return parsedResponse;
    });
  }

  private buildUrl(params: { date: string }): string {
    return `${DEPINNINJA_BASE_URL}/external-access/revenue/${params.date}`;
  }
}

class RevenueDataExecutor extends BaseDepiNinjaExecutor {
  async execute(args: {
    projectName: string;
    getRevenueHistoricalData?: boolean;
  }) {
    return this.withErrorHandling("get_depin_revenue_data", async () => {
      return this.getProjectData(
        args.projectName,
        args.getRevenueHistoricalData
      );
    });
  }

  private async getProjectData(
    projectName: string,
    includeHistory?: boolean
  ): Promise<{ project: z.infer<typeof RevenueProjectSchema> }> {
    // First, get total pages
    const initialUrl = this.buildUrl({
      page: 1,
      limit: 10,
      projectName,
      getRevenueHistoricalData: includeHistory,
    });
    const initialData = await this.fetchFromDePINNinja(initialUrl);
    const { totalPages } = RevenueDataResponseSchema.parse(initialData);

    // Fetch the last page
    const lastPageUrl = this.buildUrl({
      page: totalPages,
      limit: 50,
      projectName,
      getRevenueHistoricalData: includeHistory,
    });
    const lastPageData = await this.fetchFromDePINNinja(lastPageUrl);
    const parsedData = RevenueDataResponseSchema.parse(lastPageData);

    // Return the most recent project data
    return {
      project: parsedData.data[parsedData.data.length - 1],
    };
  }

  private buildUrl(params: {
    page: number;
    limit: 10 | 20 | 50;
    projectName?: string;
    getRevenueHistoricalData?: boolean;
  }): string {
    const queryParams = new URLSearchParams();

    queryParams.append("page", params.page.toString());
    queryParams.append("limit", params.limit.toString());
    if (params.projectName)
      queryParams.append("projectName", params.projectName);
    if (params.getRevenueHistoricalData)
      queryParams.append("getRevenueHistoricalData", "true");

    return `${DEPINNINJA_BASE_URL}/external-access/revenue?${queryParams.toString()}`;
  }
}

export class DePINNinjaTool extends APITool<{
  date: string;
}> {
  private static readonly revenueExecutor = new RevenueExecutor();

  schema = [
    {
      name: GetDePINRevenueByDateToolSchema.name,
      tool: tool(GetDePINRevenueByDateToolSchema),
    },
    {
      name: GetDePINRevenueDataToolSchema.name,
      tool: tool(GetDePINRevenueDataToolSchema),
    },
  ];

  constructor() {
    super({
      name: GetDePINRevenueByDateToolSchema.name,
      description: GetDePINRevenueByDateToolSchema.description,
      baseUrl: DEPINNINJA_BASE_URL,
    });
    if (!process.env.DEPINNINJA_API_KEY) {
      throw new Error("DEPINNINJA_API_KEY environment variable is not set");
    }
  }

  // Only enable revenue by specific data for raw data
  async getRawData(params: { date: string }) {
    return DePINNinjaTool.revenueExecutor.execute(params);
  }
}
