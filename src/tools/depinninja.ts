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

const GetDePINRevenueToolSchema = {
  name: "get_depin_revenue",
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

class RevenueExecutor {
  async execute(args: { date: string }) {
    return this.withErrorHandling("get_depin_revenue", async () => {
      const url = this.buildUrl(args);
      const data = await this.fetchFromDePINNinja(url);
      const parsedResponse = RevenueResponseSchema.parse(data);
      return parsedResponse;
    });
  }

  private buildUrl(params: { date: string }): string {
    return `${DEPINNINJA_BASE_URL}/external-access/revenue/${params.date}`;
  }

  private async fetchFromDePINNinja(url: string): Promise<any> {
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

  private async withErrorHandling<T>(
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
  ];

  constructor() {
    super({
      name: GetDePINRevenueToolSchema.name,
      description: GetDePINRevenueToolSchema.description,
      baseUrl: DEPINNINJA_BASE_URL,
    });
    if (!process.env.DEPINNINJA_API_KEY) {
      throw new Error("DEPINNINJA_API_KEY environment variable is not set");
    }
  }

  async getRawData(params: { date: string }) {
    return DePINNinjaTool.revenueExecutor.execute(params);
  }
}
