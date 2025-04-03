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
          marketCap: numberOrZeroIfNanToString(p.market_cap),
          tokenPrice: numberOrZeroIfNanToString(p.token_price),
          totalDevices: numberOrZeroIfNanToString(p.total_devices),
          avgDeviceCost: numberOrZeroIfNanToString(p.avg_device_cost),
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

type DepinScanMetricsParams = {
  isLatest?: boolean;
};
type DepinScanMetricsResponse = z.infer<typeof DepinScanMetricsSchema>[];
type DepinScanProjectResponse = z.infer<typeof DepinScanProjectSchema>[];

type FilterPredicate = (project: DepinScanProjectResponse[number]) => boolean;

const ProjectFilters = {
  byCategory:
    (category: string): FilterPredicate =>
    project =>
      project.categories?.some(c => c.toLowerCase() === category.toLowerCase()) ?? false,

  byLayer1:
    (layer1: string): FilterPredicate =>
    project =>
      project.layer_1?.includes(layer1) ?? false,

  byMinNumber:
    (value: number, field: keyof DepinScanProjectResponse[number]): FilterPredicate =>
    project => {
      const projectValue = project[field];
      const numericValue = typeof projectValue === 'string' ? Number(projectValue) : projectValue;
      return typeof numericValue === 'number' && !isNaN(numericValue) && numericValue > 0 && numericValue >= value;
    },

  byMaxNumber:
    (value: number, field: keyof DepinScanProjectResponse[number]): FilterPredicate =>
    project => {
      const projectValue = project[field];
      return typeof projectValue === 'string' && Number(projectValue) > 0 && Number(projectValue) <= value;
    },

  hasToken: (): FilterPredicate => project => Boolean(project.token?.length),
};

interface FilterConfig {
  condition: (args: z.infer<typeof GetProjectsToolSchema.parameters>) => boolean;
  createFilter: (args: z.infer<typeof GetProjectsToolSchema.parameters>) => FilterPredicate;
}

const filterConfigs: Record<string, FilterConfig> = {
  category: {
    condition: args => Boolean(args.category),
    createFilter: args => ProjectFilters.byCategory(args.category!),
  },
  layer1: {
    condition: args => Boolean(args.layer1),
    createFilter: args => ProjectFilters.byLayer1(args.layer1!),
  },
  minMarketCap: {
    condition: args => args.minMarketCap !== undefined,
    createFilter: args => ProjectFilters.byMinNumber(args.minMarketCap!, 'market_cap'),
  },
  minDevices: {
    condition: args => args.minDevices !== undefined,
    createFilter: args => ProjectFilters.byMinNumber(args.minDevices!, 'total_devices'),
  },
  requireToken: {
    condition: args => Boolean(args.requireToken),
    createFilter: () => ProjectFilters.hasToken(),
  },
  minTokenPrice: {
    condition: args => args.minTokenPrice !== undefined,
    createFilter: args => ProjectFilters.byMinNumber(args.minTokenPrice!, 'token_price'),
  },
  minDailyEarnings: {
    condition: args => args.minDailyEarnings !== undefined,
    createFilter: args => ProjectFilters.byMinNumber(args.minDailyEarnings!, 'estimated_daily_earnings'),
  },
  maxDaysToBreakeven: {
    condition: args => args.maxDaysToBreakeven !== undefined,
    createFilter: args => ProjectFilters.byMaxNumber(args.maxDaysToBreakeven!, 'days_to_breakeven'),
  },
};

function getActiveFilters(args: z.infer<typeof GetProjectsToolSchema.parameters>): FilterPredicate[] {
  return Object.values(filterConfigs)
    .filter(config => config.condition(args))
    .map(config => config.createFilter(args));
}

function filterProjects(
  projects: DepinScanProjectResponse,
  args: z.infer<typeof GetProjectsToolSchema.parameters>
): DepinScanProjectResponse {
  const filters = getActiveFilters(args);
  return projects.filter(project => filters.every(filter => filter(project)));
}

export class DePINScanMetricsTool extends APITool<DepinScanMetricsParams> {
  schema = [{ name: GetMetricsToolSchema.name, tool: tool(GetMetricsToolSchema) }];

  constructor() {
    super({
      name: GetMetricsToolSchema.name,
      description: GetMetricsToolSchema.description,
      baseUrl: DEPIN_METRICS_URL,
    });
  }

  async getRawData(params: DepinScanMetricsParams): Promise<DepinScanMetricsResponse> {
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

  async getRawData(): Promise<DepinScanProjectResponse> {
    const res = await fetch(DEPIN_PROJECTS_URL);
    if (!res.ok) {
      throw new Error(`API request failed with status: ${res.status}`);
    }
    return await res.json();
  }
}

function numberOrZeroIfNanToString(value: string | number | null | undefined): string {
  return Number(value || 0).toLocaleString();
}
