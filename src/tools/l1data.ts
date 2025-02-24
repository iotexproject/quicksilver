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

const GetL1StatsToolSchema = {
  name: "get_l1_stats",
  description: "Fetches IoTeX L1 chain statistics and metrics",
  parameters: z.object({}),
  execute: async () => {
    const tool = new L1DataTool();
    const stats = await tool.getRawData();
    return {
      ...stats,
      totalStaked: Number(stats.totalStaked.toFixed(2)),
      stakingRatio: Number((stats.stakingRatio * 100).toFixed(2)), // Convert to percentage
      tps: Number(stats.tps.toFixed(4)),
    };
  },
};

// Types
type L1Stats = z.infer<typeof L1StatsSchema>;
type ChainStats = z.infer<typeof ChainStatsSchema>;

interface GraphQLResponse {
  data: ChainStats;
}

export class L1DataTool extends APITool<void> {
  schema = [{ name: "get_l1_stats", tool: tool(GetL1StatsToolSchema) }];

  constructor() {
    super({
      name: "L1Data",
      description: "Fetches IoTeX L1 chain statistics and metrics",
      output:
        "Chain statistics including TVL, contracts, staking, nodes, dapps, tps, transactions, supply, holders, xrc20, xrc721",
      baseUrl: ANALYTICS_API,
    });
  }

  async execute(): Promise<string> {
    try {
      const stats = await this.getRawData();
      // Validate the stats against the schema
      const validatedStats = L1StatsSchema.parse(stats);
      return JSON.stringify(validatedStats, null, 2);
    } catch (error) {
      logger.error("L1Data Error:", error);
      return `Error fetching L1 data: ${error}`;
    }
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
    return parseInt(tvl);
  }

  private async fetchContractsNumber(): Promise<number> {
    const res = await this.sendRestRequest("contractCount");
    const contracts = await res.text();
    logger.info("contractCount", contracts);
    return parseInt(contracts);
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
    return parseInt(nodes);
  }

  private async fetchDappsCount(): Promise<number> {
    const res = await this.sendRestRequest("dappsCount");
    const dapps = await res.text();
    logger.info("dappsCount", dapps);
    return parseInt(dapps);
  }

  private async fetchCrossChainTx(): Promise<number> {
    const res = await this.sendRestRequest("totalCrossChainTxCount");
    const crossChainTx = await res.text();
    logger.info("totalCrossChainTxCount", crossChainTx);
    return parseInt(crossChainTx);
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

    const response = await fetch(GQL_ANALYTICS, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.API_V2_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const { data } = (await response.json()) as GraphQLResponse;
    // Validate the GraphQL response data
    const validatedData = ChainStatsSchema.parse(data);
    return validatedData;
  }

  private async sendRestRequest(path: string): Promise<Response> {
    return fetch(`${ANALYTICS_API}/${path}`);
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
    const tps = Math.floor(stats.MostRecentTPS.mostRecentTPS * 10000) / 10000;

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

  async parseInput(_: any): Promise<void> {
    return;
  }
}
