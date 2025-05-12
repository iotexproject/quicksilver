import { tool } from 'ai';
import { z } from 'zod';

import { APITool } from './tool';
import { logger } from '../logger/winston';

export const DEPINNINJA_BASE_URL = 'https://api.depin.ninja';

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
  arr: z.number().nullable(),
  mrr: z.number().nullable(),
  normalizedRevenueFor30Days: z.number().nullable(),
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

type RevenueResponse = z.infer<typeof RevenueResponseSchema>;
type RevenueProjectResponse = z.infer<typeof RevenueProjectSchema>;

const GetDePINRevenueToolSchema = {
  name: 'get_depin_revenue_by_date',
  description:
    "Fetches total revenue breakdown by project for a specific date. Returns a list of all projects' revenues in USD for that day. " +
    "Use this when you need to compare multiple projects' revenues on a specific date. " +
    'To get detailed revenue metrics for a specific project, use get_last_depin_revenue_data instead.',
  parameters: z.object({
    date: z.string().describe('Date in YYYY-MM-DD format'),
  }),
  execute: async (args: { date: string }) => {
    const tool = new RevenueExecutor();
    return tool.execute(args);
  },
};

const GetDePINRevenueDataToolSchema = {
  name: 'get_last_depin_revenue_data',
  description:
    'Fetches detailed revenue metrics for a specific DePIN project. ' +
    "Use this when you need information about a particular project's revenue performance. Returns: " +
    '- ARR (Annual Recurring Revenue) ' +
    '- MRR (Monthly Recurring Revenue) ' +
    '- Normalized revenue for last 30 days ' +
    '- Optional historical daily revenue data (use only when trend analysis is needed) ' +
    "\nExample: For questions like 'How is Filecoin performing?' or 'What's the recent revenue of IoTeX?', use this tool with the appropriate project name.",
  parameters: z.object({
    projectName: z
      .string()
      .default('iotex')
      .describe("Project name to fetch data for (defaults to 'iotex'). Example: 'filecoin', 'iotex', 'akash'"),
    getRevenueHistoricalData: z
      .boolean()
      .optional()
      .describe(
        'Include historical daily revenue data in the response. Use only when historical analysis is required as it significantly increases response size'
      ),
  }),
  execute: async (args: { projectName: string; getRevenueHistoricalData?: boolean }) => {
    const tool = new RevenueDataExecutor();
    return tool.execute({
      ...args,
      projectName: args.projectName ?? 'iotex',
    });
  },
};

abstract class BaseDepiNinjaExecutor {
  protected async fetchFromDePINNinja(url: string): Promise<any> {
    const response = await fetch(url, {
      headers: {
        'x-api-key': process.env.DEPINNINJA_API_KEY || '',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    return response.json();
  }

  protected async withErrorHandling<T>(operation: string, action: () => Promise<T>): Promise<T | string> {
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
  async execute(args: { date: string }): Promise<RevenueResponse | string> {
    return this.withErrorHandling<RevenueResponse>('get_depin_revenue_by_date', async () => {
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
  }): Promise<{ project: RevenueProjectResponse } | string> {
    return this.withErrorHandling<{ project: RevenueProjectResponse }>('get_last_depin_revenue_data', async () => {
      return this.getProjectData(args.projectName, args.getRevenueHistoricalData);
    });
  }

  private async getProjectData(
    projectName: string,
    includeHistory?: boolean
  ): Promise<{ project: RevenueProjectResponse }> {
    // First, get total pages
    const initialUrl = this.buildUrl({
      page: 1,
      projectName,
      getRevenueHistoricalData: includeHistory,
    });
    console.log('initialUrl', initialUrl);
    const initialData = await this.fetchFromDePINNinja(initialUrl);
    const { totalPages } = RevenueDataResponseSchema.parse(initialData);

    // Fetch the last page
    const lastPageUrl = this.buildUrl({
      page: totalPages,
      projectName,
      getRevenueHistoricalData: includeHistory,
    });
    console.log('lastPageUrl', lastPageUrl);
    const lastPageData = await this.fetchFromDePINNinja(lastPageUrl);
    const parsedData = RevenueDataResponseSchema.parse(lastPageData);

    // If we have data, ensure null values are handled properly
    if (parsedData.data.length > 0) {
      const project = parsedData.data[parsedData.data.length - 1];
      // Convert null values to 0 to ensure consistent data structure
      project.arr = project.arr === null ? 0 : project.arr;
      project.mrr = project.mrr === null ? 0 : project.mrr;
      project.normalizedRevenueFor30Days =
        project.normalizedRevenueFor30Days === null ? 0 : project.normalizedRevenueFor30Days;

      return { project };
    }

    // Handle case when no data is returned
    throw new Error(`No data found for project: ${projectName}`);
  }

  private buildUrl(params: { page: number; projectName: string; getRevenueHistoricalData?: boolean }): string {
    const queryParams = new URLSearchParams();

    queryParams.append('page', params.page.toString());
    // API only allows 10, 20 or 50 projects per page
    queryParams.append('limit', '10');
    queryParams.append('projectName', params.projectName);
    if (params.getRevenueHistoricalData) queryParams.append('getRevenueHistoricalData', 'true');

    return `${DEPINNINJA_BASE_URL}/external-access/revenue?${queryParams.toString()}`;
  }
}

export class DePINNinjaTool extends APITool<{
  date: string;
}> {
  private static readonly revenueExecutor = new RevenueExecutor();

  schema = [
    {
      name: GetDePINRevenueToolSchema.name,
      tool: tool(GetDePINRevenueToolSchema),
    },
    {
      name: GetDePINRevenueDataToolSchema.name,
      tool: tool(GetDePINRevenueDataToolSchema),
    },
  ];

  constructor() {
    super({
      name: GetDePINRevenueToolSchema.name,
      description: GetDePINRevenueToolSchema.description,
      baseUrl: DEPINNINJA_BASE_URL,
      twitterAccount: 'EV3ventures',
    });
    if (!process.env.DEPINNINJA_API_KEY) {
      throw new Error('DEPINNINJA_API_KEY environment variable is not set');
    }
  }

  // Only enable revenue by specific data for raw data
  async getRawData(params: { date: string }): Promise<RevenueResponse | string> {
    return DePINNinjaTool.revenueExecutor.execute(params);
  }
}
