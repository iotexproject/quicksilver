import { tool } from 'ai';
import { formatEther } from 'ethers';
import { z } from 'zod';

import { APITool } from './tool';
import { logger } from '../logger/winston';

const ANALYTICS_API = 'https://gateway1.iotex.me/analyzer';
const GQL_ANALYTICS = 'https://analyser-api.iotex.io/graphql';

// Add underscore, remove if decide to use schemas for parsing
const _L1StatsSchema = z.object({
  tvl: z.number().describe('Total Value Locked in the chain'),
  contracts: z.number().describe('Number of deployed contracts'),
  totalStaked: z.number().describe('Total amount of IOTX staked'),
  nodes: z.number().describe('Number of active nodes'),
  dapps: z.number().describe('Number of decentralized applications'),
  crossChainTx: z.number().describe('Number of cross-chain transactions'),
  totalSupply: z.number().describe('Total supply of IOTX tokens'),
  totalNumberOfHolders: z.number().describe('Total number of IOTX holders'),
  totalNumberOfXrc20: z.number().describe('Total number of XRC20 tokens'),
  totalNumberOfXrc721: z.number().describe('Total number of XRC721 tokens'),
  stakingRatio: z.number().describe('Ratio of staked IOTX to total supply'),
  tps: z.number().describe('Transactions per second'),
});

const _ChainStatsSchema = z.object({
  Chain: z.object({
    totalSupply: z.string().describe('Total supply in smallest unit (18 decimals)'),
  }),
  TotalNumberOfHolders: z.object({
    totalNumberOfHolders: z.number().describe('Total number of unique addresses holding IOTX'),
  }),
  XRC20Addresses: z.object({
    count: z.number().describe('Total count of XRC20 token contracts'),
  }),
  XRC721Addresses: z.object({
    count: z.number().describe('Total count of XRC721 token contracts'),
  }),
  MostRecentTPS: z.object({
    mostRecentTPS: z.number().describe('Most recent transactions per second calculation'),
  }),
});

const _L1DailyStatsSchema = z.object({
  date: z.string().describe('Date for which stats are fetched (YYYY-MM-DD)'),
  transactions: z.number().describe('Number of transactions for the day'),
  tx_volume: z.number().describe('Total transaction volume for the day'),
  sum_gas: z.number().describe('Total gas fees spent for the day'),
  avg_gas: z.number().describe('Average gas fee per transaction'),
  active_wallets: z.number().describe('Number of active wallets for the day'),
  peak_tps: z.number().describe('Peak transactions per second for the day'),
  tvl: z.number().describe('Total Value Locked for the day'),
  holders: z.number().describe('Number of IOTX holders for the day'),
  avg_staking_duration: z.number().describe('Average staking duration in days'),
});

// Export for testing
export const GetL1StatsToolSchema = {
  name: 'get_l1_stats',
  description:
    'Fetches IoTeX L1 chain statistics and metrics: TVL, contracts, staking, nodes, dapps, tps, transactions, supply, holders, xrc20, xrc721',
  parameters: z.object({}),
  execute: async () => {
    try {
      const tool = new L1DataTool();
      const stats = await tool.getRawData();
      return {
        ...stats,
        totalStaked: Number(stats.totalStaked.toFixed(2)),
        stakingRatio: Number((stats.stakingRatio * 100).toFixed(2)), // Convert to percentage
        tps: Number(stats.tps.toFixed(4)),
      };
    } catch (error) {
      logger.error('Error executing get_l1_stats tool', error);
      return `Error executing get_l1_stats tool`;
    }
  },
};

// Update the GetL1DailyStatsToolSchema with date validation
export const GetL1DailyStatsToolSchema = {
  name: 'get_l1_daily_stats',
  description:
    'Fetches IoTeX L1 chain historical daily statistics (before current date) including transactions, volume, gas fees, active wallets, TPS, and TVL',
  parameters: z.object({
    date: z
      .string()
      .describe('Date must be in YYYY-MM-DD format. Can only fetch historical data (yesterday or earlier)'),
  }),
  execute: async (args: { date: string }) => {
    try {
      const tool = new L1DataTool();
      const stats = await tool.getDailyData(args.date);
      return {
        ...stats,
        tx_volume: Number(stats.tx_volume.toFixed(2)),
        sum_gas: Number(stats.sum_gas.toFixed(2)),
        avg_gas: Number(stats.avg_gas.toFixed(4)),
        peak_tps: Number(stats.peak_tps.toFixed(4)),
        currency: {
          tx_volume: 'USD',
          sum_gas: 'IOTX',
          avg_gas: 'IOTX',
          tvl: 'USD',
        },
      };
    } catch (error) {
      logger.error('Error executing get_l1_daily_stats tool', error);
      return `Error executing get_l1_daily_stats tool`;
    }
  },
};

// Types
type L1Stats = z.infer<typeof _L1StatsSchema>;
type ChainStats = z.infer<typeof _ChainStatsSchema>;
type L1DailyStats = z.infer<typeof _L1DailyStatsSchema>;

interface GraphQLResponse {
  data: ChainStats;
}

// Add a helper type for fetch results
type FetchResult<T> = {
  value: T | null;
  error?: string;
};

export class L1DataTool extends APITool<void> {
  schema = [
    { name: GetL1StatsToolSchema.name, tool: tool(GetL1StatsToolSchema) },
    {
      name: GetL1DailyStatsToolSchema.name,
      tool: tool(GetL1DailyStatsToolSchema),
    },
  ];

  constructor() {
    super({
      name: GetL1StatsToolSchema.name,
      description: GetL1StatsToolSchema.description,
      baseUrl: ANALYTICS_API,
    });
  }

  async getRawData(): Promise<L1Stats> {
    const [tvl, contracts, totalStaked, nodes, dapps, crossChainTx, v2ChainStats] = await Promise.all([
      this.fetchTvl(),
      this.fetchContractsNumber(),
      this.fetchTotalStaked(),
      this.fetchNodesCount(),
      this.fetchDappsCount(),
      this.fetchCrossChainTx(),
      this.fetchAnalyticsV2Stats(),
    ]);

    const [totalSupply, totalNumberOfHolders, totalNumberOfXrc20, totalNumberOfXrc721, tps] =
      this.processV2Stats(v2ChainStats);

    const stakingRatio = this.calcStakingRatio(totalStaked, totalSupply);

    const stats: L1Stats = {
      tvl,
      contracts,
      totalStaked,
      nodes,
      dapps,
      crossChainTx,
      totalSupply,
      totalNumberOfHolders,
      totalNumberOfXrc20,
      totalNumberOfXrc721,
      stakingRatio,
      tps,
    };

    return stats;
  }

  private async fetchTvl(): Promise<number> {
    const res = await this.sendRestRequest('tvl');
    const tvl = await res.text();
    logger.info('tvl', tvl);
    // Remove quotes and parse as float since TVL can have decimals
    const cleanValue = tvl.replace(/"/g, '');
    return parseFloat(cleanValue);
  }

  private async fetchContractsNumber(): Promise<number> {
    const res = await this.sendRestRequest('contractCount');
    const contracts = await res.text();
    logger.info('contractCount', contracts);
    // Remove quotes and parse as integer
    const cleanValue = contracts.replace(/"/g, '');
    return parseInt(cleanValue);
  }

  private async fetchTotalStaked(): Promise<number> {
    const res = await this.sendRestRequest('totalStakedIotx');
    const totalStaked = await res.text();
    logger.info('totalStakedIotx', totalStaked);
    // @ts-ignore string has replaceAll method
    const withoutQuotes = totalStaked.replaceAll('"', '');
    const value = formatEther(withoutQuotes);
    return Number(value);
  }

  private async fetchNodesCount(): Promise<number> {
    const res = await this.sendRestRequest('nodesCount');
    const nodes = await res.text();
    logger.info('nodesCount', nodes);
    // Remove quotes and parse as integer
    const cleanValue = nodes.replace(/"/g, '');
    return parseInt(cleanValue);
  }

  private async fetchDappsCount(): Promise<number> {
    const res = await this.sendRestRequest('dappsCount');
    const dapps = await res.text();
    logger.info('dappsCount', dapps);
    // Remove quotes and parse as integer
    const cleanValue = dapps.replace(/"/g, '');
    return parseInt(cleanValue);
  }

  private async fetchCrossChainTx(): Promise<number> {
    const res = await this.sendRestRequest('totalCrossChainTxCount');
    const crossChainTx = await res.text();
    logger.info('totalCrossChainTxCount', crossChainTx);
    // This one might not have quotes based on the logs, but adding the cleanup for consistency
    const cleanValue = crossChainTx.replace(/"/g, '');
    return parseInt(cleanValue);
  }

  private async fetchAnalyticsV2Stats(): Promise<ChainStats> {
    const query = `
      query {
        Chain {
          totalSupply
        }
        TotalNumberOfHolders {
          totalNumberOfHolders
        }
        XRC721Addresses {
          count
        }
        XRC20Addresses {
          count
        }
        MostRecentTPS(blockWindow: 17000) {
          mostRecentTPS
        }
      }
    `;

    try {
      const response = await fetch(GQL_ANALYTICS, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.API_V2_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const { data } = (await response.json()) as GraphQLResponse;
      logger.info('analyticsV2Stats', data);
      return data;
    } catch (error: any) {
      throw new Error(`Failed to fetch analytics v2 stats: ${error.message}`);
    }
  }

  private async sendRestRequest(path: string): Promise<Response> {
    try {
      const res = await fetch(`${ANALYTICS_API}/${path}`);
      if (!res.ok) {
        throw new Error(`Response status: ${res.status}`);
      }
      return res;
    } catch (error: any) {
      throw new Error(`Failed to fetch ${path}: ${error.message}`);
    }
  }

  private processV2Stats(stats: ChainStats): [number, number, number, number, number] {
    const totalSupply = Number(BigInt(stats.Chain.totalSupply) / BigInt('1000000000000000000'));
    const totalNumberOfHolders = stats.TotalNumberOfHolders.totalNumberOfHolders;
    const totalNumberOfXrc20 = stats.XRC20Addresses.count;
    const totalNumberOfXrc721 = stats.XRC721Addresses.count;
    // Ensure TPS is not negative and has reasonable precision
    const tps = Math.max(0, Math.floor(stats.MostRecentTPS.mostRecentTPS * 10000) / 10000);

    return [totalSupply, totalNumberOfHolders, totalNumberOfXrc20, totalNumberOfXrc721, tps];
  }

  private calcStakingRatio(totalStaked: number, totalSupply: number): number {
    return totalStaked / totalSupply;
  }

  async getDailyData(date: string): Promise<L1DailyStats> {
    // Validate date is not current or future
    const inputDate = new Date(date);
    const yesterday = new Date(getYesterday());

    if (inputDate > yesterday) {
      throw new Error('Can only fetch historical data (yesterday or earlier)');
    }

    const results = await this.runFetchers(date);

    // Log any errors that occurred
    this.logErrors(results);

    const result: L1DailyStats = this.buildResults(date, results);

    return result;
  }

  private buildResults(
    date: string,
    results: FetchResult<number>[]
  ): {
    date: string;
    transactions: number;
    tx_volume: number;
    sum_gas: number;
    avg_gas: number;
    active_wallets: number;
    peak_tps: number;
    tvl: number;
    holders: number;
    avg_staking_duration: number;
  } {
    return {
      date,
      transactions: this.resultOrZeroIfNan(results),
      tx_volume: this.resultOrZeroIfNan(results),
      sum_gas: this.resultOrZeroIfNan(results),
      avg_gas: this.resultOrZeroIfNan(results),
      active_wallets: this.resultOrZeroIfNan(results),
      peak_tps: this.resultOrZeroIfNan(results),
      tvl: this.resultOrZeroIfNan(results),
      holders: this.resultOrZeroIfNan(results),
      avg_staking_duration: this.resultOrZeroIfNan(results),
    };
  }

  private resultOrZeroIfNan(results: FetchResult<number>[]): number {
    return Number(results[0].value ?? 0);
  }

  private logErrors(results: FetchResult<number>[]): void {
    results.forEach((result, index) => {
      if (result.error) {
        const metrics = [
          'transactions',
          'tx_volume',
          'sum_gas',
          'avg_gas',
          'active_wallets',
          'peak_tps',
          'tvl',
          'holders',
          'avg_staking_duration',
        ];
        logger.error(`Error fetching ${metrics[index]}: ${result.error}`);
      }
    });
  }

  private async runFetchers(date: string): Promise<FetchResult<number>[]> {
    return await Promise.all([
      this.safeFetch(() => this.fetchDailyTransactionCount(date)),
      this.safeFetch(() => this.fetchDailyTxVolume(date)),
      this.safeFetch(() => this.fetchDailySumGas(date)),
      this.safeFetch(() => this.fetchDailyAvgGas(date)),
      this.safeFetch(() => this.fetchDailyActiveWallets(date)),
      this.safeFetch(() => this.fetchDailyPeakTps(date)),
      this.safeFetch(() => this.fetchDailyTvl(date)),
      this.safeFetch(() => this.fetchDailyHolders(date)),
      this.safeFetch(() => this.fetchDailyStakingDuration(date)),
    ]);
  }

  // Add helper method for safe fetching
  private async safeFetch<T>(fetchFn: () => Promise<T>): Promise<FetchResult<T>> {
    try {
      const value = await fetchFn();
      return { value };
    } catch (error: any) {
      return {
        value: null,
        error: error.message,
      };
    }
  }

  private async fetchDailyTransactionCount(date: string): Promise<number> {
    const res = await this.sendDailyRequest('dailyTxCount', date);
    const data = await res.json();
    logger.info('dailyTxCount', data);
    return data[0].tx_count;
  }

  private async fetchDailyTxVolume(date: string): Promise<number> {
    try {
      const res = await this.sendDailyRequest('avgDailyTxVolume', date);
      const volume = await res.text();
      logger.info('avgDailyTxVolume', volume);
      return parseFloat(volume.replace(/"/g, ''));
    } catch (error: any) {
      throw new Error(`Failed to fetch daily transaction volume: ${error.message}`);
    }
  }

  private async fetchDailySumGas(date: string): Promise<number> {
    try {
      const res = await this.sendDailyRequest('sumGasFeeIotx', date);
      const sum = await res.text();
      logger.info('sumGasFeeIotx', sum);
      return parseFloat(sum.replace(/"/g, ''));
    } catch (error: any) {
      throw new Error(`Failed to fetch daily sum gas: ${error.message}`);
    }
  }

  private async fetchDailyAvgGas(date: string): Promise<number> {
    try {
      const res = await this.sendDailyRequest('avgGasFeeIotx', date);
      const avg = await res.text();
      logger.info('avgGasFeeIotx', avg);
      return parseFloat(avg.replace(/"/g, ''));
    } catch (error: any) {
      throw new Error(`Failed to fetch daily average gas: ${error.message}`);
    }
  }

  private async fetchDailyActiveWallets(date: string): Promise<number> {
    try {
      const res = await this.sendDailyRequest('activeWalletCount', date);
      const data = await res.json();
      logger.info('activeWalletCount', data);
      return data[0].total;
    } catch (error: any) {
      throw new Error(`Failed to fetch daily active wallets: ${error.message}`);
    }
  }

  private async fetchDailyPeakTps(date: string): Promise<number> {
    try {
      const res = await this.sendDailyRequest('dailyPeakTps', date);
      const data = await res.json();
      logger.info('dailyPeakTps', data);
      const tps = data[0].max_tps.replace(/"/g, '');
      return parseFloat(tps);
    } catch (error: any) {
      throw new Error(`Failed to fetch daily peak TPS: ${error.message}`);
    }
  }

  private async fetchDailyTvl(date: string): Promise<number> {
    try {
      const res = await this.sendDailyRequest('dailyTvl', date);
      const data = await res.json();
      logger.info('dailyTvl', data);
      const tvl = data[0]?.tvl || '0.0';
      return parseFloat(tvl.replace(/"/g, ''));
    } catch (error: any) {
      throw new Error(`Failed to fetch daily TVL: ${error.message}`);
    }
  }

  private async fetchDailyHolders(date: string): Promise<number> {
    try {
      const res = await this.sendDailyRequest('dailyIoTexHolder', date);
      const data = await res.json();
      logger.info('dailyIoTexHolder', data);
      if (!data.length) {
        throw new Error('No holders data returned');
      }
      return data[0].holders;
    } catch (error: any) {
      throw new Error(`Failed to fetch daily holders: ${error.message}`);
    }
  }

  private async fetchDailyStakingDuration(date: string): Promise<number> {
    try {
      const res = await this.sendDailyRequest('avgStakingDurationHistory', date);
      const data = await res.json();
      logger.info('avgStakingDurationHistory', data);
      if (!data.length) {
        return 0;
      }
      return data[0].avg_staking_duration;
    } catch (error: any) {
      throw new Error(`Failed to fetch daily staking duration: ${error.message}`);
    }
  }

  private async sendDailyRequest(path: string, date: string): Promise<Response> {
    try {
      const url = `${ANALYTICS_API}/${path}?start_date=${date}&end_date=${date}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Response status: ${res.status}`);
      }
      return res;
    } catch (error: any) {
      throw new Error(`Failed to fetch ${path}: ${error.message}`);
    }
  }
}

function getYesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}
