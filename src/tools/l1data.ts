import { z } from "zod";
import { tool } from "ai";
import { formatEther } from "ethers";

import { APITool } from "./tool";
import { logger } from "../logger/winston";

const ANALYTICS_API = "https://gateway1.iotex.me/analyzer";
const GQL_ANALYTICS = "https://analyser-api.iotex.io/graphql";

// Zod Schemas
const L1StatsSchema = z.object({
  tvl: z.number().describe("Total Value Locked in the chain"),
  contracts: z.number().describe("Number of deployed contracts"),
  totalStaked: z.number().describe("Total amount of IOTX staked"),
  nodes: z.number().describe("Number of active nodes"),
  dapps: z.number().describe("Number of decentralized applications"),
  crossChainTx: z.number().describe("Number of cross-chain transactions"),
  totalSupply: z.number().describe("Total supply of IOTX tokens"),
  totalNumberOfHolders: z.number().describe("Total number of IOTX holders"),
  totalNumberOfXrc20: z.number().describe("Total number of XRC20 tokens"),
  totalNumberOfXrc721: z.number().describe("Total number of XRC721 tokens"),
  stakingRatio: z.number().describe("Ratio of staked IOTX to total supply"),
  tps: z.number().describe("Transactions per second"),
});

const ChainStatsSchema = z.object({
  Chain: z.object({
    totalSupply: z
      .string()
      .describe("Total supply in smallest unit (18 decimals)"),
  }),
  TotalNumberOfHolders: z.object({
    totalNumberOfHolders: z
      .number()
      .describe("Total number of unique addresses holding IOTX"),
  }),
  XRC20Addresses: z.object({
    count: z.number().describe("Total count of XRC20 token contracts"),
  }),
  XRC721Addresses: z.object({
    count: z.number().describe("Total count of XRC721 token contracts"),
  }),
  MostRecentTPS: z.object({
    mostRecentTPS: z
      .number()
      .describe("Most recent transactions per second calculation"),
  }),
});

// Export for testing
export const GetL1StatsToolSchema = {
  name: "get_l1_stats",
  description:
    "Fetches IoTeX L1 chain statistics and metrics: TVL, contracts, staking, nodes, dapps, tps, transactions, supply, holders, xrc20, xrc721",
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
      logger.error("Error executing get_l1_stats tool", error);
      return `Error executing get_l1_stats tool`;
    }
  },
};

// Types
type L1Stats = z.infer<typeof L1StatsSchema>;
type ChainStats = z.infer<typeof ChainStatsSchema>;

interface GraphQLResponse {
  data: ChainStats;
}

export class L1DataTool extends APITool<void> {
  schema = [
    { name: GetL1StatsToolSchema.name, tool: tool(GetL1StatsToolSchema) },
  ];

  constructor() {
    super({
      name: GetL1StatsToolSchema.name,
      description: GetL1StatsToolSchema.description,
      baseUrl: ANALYTICS_API,
    });
  }

  async getRawData(): Promise<L1Stats> {
    const [
      tvl,
      contracts,
      totalStaked,
      nodes,
      dapps,
      crossChainTx,
      v2ChainStats,
    ] = await Promise.all([
      this.fetchTvl(),
      this.fetchContractsNumber(),
      this.fetchTotalStaked(),
      this.fetchNodesCount(),
      this.fetchDappsCount(),
      this.fetchCrossChainTx(),
      this.fetchAnalyticsV2Stats(),
    ]);

    const [
      totalSupply,
      totalNumberOfHolders,
      totalNumberOfXrc20,
      totalNumberOfXrc721,
      tps,
    ] = this.processV2Stats(v2ChainStats);

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
    const res = await this.sendRestRequest("tvl");
    const tvl = await res.text();
    logger.info("tvl", tvl);
    // Remove quotes and parse as float since TVL can have decimals
    const cleanValue = tvl.replace(/"/g, "");
    return parseFloat(cleanValue);
  }

  private async fetchContractsNumber(): Promise<number> {
    const res = await this.sendRestRequest("contractCount");
    const contracts = await res.text();
    logger.info("contractCount", contracts);
    // Remove quotes and parse as integer
    const cleanValue = contracts.replace(/"/g, "");
    return parseInt(cleanValue);
  }

  private async fetchTotalStaked(): Promise<number> {
    const res = await this.sendRestRequest("totalStakedIotx");
    const totalStaked = await res.text();
    logger.info("totalStakedIotx", totalStaked);
    // @ts-ignore string has replaceAll method
    const withoutQuotes = totalStaked.replaceAll('"', "");
    const value = formatEther(withoutQuotes);
    return Number(value);
  }

  private async fetchNodesCount(): Promise<number> {
    const res = await this.sendRestRequest("nodesCount");
    const nodes = await res.text();
    logger.info("nodesCount", nodes);
    // Remove quotes and parse as integer
    const cleanValue = nodes.replace(/"/g, "");
    return parseInt(cleanValue);
  }

  private async fetchDappsCount(): Promise<number> {
    const res = await this.sendRestRequest("dappsCount");
    const dapps = await res.text();
    logger.info("dappsCount", dapps);
    // Remove quotes and parse as integer
    const cleanValue = dapps.replace(/"/g, "");
    return parseInt(cleanValue);
  }

  private async fetchCrossChainTx(): Promise<number> {
    const res = await this.sendRestRequest("totalCrossChainTxCount");
    const crossChainTx = await res.text();
    logger.info("totalCrossChainTxCount", crossChainTx);
    // This one might not have quotes based on the logs, but adding the cleanup for consistency
    const cleanValue = crossChainTx.replace(/"/g, "");
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
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.API_V2_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      const { data } = (await response.json()) as GraphQLResponse;
      logger.info("analyticsV2Stats", data);
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

  private processV2Stats(
    stats: ChainStats
  ): [number, number, number, number, number] {
    const totalSupply = Number(
      BigInt(stats.Chain.totalSupply) / BigInt("1000000000000000000")
    );
    const totalNumberOfHolders =
      stats.TotalNumberOfHolders.totalNumberOfHolders;
    const totalNumberOfXrc20 = stats.XRC20Addresses.count;
    const totalNumberOfXrc721 = stats.XRC721Addresses.count;
    // Ensure TPS is not negative and has reasonable precision
    const tps = Math.max(
      0,
      Math.floor(stats.MostRecentTPS.mostRecentTPS * 10000) / 10000
    );

    return [
      totalSupply,
      totalNumberOfHolders,
      totalNumberOfXrc20,
      totalNumberOfXrc721,
      tps,
    ];
  }

  private calcStakingRatio(totalStaked: number, totalSupply: number): number {
    return totalStaked / totalSupply;
  }
}
