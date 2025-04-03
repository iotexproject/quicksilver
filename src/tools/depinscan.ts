import { tool } from 'ai';
import { z } from 'zod';

import { APITool } from './tool';
import { logger } from '../logger/winston';

export const DEPIN_METRICS_URL = 'https://gateway1.iotex.io/depinscan/explorer';
export const DEPIN_PROJECTS_URL = 'https://metrics-api.w3bstream.com/project';

const DepinScanMetricsSchema = z.object({
  date: z.string().describe('Date of the metrics measurement'),
  volume: z.union([z.string(), z.number()]).optional().describe('Trading volume'),
  total_projects: z.union([z.string(), z.number()]).describe('Total number of DePIN projects'),
  market_cap: z.union([z.string(), z.number()]).describe('Total market capitalization'),
  total_device: z.union([z.string(), z.number()]).describe('Total number of connected devices'),
});

const DepinScanProjectSchema = z.object({
  project_name: z.string().describe('Name of the DePIN project'),
  slug: z.string().describe('URL-friendly identifier for the project'),
  token: z.string().nullable().optional().default('').describe("Project's token symbol"),
  description: z.string().nullable().optional().default('').describe('Project description'),
  layer_1: z
    .array(z.string())
    .nullable()
    .optional()
    .default([])
    .describe('Blockchain networks the project operates on'),
  categories: z.array(z.string()).nullable().optional().default([]).describe('Project categories'),
  market_cap: z.union([z.string(), z.number()]).nullable().optional().describe('Market capitalization of the project'),
  token_price: z.union([z.string(), z.number()]).nullable().describe('Current token price'),
  total_devices: z.union([z.string(), z.number()]).nullable().describe('Number of devices in the network'),
  avg_device_cost: z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .default('')
    .describe('Average cost per device'),
  days_to_breakeven: z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .default('')
    .describe('Estimated days to break even on device investment'),
  estimated_daily_earnings: z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .default('')
    .describe('Estimated daily earnings per device'),
  chainid: z.string().nullable().optional().default('').describe('Primary blockchain network ID'),
  coingecko_id: z.string().nullable().optional().default('').describe('CoinGecko API identifier'),
  fully_diluted_valuation: z
    .union([z.string(), z.number()])
    .nullable()
    .describe('Fully diluted valuation of the project'),
});

const GetMetricsToolSchema = {
  name: 'get_depin_metrics',
  description: 'Fetches Global DePINScan metrics for market analysis',
  parameters: z.object({
    isLatest: z.boolean().default(true).describe('Whether to fetch only the latest metrics or historical data'),
  }),
  execute: async (args: { isLatest: boolean }) => {
    try {
      const tool = new DePINScanMetricsTool();
      const metricsData = await tool.getRawData({ isLatest: args.isLatest });
      const metrics = z.array(DepinScanMetricsSchema).parse(metricsData);

      return {
        metrics: metrics.map(m => ({
          date: m.date,
          volume: m.volume ? Number(m.volume).toLocaleString() : 'N/A',
          totalProjects: Number(m.total_projects || 0),
          marketCap: Number(m.market_cap || 0).toLocaleString(),
          totalDevices: Number(m.total_device || 0).toLocaleString(),
        })),
      };
    } catch (error) {
      logger.error('Error executing get_depin_metrics tool', error);
      return `Error executing get_depin_metrics tool`;
    }
  },
};

const GetProjectsToolSchema: {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any) => Promise<any>;
} = {
  name: 'get_depin_projects',
  description:
    'Fetches DePINScan projects and their metrics. For optimal performance and relevance, use available filters:\n' +
    '- Applying multiple filters reduces data processing and improves response relevance\n' +
    "- When specific values aren't provided, use sensible defaults (e.g., minMarketCap > 0 for market-related queries)\n" +
    '- Filter out projects with missing or invalid data when the field is relevant to the query\n' +
    '- Set requireDescription to true only when project descriptions are needed to save processing tokens',
  parameters: z.object({
    category: z
      .enum([
        'Chain',
        'Server',
        'AI',
        'Wireless',
        'Compute',
        'Sensor',
        'Services',
        'Data',
        'Storage',
        'Cloud',
        'Bandwidth',
        'Mobile',
        'Other',
        'VPN',
        'dVPN',
        'DeWI',
        'Connections',
        'Search/Privacy',
        'Energy',
      ])
      .optional()
      .describe('Filter by project category. Use when analyzing specific sector or comparing similar projects'),
    layer1: z
      .string()
      .optional()
      .describe(
        'Filter by blockchain network. Use when analyzing projects on specific chains or comparing cross-chain metrics'
      ),
    minMarketCap: z
      .number()
      .optional()
      .describe(
        'Filter by minimum market cap. For market-related queries, use minMarketCap > 0 to exclude projects without market data'
      ),
    minDevices: z
      .number()
      .optional()
      .describe(
        'Filter by minimum devices. For network size analysis, use minDevices > 0 to exclude inactive or pre-launch projects'
      ),
    requireToken: z
      .boolean()
      .optional()
      .describe('Filter out projects without tokens. Set to true when analyzing token metrics or tokenomics'),
    minTokenPrice: z
      .number()
      .optional()
      .describe(
        'Filter by minimum token price. For token analysis, use minTokenPrice > 0 to exclude inactive or unlaunched tokens'
      ),
    minDailyEarnings: z
      .number()
      .optional()
      .describe(
        'Filter by minimum daily earnings. For profitability analysis, use minDailyEarnings > 0 to exclude non-earning projects'
      ),
    maxDaysToBreakeven: z
      .number()
      .optional()
      .describe(
        'Filter by maximum days to breakeven. For ROI analysis, exclude projects with unrealistic or missing breakeven data'
      ),
    requireDescription: z
      .boolean()
      .default(false)
      .describe('Include project descriptions in the response. Set to true only when descriptions are needed'),
  }),
  execute: async (args: z.infer<typeof GetProjectsToolSchema.parameters>) => {
    try {
      const tool = new DePINScanProjectsTool();
      const projectsData = await tool.getRawData();
      const projects = z.array(DepinScanProjectSchema).parse(projectsData);

      let filteredProjects = filterProjects(projects, args);

      return {
        totalProjects: filteredProjects.length,
        projects: filteredProjects.map(p => ({
          name: p.project_name,
          ...(args.requireDescription ? { description: p.description || '' } : {}),
          token: p.token || '',
          marketCap: Number(p.market_cap || 0).toLocaleString(),
          tokenPrice: Number(p.token_price || 0).toLocaleString(),
          totalDevices: Number(p.total_devices || 0).toLocaleString(),
          avgDeviceCost: Number(p.avg_device_cost || 0).toLocaleString(),
          estimatedDailyEarnings: Number(p.estimated_daily_earnings || 0).toLocaleString(),
          daysToBreakeven: Number(p.days_to_breakeven || 0),
          categories: p.categories || [],
          layer1: p.layer_1 || [],
        })),
      };
    } catch (error) {
      logger.error('Error executing get_depin_projects tool', error);
      return `Error executing get_depin_projects tool`;
    }
  },
};

function filterProjects(
  projects: z.infer<typeof DepinScanProjectSchema>[],
  args: z.infer<typeof GetProjectsToolSchema.parameters>
) {
  let filteredProjects = projects;
  if (args.category) {
    filteredProjects = filteredProjects.filter(p => {
      const lowerCaseCategory = args.category!.toLowerCase();
      return p.categories?.some(c => c.toLowerCase() === lowerCaseCategory) ?? false;
    });
  }
  if (args.layer1) {
    filteredProjects = filteredProjects.filter(p => {
      return p.layer_1?.includes(args.layer1!) ?? false;
    });
  }
  if (args.minMarketCap !== undefined) {
    filteredProjects = filteredProjects.filter(
      p => p.market_cap && Number(p.market_cap) > 0 && Number(p.market_cap) >= (args.minMarketCap ?? 0)
    );
  }
  if (args.minDevices !== undefined) {
    filteredProjects = filteredProjects.filter(
      p => p.total_devices && Number(p.total_devices) > 0 && Number(p.total_devices) >= (args.minDevices ?? 0)
    );
  }

  if (args.requireToken) {
    filteredProjects = filteredProjects.filter(p => p.token && p.token.length > 0);
  }

  if (args.minTokenPrice !== undefined) {
    filteredProjects = filteredProjects.filter(
      p => p.token_price && Number(p.token_price) > 0 && Number(p.token_price) >= (args.minTokenPrice ?? 0)
    );
  }

  if (args.minDailyEarnings !== undefined) {
    filteredProjects = filteredProjects.filter(
      p =>
        p.estimated_daily_earnings &&
        Number(p.estimated_daily_earnings) > 0 &&
        Number(p.estimated_daily_earnings) >= (args.minDailyEarnings ?? 0)
    );
  }

  if (args.maxDaysToBreakeven !== undefined) {
    filteredProjects = filteredProjects.filter(
      p =>
        p.days_to_breakeven &&
        Number(p.days_to_breakeven) > 0 &&
        Number(p.days_to_breakeven) <= (args.maxDaysToBreakeven ?? Infinity)
    );
  }
  return filteredProjects;
}

type DepinScanMetricsParams = {
  isLatest?: boolean;
};

export class DePINScanMetricsTool extends APITool<DepinScanMetricsParams> {
  schema = [{ name: GetMetricsToolSchema.name, tool: tool(GetMetricsToolSchema) }];

  constructor() {
    super({
      name: GetMetricsToolSchema.name,
      description: GetMetricsToolSchema.description,
      baseUrl: DEPIN_METRICS_URL,
    });
  }

  async getRawData(params: DepinScanMetricsParams): Promise<z.infer<typeof DepinScanMetricsSchema>[]> {
    const res = await fetch(DEPIN_METRICS_URL + `${params.isLatest ? '?is_latest=true' : ''}`);
    if (!res.ok) {
      throw new Error(`API request failed with status: ${res.status}`);
    }
    return await res.json();
  }
}

export class DePINScanProjectsTool extends APITool<void> {
  schema = [{ name: GetProjectsToolSchema.name, tool: tool(GetProjectsToolSchema) }];

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
